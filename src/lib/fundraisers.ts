import { randomBytes } from "node:crypto";
import type { FundraiserStatus, FundraiserType, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { env } from "@/env";
import { writeAudit } from "./audit";
import { notify, notifyRoles } from "./notify";
import { sendTemplated } from "./email-templated";
import { issueManageLink } from "./supporter-auth";
import {
  slugify,
  fundraiserProgress,
  formatUsd,
  verifiedTotal,
  verifiedThisMonth,
  supporterCount,
  targetDatePassed,
  buildActivity,
} from "./fundraising";
import {
  transition,
  decideEdit,
  validateGoal,
  newlyCrossedMilestones,
  nextMilestone,
  GOAL_MIN,
  GOAL_MAX,
  type FundraiserAction,
  type TransitionActor,
  type EditablePatch,
} from "./fundraiser-workflow";
import {
  type Actor,
  ForbiddenError,
  ministryScope,
  canEditFundraiser,
  canViewFundraiser,
  canReviewFundraiser,
  canConfirmAttribution,
  type FundraiserRef,
} from "./rbac";

/**
 * Fundraiser service (spec §4, §6–§8, §14, §16). This is the ONLY place a fundraiser's status
 * or content changes. It re-applies every rule from the pure module in fundraiser-workflow.ts,
 * writes the audit entry, and fans the resulting event out through the existing notification
 * pipeline (Notification for members, transactional email for Supporters) — no second workflow
 * engine, no second notification system.
 *
 * Money never moves here. Giving is an external AdventistGiving redirect; the only thing this
 * module records is attribution, and only a treasurer confirmation makes a gift verified.
 */

export class FundraiserError extends Error {
  constructor(msg: string) { super(msg); this.name = "FundraiserError"; }
}

const NOTIFY_CATEGORY = "fundraiser";

/* ------------------------------------------------------------------ helpers */

/** The Building Project campaign: the active campaign tied to the active construction project. */
export async function buildingCampaign() {
  const project = await prisma.constructionProject.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!project) return null;
  return prisma.fundraisingCampaign.findFirst({
    where: { status: "ACTIVE", constructionProjectId: project.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, slug: true, goal: true, allowMemberFundraisers: true },
  });
}

export function publicUrl(slug: string): string {
  return `${env.NEXT_PUBLIC_SITE_URL}/f/${slug}`;
}

/** The giving handoff for a fundraiser: our route, which records attribution then redirects. */
export function givingUrl(slug: string): string {
  return `${env.NEXT_PUBLIC_SITE_URL}/f/${slug}/give`;
}

export function startUrl(referralToken: string): string {
  return `${env.NEXT_PUBLIC_SITE_URL}/fundraising/start?ref=${encodeURIComponent(referralToken)}`;
}

function newReferralToken(): string {
  return randomBytes(16).toString("hex");
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base);
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? root : `${root}-${i}`;
    if (!(await prisma.fundraiser.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${root}-${randomBytes(4).toString("hex")}`;
}

/** Verified dollars raised for a fundraiser — always straight from the confirmed ledger. */
export async function verifiedRaised(fundraiserId: string, db: Prisma.TransactionClient | typeof prisma = prisma): Promise<number> {
  const agg = await db.donation.aggregate({
    where: { fundraiserId, status: "CONFIRMED" },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/** The states in which a Supporter-owned fundraiser is the owner's to change (§7). */
const SUPPORTER_EDITABLE: FundraiserStatus[] = ["DRAFT", "CHANGES_REQUESTED"];

/* --------------------------------------------------------------- view models */

export type FundraiserSummary = {
  id: string;
  slug: string;
  title: string;
  displayName: string;
  story: string | null;
  graphicUrl: string | null;
  type: FundraiserType;
  status: FundraiserStatus;
  reviewNote: string | null;
  targetDate: Date | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  progress: ReturnType<typeof fundraiserProgress>;
  /** Verified dollars confirmed this calendar month. */
  thisMonth: number;
  /** Null when the figure would not be reliable — omit it rather than show a placeholder. */
  supporters: number | null;
  referrals: number | null;
  nextMilestone: number | null;
  targetPassed: boolean;
  canEdit: boolean;
  /** True when this is the actor's own personal fundraiser. */
  isOwn: boolean;
  publicUrl: string;
  /** Link that starts a new fundraiser and records this one as the referrer. Not a credential. */
  startUrl: string;
  ownerLabel: string;
};

const SUMMARY_SELECT = {
  id: true, slug: true, title: true, displayName: true, story: true, graphicUrl: true,
  type: true, status: true, reviewNote: true, targetDate: true, approvedAt: true, referralToken: true,
  createdAt: true, updatedAt: true, personalGoal: true, ownerUserId: true, supporterId: true,
  householdId: true, ministryId: true, memberId: true,
  household: { select: { familyName: true } },
  ministry: { select: { name: true } },
  // email/donorName are selected ONLY so supporterCount can de-duplicate the same giver; they
  // are consumed inside toSummary and never reach FundraiserSummary or any rendered surface.
  donations: { where: { status: "CONFIRMED" as const }, select: { amount: true, status: true, confirmedAt: true, email: true, donorName: true } },
  _count: { select: { referrals: true } },
} satisfies Prisma.FundraiserSelect;

type SummaryRow = Prisma.FundraiserGetPayload<{ select: typeof SUMMARY_SELECT }>;

function toSummary(row: SummaryRow, opts: { canEdit: boolean; isOwn: boolean; now?: Date }): FundraiserSummary {
  const now = opts.now ?? new Date();
  const raised = verifiedTotal(row.donations);
  const progress = fundraiserProgress(raised, row.personalGoal);
  return {
    id: row.id, slug: row.slug, title: row.title, displayName: row.displayName,
    story: row.story, graphicUrl: row.graphicUrl, type: row.type, status: row.status,
    reviewNote: row.reviewNote, targetDate: row.targetDate, approvedAt: row.approvedAt,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
    progress,
    thisMonth: verifiedThisMonth(row.donations, now),
    supporters: supporterCount(row.donations),
    referrals: row._count.referrals > 0 ? row._count.referrals : null,
    nextMilestone: nextMilestone(progress.pct),
    targetPassed: targetDatePassed(row.targetDate, now),
    canEdit: opts.canEdit,
    isOwn: opts.isOwn,
    publicUrl: publicUrl(row.slug),
    startUrl: startUrl(row.referralToken),
    ownerLabel:
      row.type === "FAMILY"
        ? row.household?.familyName ?? row.displayName
        : row.type === "MINISTRY"
          ? row.ministry?.name ?? row.displayName
          : row.displayName,
  };
}

/**
 * Every fundraiser this actor may see in the portal: their own, their household's, and any
 * their ministry leadership covers. Edit rights are resolved per fundraiser through rbac.ts —
 * a household member without the fundraising permission gets view/share only (§10).
 */
export async function loadFundraisersForActor(actor: Actor): Promise<FundraiserSummary[]> {
  const scope = ministryScope(actor);
  const member = actor.memberId
    ? await prisma.member.findUnique({
        where: { id: actor.memberId },
        select: { id: true, canManageHouseholdFundraising: true },
      })
    : null;
  const household = actor.householdId
    ? await prisma.household.findUnique({ where: { id: actor.householdId }, select: { id: true, primaryContactId: true } })
    : null;

  const rows = await prisma.fundraiser.findMany({
    where: {
      status: { not: "ARCHIVED" },
      OR: [
        { ownerUserId: actor.userId },
        ...(actor.householdId ? [{ householdId: actor.householdId }] : []),
        ...(scope.length ? [{ ministryId: { in: scope } }] : []),
      ],
    },
    orderBy: { createdAt: "asc" },
    select: SUMMARY_SELECT,
  });

  return rows.map((row) => {
    const ref: FundraiserRef = {
      type: row.type, ownerUserId: row.ownerUserId, supporterId: row.supporterId,
      householdId: row.householdId, ministryId: row.ministryId,
    };
    return toSummary(row, {
      canEdit: canEditFundraiser(actor, ref, { household, member }),
      isOwn: row.type === "PERSONAL" && row.ownerUserId === actor.userId,
    });
  });
}

/** A single fundraiser as a summary, or null when the actor may not see it. */
export async function loadFundraiserForActor(actor: Actor, id: string): Promise<FundraiserSummary | null> {
  const row = await prisma.fundraiser.findUnique({ where: { id }, select: SUMMARY_SELECT });
  if (!row) return null;
  const ref: FundraiserRef = {
    type: row.type, ownerUserId: row.ownerUserId, supporterId: row.supporterId,
    householdId: row.householdId, ministryId: row.ministryId,
  };
  const [member, household] = await Promise.all([
    actor.memberId ? prisma.member.findUnique({ where: { id: actor.memberId }, select: { id: true, canManageHouseholdFundraising: true } }) : null,
    // The FUNDRAISER's household, not the actor's — rbac.ts refuses a cross-household ref
    // regardless, but passing the right row keeps this call site honest on its own terms.
    row.householdId ? prisma.household.findUnique({ where: { id: row.householdId }, select: { id: true, primaryContactId: true } }) : null,
  ]);
  const canEdit = canEditFundraiser(actor, ref, { household, member });
  if (!canEdit && !canViewFundraiser(actor, ref, { household, member })) return null;
  return toSummary(row, { canEdit, isOwn: row.type === "PERSONAL" && row.ownerUserId === actor.userId });
}

/**
 * A Supporter's own fundraiser. Ownership is proven inside the query rather than trusted from
 * the caller, so this cannot be turned into an "any fundraiser by id" loader by a future caller
 * that forgets the check. `canEdit` reflects the real §7 rule: only while the church is waiting
 * on the owner.
 */
export async function loadFundraiserForSupporter(
  supporterId: string,
  fundraiserId: string,
): Promise<FundraiserSummary | null> {
  const row = await prisma.fundraiser.findFirst({
    where: { id: fundraiserId, supporterId },
    select: SUMMARY_SELECT,
  });
  if (!row) return null;
  return toSummary(row, { canEdit: SUPPORTER_EDITABLE.includes(row.status), isOwn: true });
}

/** The donor-free Activity feed for a fundraiser (§2). */
export async function loadActivity(fundraiserId: string) {
  const [f, referrals] = await Promise.all([
    prisma.fundraiser.findUnique({
      where: { id: fundraiserId },
      select: {
        approvedAt: true, personalGoal: true,
        donations: { where: { status: "CONFIRMED" }, select: { amount: true, status: true, confirmedAt: true } },
      },
    }),
    prisma.fundraiser.findMany({
      where: { referredByFundraiserId: fundraiserId },
      select: { displayName: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  if (!f) return [];
  return buildActivity({ approvedAt: f.approvedAt, goal: f.personalGoal, donations: f.donations, referrals });
}

/**
 * Approved share copy and graphics offered in the Share tab (§16). An asset missing the field
 * its kind depends on is filtered out here rather than at each call site, so an owner is never
 * offered an empty message or a graphic that would render as a broken image box.
 */
export async function loadShareLibrary() {
  const assets = await prisma.fundraisingAsset.findMany({
    where: { active: true },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return {
    messages: assets.filter((a) => a.kind === "MESSAGE" && !!a.body?.trim()),
    graphics: assets
      .filter((a) => a.kind === "GRAPHIC" && !!a.imageUrl?.trim())
      .map((a) => ({ ...a, imageUrl: a.imageUrl as string })),
  };
}

/* ------------------------------------------------------------------- create */

export type CreateInput = {
  campaignId: string;
  type: FundraiserType;
  title: string;
  displayName: string;
  story?: string | null;
  graphicUrl?: string | null;
  personalGoal: number;
  targetDate?: Date | null;
  /** Owning identity — exactly one of these paths is used, chosen by `type`. */
  ownerUserId?: string | null;
  memberId?: string | null;
  supporterId?: string | null;
  householdId?: string | null;
  ministryId?: string | null;
  referralToken?: string | null;
  /** Submit immediately for review instead of leaving a draft. */
  submit?: boolean;
};

/**
 * Create a fundraiser. Authorization (who may create which type) is decided by the caller
 * through rbac.ts before this runs; this enforces the data rules: valid goal, a referring
 * fundraiser resolved from its token, a unique slug, and never a status past PENDING_REVIEW.
 */
export async function createFundraiser(input: CreateInput, actorId: string | null) {
  const goalCheck = validateGoal(input.personalGoal, { verifiedRaised: 0, minGoal: GOAL_MIN, maxGoal: GOAL_MAX });
  if (!goalCheck.ok) throw new FundraiserError(goalCheck.reason);
  if (!input.title.trim()) throw new FundraiserError("Give your fundraiser a title.");
  if (!input.displayName.trim()) throw new FundraiserError("Tell supporters whose fundraiser this is.");
  if (!input.targetDate) throw new FundraiserError("Choose the date you're aiming to reach your goal by.");

  const referredBy = input.referralToken
    ? await prisma.fundraiser.findUnique({
        where: { referralToken: input.referralToken },
        select: { id: true, status: true },
      })
    : null;

  const slug = await uniqueSlug(`${input.displayName}-${input.title}`);
  const status: FundraiserStatus = input.submit ? "PENDING_REVIEW" : "DRAFT";

  const created = await prisma.$transaction(async (tx) => {
    const f = await tx.fundraiser.create({
      data: {
        campaignId: input.campaignId,
        type: input.type,
        status,
        submittedAt: input.submit ? new Date() : null,
        title: input.title.trim(),
        displayName: input.displayName.trim(),
        story: input.story?.trim() || null,
        graphicUrl: input.graphicUrl || null,
        personalGoal: input.personalGoal,
        targetDate: input.targetDate,
        ownerUserId: input.ownerUserId ?? null,
        memberId: input.memberId ?? null,
        supporterId: input.supporterId ?? null,
        householdId: input.householdId ?? null,
        ministryId: input.ministryId ?? null,
        // A referral only counts when it came from a fundraiser that was actually live.
        referredByFundraiserId: referredBy?.status === "ACTIVE" ? referredBy.id : null,
        referralToken: newReferralToken(),
        slug,
      },
    });
    if (actorId) {
      await writeAudit(tx, {
        actorId,
        action: "fundraiser.create",
        entity: "Fundraiser",
        entityId: f.id,
        metadata: { type: f.type, status: f.status, campaignId: f.campaignId },
      });
    }
    return f;
  });

  if (created.referredByFundraiserId) await notifyReferralStart(created.referredByFundraiserId, created.displayName);
  if (status === "PENDING_REVIEW") await notifyReviewers(created.id, created.title);
  return created;
}

/* --------------------------------------------------------------------- edit */

/**
 * Apply an edit under the §8 rules. Content edits keep an ACTIVE fundraiser live; changing the
 * title or type returns it to PENDING_REVIEW. The goal floor is validated against the ledger
 * inside the transaction, so it cannot be beaten by a concurrent reconciliation.
 */
export async function editFundraiser(actor: Actor, fundraiserId: string, patch: EditablePatch) {
  const current = await prisma.fundraiser.findUnique({
    where: { id: fundraiserId },
    select: {
      id: true, status: true, title: true, type: true, ownerUserId: true, supporterId: true,
      householdId: true, ministryId: true, memberId: true,
    },
  });
  if (!current) throw new FundraiserError("That fundraiser no longer exists.");
  await assertCanEdit(actor, current);

  const result = await prisma.$transaction(async (tx) => {
    const raised = await verifiedRaised(fundraiserId, tx);
    const decision = decideEdit(
      { status: current.status, title: current.title, type: current.type, verifiedRaised: raised, minGoal: GOAL_MIN, maxGoal: GOAL_MAX },
      patch,
    );
    if (!decision.ok) throw new FundraiserError(decision.reason);

    const updated = await tx.fundraiser.update({
      where: { id: fundraiserId },
      data: {
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.type !== undefined ? { type: patch.type } : {}),
        ...(patch.displayName !== undefined ? { displayName: patch.displayName.trim() } : {}),
        ...(patch.story !== undefined ? { story: patch.story?.trim() || null } : {}),
        ...(patch.graphicUrl !== undefined ? { graphicUrl: patch.graphicUrl || null } : {}),
        ...(patch.targetDate !== undefined ? { targetDate: patch.targetDate } : {}),
        ...(patch.personalGoal !== undefined ? { personalGoal: patch.personalGoal } : {}),
        ...(decision.requiresReapproval
          ? { status: "PENDING_REVIEW" as const, submittedAt: new Date(), reviewNote: null }
          : {}),
      },
    });
    await writeAudit(tx, {
      actorId: actor.userId,
      action: "fundraiser.edit",
      entity: "Fundraiser",
      entityId: fundraiserId,
      // Field names only — never the content itself.
      metadata: { fields: Object.keys(patch), requiresReapproval: decision.requiresReapproval },
    });
    return { updated, requiresReapproval: decision.requiresReapproval };
  });

  if (result.requiresReapproval) await notifyReviewers(fundraiserId, result.updated.title);
  return result.updated;
}

/* -------------------------------------------------------------- transitions */

/**
 * Move a fundraiser through its lifecycle. `actorKind` is derived from the real authorization
 * check, not passed in by the caller's UI, so an owner can never take an admin action.
 */
export async function transitionFundraiser(
  actor: Actor,
  fundraiserId: string,
  action: FundraiserAction,
  opts: { note?: string | null } = {},
) {
  const current = await prisma.fundraiser.findUnique({
    where: { id: fundraiserId },
    select: {
      id: true, status: true, title: true, slug: true, personalGoal: true, ownerUserId: true,
      supporterId: true, householdId: true, ministryId: true, memberId: true, type: true,
      supporter: { select: { email: true, name: true } },
    },
  });
  if (!current) throw new FundraiserError("That fundraiser no longer exists.");

  const isReviewer = canReviewFundraiser(actor);
  // Resolve edit rights through the same context loader the edit path uses. A FAMILY
  // fundraiser needs the actor's member + household rows to decide the household permission,
  // so checking without them would wrongly lock its own manager out of submit and close.
  const isOwner = await hasEditRights(actor, current);
  if (!isReviewer && !isOwner) throw new ForbiddenError();

  // Reviewer actions are attempted first for an admin, falling back to the owner rule set so an
  // admin who also owns a fundraiser can still submit or close it.
  const kinds: TransitionActor[] = isReviewer ? ["admin", "owner"] : ["owner"];
  let next: FundraiserStatus | null = null;
  let lastReason = "That action isn't available right now.";
  for (const kind of kinds) {
    const t = transition(current.status, action, kind, opts);
    if (t.ok) { next = t.status; break; }
    lastReason = t.reason;
  }
  if (!next) throw new FundraiserError(lastReason);

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    // Guarded write: the status we validated against must still be the status in the row, so
    // two administrators clicking Approve and Reject at once cannot both take effect.
    const claimed = await tx.fundraiser.updateMany({
      where: { id: fundraiserId, status: current.status },
      data: {
        status: next,
        reviewNote: action === "request_changes" || action === "reject" ? (opts.note ?? null) : null,
        ...(action === "submit" ? { submittedAt: now } : {}),
        ...(isReviewer && action !== "submit" ? { reviewedAt: now, reviewedById: actor.userId } : {}),
        ...(action === "approve" ? { approvedAt: now } : {}),
        ...(action === "close" ? { closedAt: now } : {}),
      },
    });
    if (claimed.count !== 1) throw new FundraiserError("Someone else just updated this fundraiser. Reload and try again.");
    await writeAudit(tx, {
      actorId: actor.userId,
      action: `fundraiser.${action}`,
      entity: "Fundraiser",
      entityId: fundraiserId,
      metadata: { from: current.status, to: next, hasNote: !!opts.note },
    });
    return tx.fundraiser.findUniqueOrThrow({ where: { id: fundraiserId } });
  });

  await notifyOwnerOfDecision(updated.id, action, opts.note ?? null);
  if (action === "submit") await notifyReviewers(updated.id, updated.title);
  return updated;
}

/* ------------------------------------------------------ supporter-owned edits */

/**
 * Edit and resubmit for a Supporter-owned fundraiser (§7, §15).
 *
 * A Supporter is deliberately NOT an Actor — they hold no Role and rbac.ts refuses every
 * Supporter-owned fundraiser to every Actor on purpose. So these take a verified supporterId
 * from the signed session instead, prove ownership in the query itself, and then reuse the
 * exact same pure rules the member path uses. There is no second rule set.
 *
 * Editing is limited to the states that are waiting on the owner. A live page stays read-only
 * for a Supporter, which keeps §15's minimal manage view intact while still closing §7's
 * "Changes Requested → edit + resubmit" loop.
 */
async function supporterOwned(supporterId: string, fundraiserId: string) {
  const f = await prisma.fundraiser.findFirst({
    where: { id: fundraiserId, supporterId },
    select: { id: true, status: true, title: true, type: true, supporter: { select: { deactivatedAt: true } } },
  });
  if (!f || f.supporter?.deactivatedAt) throw new FundraiserError("That fundraiser is no longer available.");
  return f;
}

export async function editSupporterFundraiser(
  supporterId: string,
  fundraiserId: string,
  patch: EditablePatch,
): Promise<void> {
  const current = await supporterOwned(supporterId, fundraiserId);
  if (!SUPPORTER_EDITABLE.includes(current.status)) {
    throw new FundraiserError("This fundraiser can't be edited right now. Reply to any email from us and the church office will help.");
  }

  await prisma.$transaction(async (tx) => {
    const raised = await verifiedRaised(fundraiserId, tx);
    const decision = decideEdit(
      { status: current.status, title: current.title, type: current.type, verifiedRaised: raised, minGoal: GOAL_MIN, maxGoal: GOAL_MAX },
      patch,
    );
    if (!decision.ok) throw new FundraiserError(decision.reason);
    await tx.fundraiser.update({
      where: { id: fundraiserId },
      data: {
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.story !== undefined ? { story: patch.story?.trim() || null } : {}),
        ...(patch.targetDate !== undefined ? { targetDate: patch.targetDate } : {}),
        ...(patch.personalGoal !== undefined ? { personalGoal: patch.personalGoal } : {}),
      },
    });
  });
  // No AuditLog entry: AuditLog.actorId is a required foreign key to User, and a Supporter is
  // deliberately not a User. Writing a synthetic id would violate the constraint and roll the
  // owner's edit back. This is a non-member editing their own unpublished page — the review
  // that follows, and every admin decision on it, are audited against a real user.
}

export async function submitSupporterFundraiser(supporterId: string, fundraiserId: string): Promise<void> {
  const current = await supporterOwned(supporterId, fundraiserId);
  const t = transition(current.status, "submit", "owner");
  if (!t.ok) throw new FundraiserError(t.reason);

  const claimed = await prisma.fundraiser.updateMany({
    where: { id: fundraiserId, status: current.status },
    data: { status: t.status, submittedAt: new Date(), reviewNote: null },
  });
  if (claimed.count !== 1) throw new FundraiserError("Someone else just updated this fundraiser. Reload and try again.");

  // See editSupporterFundraiser: no AuditLog row for a non-User actor. `submittedAt` on the
  // fundraiser records the transition, and the admin's decision on it is audited.
  await notifyReviewers(fundraiserId, current.title);
}

/* ------------------------------------------------------- candidate attribution */

/**
 * Record that a visitor left for AdventistGiving through this fundraiser's link (§4). This is
 * the candidate signal only: no donor identity, no amount, and it never touches verified
 * progress. Best-effort — a failure here must not block the redirect to giving.
 */
export async function recordGivingHandoff(fundraiserId: string): Promise<void> {
  try {
    await prisma.givingHandoff.create({ data: { fundraiserId } });
  } catch {
    // Attribution is a convenience for reconciliation, never a gate on giving.
  }
}

/**
 * Treasurer confirmation — the ONLY path that turns money into verified progress (§3, §4).
 * Confirms pending donations (optionally attributing them to a fundraiser), rolls the amount
 * into a linked construction project, and fires milestone notifications once each.
 */
export async function confirmAttribution(
  actor: Actor,
  input: { donationIds: string[]; fundraiserId?: string | null; campaignId: string },
): Promise<{ confirmed: number; total: number }> {
  if (!canConfirmAttribution(actor)) throw new ForbiddenError();
  if (!input.donationIds.length) return { confirmed: 0, total: 0 };

  const touched = await prisma.$transaction(async (tx) => {
    const campaign = await tx.fundraisingCampaign.findUniqueOrThrow({
      where: { id: input.campaignId },
      select: { constructionProjectId: true },
    });
    const dons = await tx.donation.findMany({
      where: { id: { in: input.donationIds }, campaignId: input.campaignId, status: "PENDING" },
      select: { id: true, amount: true, fundraiserId: true },
    });
    if (!dons.length) return { confirmed: 0, total: 0, fundraiserIds: [] as string[] };

    const now = new Date();
    const ids = dons.map((d) => d.id);
    await tx.donation.updateMany({
      where: { id: { in: ids }, status: "PENDING" },
      data: {
        status: "CONFIRMED",
        confirmedAt: now,
        ...(input.fundraiserId ? { fundraiserId: input.fundraiserId } : {}),
      },
    });
    const total = dons.reduce((s, d) => s + d.amount, 0);
    if (campaign.constructionProjectId) {
      await tx.constructionProject.update({
        where: { id: campaign.constructionProjectId },
        data: { currentRaised: { increment: total } },
      });
    }
    await writeAudit(tx, {
      actorId: actor.userId,
      action: "fundraiser.attribution.confirm",
      entity: "FundraisingCampaign",
      entityId: input.campaignId,
      metadata: { count: dons.length, total, fundraiserId: input.fundraiserId ?? null },
    });

    const fundraiserIds = [
      ...new Set([...(input.fundraiserId ? [input.fundraiserId] : []), ...dons.map((d) => d.fundraiserId).filter(Boolean) as string[]]),
    ];
    return { confirmed: dons.length, total, fundraiserIds };
  });

  for (const id of touched.fundraiserIds) await notifyMilestones(id);
  return { confirmed: touched.confirmed, total: touched.total };
}

/**
 * Import gifts from the AdventistGiving export as VERIFIED, optionally attributed to a
 * fundraiser (§4, §16). This and `confirmAttribution` are the only two ways a dollar becomes
 * verified, and both require a treasurer/admin actor.
 */
export async function importVerifiedGifts(
  actor: Actor,
  input: { campaignId: string; gifts: { donorName: string; email: string | null; amount: number; fundraiserId?: string | null }[] },
): Promise<{ imported: number; total: number }> {
  if (!canConfirmAttribution(actor)) throw new ForbiddenError();
  const gifts = input.gifts.filter((g) => g.amount > 0);
  if (!gifts.length) return { imported: 0, total: 0 };

  const touched = await prisma.$transaction(async (tx) => {
    const campaign = await tx.fundraisingCampaign.findUniqueOrThrow({
      where: { id: input.campaignId },
      select: { constructionProjectId: true },
    });
    // Only attribute to a fundraiser that actually belongs to this campaign.
    const requested = [...new Set(gifts.map((g) => g.fundraiserId).filter(Boolean) as string[])];
    const valid = requested.length
      ? new Set(
          (await tx.fundraiser.findMany({
            where: { id: { in: requested }, campaignId: input.campaignId },
            select: { id: true },
          })).map((f) => f.id),
        )
      : new Set<string>();

    const now = new Date();
    let total = 0;
    for (const g of gifts) {
      const fundraiserId = g.fundraiserId && valid.has(g.fundraiserId) ? g.fundraiserId : null;
      await tx.donation.create({
        data: {
          campaignId: input.campaignId,
          fundraiserId,
          donorName: g.donorName || "AdventistGiving donor",
          email: g.email ?? undefined,
          amount: g.amount,
          kind: "GIVEN",
          status: "CONFIRMED",
          confirmedAt: now,
        },
      });
      total += g.amount;
    }
    if (campaign.constructionProjectId) {
      await tx.constructionProject.update({
        where: { id: campaign.constructionProjectId },
        data: { currentRaised: { increment: total } },
      });
    }
    await writeAudit(tx, {
      actorId: actor.userId,
      action: "fundraiser.attribution.import",
      entity: "FundraisingCampaign",
      entityId: input.campaignId,
      metadata: { count: gifts.length, total, attributed: [...valid].length },
    });
    return { imported: gifts.length, total, fundraiserIds: [...valid] };
  });

  for (const id of touched.fundraiserIds) await notifyMilestones(id);
  return { imported: touched.imported, total: touched.total };
}

/* ------------------------------------------------- supporter → member migration */

/**
 * Migrate a Supporter's fundraisers to a Member identity (§15). Admin-initiated by decision —
 * an email match alone never moves ownership, because that would be an account takeover.
 */
export async function migrateSupporterToMember(
  actor: Actor,
  supporterId: string,
  memberId: string,
): Promise<{ moved: number }> {
  if (!canReviewFundraiser(actor)) throw new ForbiddenError();
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, isMinor: true, deactivatedAt: true, userId: true },
  });
  if (!member) throw new FundraiserError("That member no longer exists.");
  if (member.isMinor || member.deactivatedAt) throw new FundraiserError("That member can't own a fundraiser.");
  if (!member.userId) throw new FundraiserError("That member has no login yet, so they can't manage a fundraiser.");

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.fundraiser.updateMany({
      where: { supporterId },
      data: { supporterId: null, memberId: member.id, ownerUserId: member.userId },
    });
    // Revoke every outstanding magic link, then retire the Supporter record.
    await tx.supporterLoginToken.updateMany({ where: { supporterId, usedAt: null }, data: { usedAt: new Date() } });
    await tx.supporter.update({ where: { id: supporterId }, data: { linkedMemberId: member.id, deactivatedAt: new Date() } });
    await writeAudit(tx, {
      actorId: actor.userId,
      action: "fundraiser.supporter.migrate",
      entity: "Supporter",
      entityId: supporterId,
      metadata: { memberId: member.id, moved: count },
    });
    return { moved: count };
  });
}

/* ------------------------------------------------------------ notifications */

type OwnershipRow = {
  type: FundraiserType;
  ownerUserId: string | null;
  supporterId: string | null;
  householdId: string | null;
  ministryId: string | null;
};

/**
 * Whether this actor may edit the fundraiser, loading the household context a FAMILY
 * fundraiser needs. Every write path goes through this, so the household "manage fundraising"
 * permission is evaluated identically wherever it matters.
 */
async function hasEditRights(actor: Actor, f: OwnershipRow): Promise<boolean> {
  const ref: FundraiserRef = {
    type: f.type, ownerUserId: f.ownerUserId, supporterId: f.supporterId,
    householdId: f.householdId, ministryId: f.ministryId,
  };
  if (f.type !== "FAMILY") return canEditFundraiser(actor, ref);

  const [household, member] = await Promise.all([
    f.householdId ? prisma.household.findUnique({ where: { id: f.householdId }, select: { id: true, primaryContactId: true } }) : null,
    actor.memberId ? prisma.member.findUnique({ where: { id: actor.memberId }, select: { id: true, canManageHouseholdFundraising: true } }) : null,
  ]);
  return canEditFundraiser(actor, ref, { household, member });
}

async function assertCanEdit(actor: Actor, f: OwnershipRow) {
  if (!(await hasEditRights(actor, f))) throw new ForbiddenError();
}

/** Notify the church office that something is waiting in the approval queue. */
async function notifyReviewers(fundraiserId: string, title: string): Promise<void> {
  await notifyRoles(["ADMIN", "PASTOR"], {
    category: NOTIFY_CATEGORY,
    title: "A fundraiser is waiting for review",
    body: `“${title}” has been submitted for the Building Project.`,
    deepLink: `/dashboard/admin/construction/fundraisers#${fundraiserId}`,
  });
}

/** The owner-facing events from §14, delivered on the owner's own channel. */
const DECISION_COPY: Partial<Record<FundraiserAction, { title: string; body: (note: string | null) => string; template: string; issueLink?: boolean }>> = {
  approve: {
    title: "Your fundraiser is approved",
    body: () => "It's live and ready to share. Send your link to family and friends.",
    template: "fundraiser.approved",
  },
  request_changes: {
    title: "Your fundraiser needs changes",
    body: (note) => note ?? "A church administrator has asked for a change before it can go live.",
    template: "fundraiser.changes_requested",
    // A Supporter has no portal, so the email is their ONLY way back in. Without a link the
    // request is a dead end: they are told to change something they cannot reach.
    issueLink: true,
  },
  reject: {
    title: "Your fundraiser was not approved",
    body: (note) => note ?? "A church administrator was not able to approve this fundraiser.",
    template: "fundraiser.rejected",
  },
  reopen: {
    title: "Your fundraiser is being looked at again",
    body: () => "A church administrator reopened it for review. We'll let you know the outcome.",
    template: "fundraiser.reopened",
  },
};

async function notifyOwnerOfDecision(fundraiserId: string, action: FundraiserAction, note: string | null): Promise<void> {
  const copy = DECISION_COPY[action];
  if (!copy) return;
  const f = await prisma.fundraiser.findUnique({
    where: { id: fundraiserId },
    select: {
      id: true, title: true, slug: true, ownerUserId: true,
      supporter: { select: { id: true, email: true, name: true } },
    },
  });
  if (!f) return;
  await deliverToOwner(f, {
    title: copy.title,
    body: copy.body(note),
    template: copy.template,
    vars: { note: note ?? "" },
    // Approval and change-requests both need a fresh manage link: one to start sharing, the
    // other to actually make the change being asked for.
    issueLink: copy.issueLink ?? action === "approve",
  });
}

/** Milestone + goal-reached events, fired at most once per milestone (§14). */
async function notifyMilestones(fundraiserId: string): Promise<void> {
  const f = await prisma.fundraiser.findUnique({
    where: { id: fundraiserId },
    select: {
      id: true, title: true, slug: true, personalGoal: true, status: true, milestoneNotified: true,
      ownerUserId: true, supporter: { select: { id: true, email: true, name: true } },
    },
  });
  if (!f || f.status !== "ACTIVE" || f.personalGoal <= 0) return;

  const raised = await verifiedRaised(fundraiserId);
  const { pct } = fundraiserProgress(raised, f.personalGoal);
  const crossed = newlyCrossedMilestones(f.milestoneNotified, pct);
  if (!crossed.length) return;

  // Claim the high-water mark first, guarded on its previous value, so a concurrent
  // reconciliation cannot send the same milestone twice.
  const claimed = await prisma.fundraiser.updateMany({
    where: { id: fundraiserId, milestoneNotified: f.milestoneNotified },
    data: { milestoneNotified: crossed[crossed.length - 1]! },
  });
  if (claimed.count !== 1) return;

  for (const m of crossed) {
    const reachedGoal = m === 100;
    await deliverToOwner(f, {
      title: reachedGoal ? "You reached your fundraising goal" : `You reached ${m}% of your goal`,
      body: reachedGoal
        ? `“${f.title}” has reached ${formatUsd(f.personalGoal)}. Giving stays open — thank you.`
        : `“${f.title}” is ${m}% of the way to ${formatUsd(f.personalGoal)}.`,
      template: reachedGoal ? "fundraiser.goal_reached" : "fundraiser.milestone",
      vars: { milestone: String(m), goal: formatUsd(f.personalGoal) },
    });
  }
}

/** "Someone started a Building Project fundraiser through your page." (§14) */
async function notifyReferralStart(referringFundraiserId: string, newDisplayName: string): Promise<void> {
  const f = await prisma.fundraiser.findUnique({
    where: { id: referringFundraiserId },
    select: { id: true, title: true, slug: true, ownerUserId: true, supporter: { select: { id: true, email: true, name: true } } },
  });
  if (!f) return;
  await deliverToOwner(f, {
    title: "Someone started a fundraiser through your page",
    body: `${newDisplayName} started a Building Project fundraiser after visiting “${f.title}”.`,
    template: "fundraiser.referral_start",
    vars: { referrerName: newDisplayName },
  });
}

/**
 * One delivery path for every fundraiser event: a member owner gets a Notification in the
 * existing notification centre; a Supporter — who has no notification centre — gets the same
 * event as transactional email through the existing Resend + template pipeline.
 */
async function deliverToOwner(
  f: { id: string; title: string; slug: string; ownerUserId: string | null; supporter: { id: string; email: string; name: string } | null },
  msg: { title: string; body: string; template: string; vars?: Record<string, string>; issueLink?: boolean },
): Promise<void> {
  if (f.ownerUserId) {
    await notify({
      userId: f.ownerUserId,
      category: NOTIFY_CATEGORY,
      title: msg.title,
      body: msg.body,
      deepLink: `/dashboard/fundraisers/${f.id}`,
    });
    return;
  }
  if (!f.supporter) return;
  const manageUrl = msg.issueLink
    ? await issueManageLink(f.supporter.id, f.id).catch(() => `${env.NEXT_PUBLIC_SITE_URL}/fundraising/start`)
    : `${env.NEXT_PUBLIC_SITE_URL}/fundraising/start`;
  await sendTemplated(msg.template, f.supporter.email, {
    firstName: f.supporter.name.split(" ")[0] ?? f.supporter.name,
    fundraiserTitle: f.title,
    publicUrl: publicUrl(f.slug),
    manageUrl,
    churchName: "McKinney Seventh-day Adventist Church",
    ...(msg.vars ?? {}),
  });
}
