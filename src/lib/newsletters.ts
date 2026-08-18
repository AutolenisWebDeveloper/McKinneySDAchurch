import { Prisma } from "@prisma/client";
import type { NewsletterIssueStatus, NewsletterContentType, NewsletterSectionType } from "@prisma/client";
import { prisma } from "./db";
import { env } from "@/env";
import { writeAudit } from "./audit";
import { notify, notifyRoles } from "./notify";
import { sendEmail } from "./email";
import { sanitize } from "./sanitize";
import { unsubscribeToken } from "./unsubscribe";
import { segmentWhere, buildRecipientList, type Segment } from "./segments";
import { isSafeUrl } from "./weekly-packet";
import {
  canIssueTransition,
  canSubmissionTransition,
  computeNewsletterReadiness,
  validateNewsletterForPublish,
  upcomingIssueMonth,
  monthStartOf,
  monthSlug,
  monthLabel,
  defaultCadence,
  isSubmissionOpen,
  isSubmissionUsable,
  DEFAULT_SECTIONS,
  sectionLabel,
  type NewsletterReadiness,
  type NewsletterPublishValidation,
} from "./newsletter";
import {
  newsletterContentRequestEmail,
  newsletterReminderEmail,
  newsletterSubmissionDecisionEmail,
  newsletterEditionEmail,
  type EditionSection,
  type EditionSectionItem,
} from "./newsletter-emails";
import { type Actor, ministryScope, hasRole, canReviewContent, ForbiddenError } from "./rbac";

/**
 * Monthly-newsletter server service (§4–§28). Binds the pure logic in `newsletter.ts` to the DB:
 * create/keep the monthly issue, collect + review department submissions, build controlled sections,
 * keep readiness current, and move the issue DRAFT → COLLECTING → IN_REVIEW → READY → APPROVED →
 * SCHEDULED → PUBLISHED → ARCHIVED with audit + notifications. The member email edition and the
 * public web edition render from ONE content model. Reuses rbac/notify/email/audit/segments — it
 * never forks the WeeklyPacket engine or the email pipeline.
 */

const SITE = (): string => env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
const ADMIN_BASE = "/dashboard/admin/newsletter";
const MINISTRY_BASE = "/dashboard/ministry/newsletter";

function requireAdmin(actor: Actor): void {
  if (!canReviewContent(actor)) throw new ForbiddenError();
}

function assertCanSubmitForMinistry(actor: Actor, ministryId: string): void {
  if (hasRole(actor, "ADMIN", "PASTOR")) return;
  if (hasRole(actor, "MINISTRY_HEAD") && ministryScope(actor).includes(ministryId)) return;
  throw new ForbiddenError();
}

/* ============================ Issue lifecycle ============================ */

/** Get (or create) the issue for a month. Defaults to the upcoming month; seeds cadence + sections. */
export async function getOrCreateIssue(monthStart?: Date): Promise<string> {
  const month = monthStart ? monthStartOf(monthStart) : upcomingIssueMonth(new Date());
  const existing = await prisma.newsletterIssue.findUnique({ where: { monthStart: month }, select: { id: true } });
  if (existing) return existing.id;

  const cadence = defaultCadence(month);
  const created = await prisma.newsletterIssue.create({
    data: {
      monthStart: month,
      slug: monthSlug(month),
      status: "DRAFT",
      title: `${monthLabel(month)} Newsletter`,
      requestAt: cadence.requestAt,
      reminderAt: cadence.reminderAt,
      submissionDeadlineAt: cadence.submissionDeadlineAt,
    },
    select: { id: true },
  });
  await ensureDefaultSections(created.id);
  return created.id;
}

/** Seed the controlled default running order once, if the issue has no sections yet (§13/§14). */
export async function ensureDefaultSections(issueId: string): Promise<void> {
  const count = await prisma.newsletterSection.count({ where: { issueId } });
  if (count > 0) return;
  const stayConnectedLinks = defaultStayConnectedLinks();
  await prisma.newsletterSection.createMany({
    data: DEFAULT_SECTIONS.map((s, i) => ({
      issueId,
      type: s.type,
      title: s.title,
      sortOrder: i,
      hidden: false,
      config: s.type === "STAY_CONNECTED" ? ({ links: stayConnectedLinks } as Prisma.InputJsonValue) : Prisma.DbNull,
    })),
  });
}

function defaultStayConnectedLinks(): { label: string; url: string }[] {
  const s = SITE();
  return [
    { label: "Worship", url: `${s}/worship` },
    { label: "Calendar", url: `${s}/calendar` },
    { label: "Ministries", url: `${s}/ministries` },
    { label: "Prayer", url: `${s}/prayer` },
    { label: "Give", url: `${s}/giving` },
    { label: "Building Project", url: `${s}/building` },
    { label: "Contact", url: `${s}/contact` },
  ];
}

/** All ministry ids invited to contribute (every ministry with an active head). */
async function invitedDepartmentIds(): Promise<string[]> {
  const heads = await prisma.userRole.findMany({
    where: { active: true, role: "MINISTRY_HEAD", ministryId: { not: null } },
    select: { ministryId: true },
  });
  return [...new Set(heads.map((h) => h.ministryId as string))];
}

export type SectionContentView = {
  id: string;
  type: NewsletterSectionType;
  hidden: boolean;
  hasContent: boolean;
};

/** Load sections with a derived hasContent flag used by readiness + rendering. */
async function loadSectionContent(issueId: string): Promise<SectionContentView[]> {
  const sections = await prisma.newsletterSection.findMany({
    where: { issueId },
    select: {
      id: true, type: true, hidden: true, bodyHtml: true, imageUrl: true, submissionId: true,
      eventId: true, config: true, _count: { select: { images: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  return sections.map((s) => {
    const cfg = (s.config ?? {}) as { eventIds?: string[]; submissionIds?: string[]; links?: unknown[] };
    const hasContent = Boolean(
      s.bodyHtml?.trim() || s.imageUrl || s._count.images > 0 || s.submissionId || s.eventId ||
      cfg.eventIds?.length || cfg.submissionIds?.length || cfg.links?.length,
    );
    return { id: s.id, type: s.type, hidden: s.hidden, hasContent };
  });
}

/** Recompute + persist the readiness score from real components (§24). Returns the full breakdown. */
export async function recomputeReadiness(issueId: string): Promise<NewsletterReadiness> {
  const [issue, submissions, sections, departmentIds] = await Promise.all([
    prisma.newsletterIssue.findUniqueOrThrow({ where: { id: issueId }, select: { coverImageUrl: true, pastorMessageHtml: true } }),
    prisma.newsletterSubmission.findMany({ where: { issueId }, select: { ministryId: true, status: true } }),
    loadSectionContent(issueId),
    invitedDepartmentIds(),
  ]);
  const readiness = computeNewsletterReadiness({
    departmentIds,
    submissions,
    sections: sections.map((s) => ({ type: s.type, hidden: s.hidden, hasContent: s.hasContent })),
    hasCoverImage: !!issue.coverImageUrl,
    hasPastorMessage: !!issue.pastorMessageHtml?.trim(),
  });
  await prisma.newsletterIssue.update({ where: { id: issueId }, data: { readinessScore: readiness.score } });
  return readiness;
}

/* ===================== Department content request / reminders ===================== */

type HeadTarget = { userId: string; ministryId: string; ministryName: string; email: string | null };

/** Active department heads eligible to contribute, resolved live (§17). Handles a head who leads
 *  several ministries (one target per ministry). */
async function eligibleDepartmentHeads(): Promise<HeadTarget[]> {
  const roles = await prisma.userRole.findMany({
    where: { active: true, role: "MINISTRY_HEAD", ministryId: { not: null } },
    select: { userId: true, ministryId: true, ministry: { select: { name: true } } },
  });
  const userIds = [...new Set(roles.map((r) => r.userId))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } });
  const emailById = new Map(users.map((u) => [u.id, u.email]));
  return roles.map((r) => ({
    userId: r.userId,
    ministryId: r.ministryId as string,
    ministryName: r.ministry?.name ?? "Your ministry",
    email: emailById.get(r.userId) ?? null,
  }));
}

const dateLabel = (d?: Date | null): string | undefined =>
  d ? d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/Chicago" }) : undefined;

/** Deep-link a head straight into their issue + ministry submission form (§7). */
function submitUrl(issueId: string, ministryId: string): string {
  return `${SITE()}${MINISTRY_BASE}/${issueId}?ministry=${ministryId}`;
}

/**
 * §7/§10 — Send the monthly content request (kind REQUEST) or reminder (kind REMINDER). Idempotent
 * per (issue, kind, userId) via NewsletterReminder, so a cron re-run never double-sends. Reminders
 * go only to departments with no open/in-progress response yet (§10). REQUEST also moves the issue
 * to COLLECTING. Returns per-run counts.
 */
export async function sendDepartmentRequests(
  issueId: string,
  kind: "REQUEST" | "REMINDER",
): Promise<{ considered: number; sent: number; skipped: number }> {
  const issue = await prisma.newsletterIssue.findUniqueOrThrow({
    where: { id: issueId },
    select: { id: true, monthStart: true, status: true, submissionDeadlineAt: true },
  });
  const label = monthLabel(issue.monthStart);
  const deadline = dateLabel(issue.submissionDeadlineAt);
  const heads = await eligibleDepartmentHeads();

  // For reminders, exclude ministries that already have a non-declined submission (§10).
  let respondedMinistryIds = new Set<string>();
  if (kind === "REMINDER") {
    const subs = await prisma.newsletterSubmission.findMany({
      where: { issueId, status: { not: "DECLINED" }, ministryId: { not: null } },
      select: { ministryId: true },
    });
    respondedMinistryIds = new Set(subs.map((s) => s.ministryId as string));
  }

  let considered = 0;
  let sent = 0;
  let skipped = 0;

  for (const head of heads) {
    considered++;
    if (kind === "REMINDER" && respondedMinistryIds.has(head.ministryId)) { skipped++; continue; }

    // Idempotency claim before sending.
    try {
      await prisma.newsletterReminder.create({
        data: { issueId, kind, userId: head.userId, ministryId: head.ministryId },
      });
    } catch {
      skipped++; // already sent this (issue, kind, user)
      continue;
    }

    const url = submitUrl(issueId, head.ministryId);
    await notify({
      userId: head.userId,
      category: "newsletter",
      title: kind === "REQUEST"
        ? `Share your ministry updates for the ${label} newsletter`
        : `Reminder: ${label} newsletter content`,
      deepLink: `${MINISTRY_BASE}/${issueId}?ministry=${head.ministryId}`,
    });

    if (head.email) {
      const tpl = kind === "REQUEST"
        ? newsletterContentRequestEmail({ ministryName: head.ministryName, monthLabel: label, submitUrl: url, deadline })
        : newsletterReminderEmail({ ministryName: head.ministryName, monthLabel: label, submitUrl: url, deadline });
      try {
        await sendEmail({ to: head.email, subject: tpl.subject, html: tpl.html, type: "TRANSACTIONAL" });
      } catch { /* best-effort; the in-app notification + ledger still stand */ }
    }
    sent++;
  }

  if (kind === "REQUEST" && issue.status === "DRAFT") {
    await prisma.newsletterIssue.updateMany({
      where: { id: issueId, status: "DRAFT" },
      data: { status: "COLLECTING" },
    });
  }
  await writeAudit(prisma, {
    actorId: "system",
    action: `newsletter.request.${kind.toLowerCase()}`,
    entity: "NewsletterIssue",
    entityId: issueId,
    metadata: { considered, sent, skipped },
  });
  return { considered, sent, skipped };
}

/* ============================ Department submissions ============================ */

export type SubmissionInput = {
  issueId: string;
  ministryId: string;
  contentType: NewsletterContentType;
  title: string;
  body?: string;
  summary?: string;
  fullContentHtml?: string;
  eventStartAt?: Date | null;
  eventId?: string | null;
  location?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  externalUrl?: string;
  internalNotes?: string;
};

function cleanUrl(u?: string | null): string | null {
  const v = (u ?? "").trim();
  if (!v) return null;
  if (!isSafeUrl(v)) throw new Error("One of the links is not a valid http(s) URL.");
  return v;
}

/** Create or update a department draft. `submit` flips it to SUBMITTED (§8). Scoped to the head's
 *  ministry; admins may act for any ministry. Version-guarded when updating an existing row. */
export async function saveSubmission(
  actor: Actor,
  input: SubmissionInput,
  opts: { submissionId?: string; submit?: boolean; expectedVersion?: number } = {},
): Promise<{ ok: boolean; id?: string; error?: string }> {
  assertCanSubmitForMinistry(actor, input.ministryId);
  const title = input.title.trim();
  if (!title) return { ok: false, error: "A headline/title is required." };

  const data = {
    contentType: input.contentType,
    title,
    body: input.body?.trim() || null,
    summary: input.summary?.trim() || null,
    fullContentHtml: input.fullContentHtml ? sanitize(input.fullContentHtml) : null,
    eventStartAt: input.eventStartAt ?? null,
    eventId: input.eventId?.trim() || null,
    location: input.location?.trim() || null,
    ctaLabel: input.ctaLabel?.trim() || null,
    ctaUrl: cleanUrl(input.ctaUrl),
    externalUrl: cleanUrl(input.externalUrl),
    internalNotes: input.internalNotes?.trim() || null,
  };

  let id = opts.submissionId;
  if (id) {
    // Update existing (must be the same ministry + still open, unless admin).
    const existing = await prisma.newsletterSubmission.findUniqueOrThrow({ where: { id }, select: { ministryId: true, status: true, version: true } });
    if (existing.ministryId) assertCanSubmitForMinistry(actor, existing.ministryId);
    const nextStatus = opts.submit
      ? "SUBMITTED"
      : existing.status === "CHANGES_REQUESTED"
        ? "CHANGES_REQUESTED"
        : existing.status;
    if (opts.submit && !canSubmissionTransition(existing.status, "SUBMITTED") && existing.status !== "DRAFT" && existing.status !== "CHANGES_REQUESTED") {
      return { ok: false, error: "This submission can no longer be submitted." };
    }
    const guard = opts.expectedVersion ?? existing.version;
    const updated = await prisma.newsletterSubmission.updateMany({
      where: { id, version: guard },
      data: { ...data, status: nextStatus, version: guard + 1 },
    });
    if (updated.count === 0) return { ok: false, error: "This submission changed since you loaded it — refresh and try again." };
  } else {
    const created = await prisma.newsletterSubmission.create({
      data: { ...data, issueId: input.issueId, ministryId: input.ministryId, submittedById: actor.userId, status: opts.submit ? "SUBMITTED" : "DRAFT" },
      select: { id: true },
    });
    id = created.id;
  }

  await writeAudit(prisma, { actorId: actor.userId, action: opts.submit ? "newsletter.submission.submit" : "newsletter.submission.save", entity: "NewsletterSubmission", entityId: id, metadata: { ministryId: input.ministryId } });
  await recomputeReadiness(input.issueId);

  if (opts.submit) {
    await notifyRoles(["ADMIN", "PASTOR"], {
      category: "newsletter",
      title: `New newsletter submission: ${title}`,
      deepLink: `${ADMIN_BASE}/${input.issueId}`,
    }, { exceptUserId: actor.userId });
  }
  return { ok: true, id };
}

/** Admin review of a submission (§12). approve / request_changes / decline / start_review. Notifies
 *  + emails the submitting department head; deep-links a change request back to the same record. */
export async function reviewSubmission(
  admin: Actor,
  submissionId: string,
  decision: "start_review" | "approve" | "request_changes" | "decline",
  note?: string,
): Promise<{ ok: boolean; error?: string }> {
  requireAdmin(admin);
  const target = (
    decision === "start_review" ? "UNDER_REVIEW" : decision === "approve" ? "APPROVED" : decision === "request_changes" ? "CHANGES_REQUESTED" : "DECLINED"
  ) as "UNDER_REVIEW" | "APPROVED" | "CHANGES_REQUESTED" | "DECLINED";

  const sub = await prisma.newsletterSubmission.findUniqueOrThrow({ where: { id: submissionId } });
  if (!canSubmissionTransition(sub.status, target)) {
    return { ok: false, error: `Cannot ${decision.replace("_", " ")} a submission that is ${sub.status.toLowerCase().replace(/_/g, " ")}.` };
  }
  if (decision === "request_changes" && !note?.trim()) {
    return { ok: false, error: "Please include a note describing the requested changes." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.newsletterSubmission.update({
      where: { id: submissionId },
      data: { status: target, reviewNote: note?.trim() || null, reviewedById: admin.userId, version: { increment: 1 } },
    });
    await writeAudit(tx, { actorId: admin.userId, action: `newsletter.submission.${decision}`, entity: "NewsletterSubmission", entityId: submissionId });
  });
  await recomputeReadiness(sub.issueId);

  if (sub.submittedById && (decision === "approve" || decision === "request_changes" || decision === "decline")) {
    const outcome = decision === "approve" ? "approved" : decision === "request_changes" ? "changes_requested" : "declined";
    await notify({
      userId: sub.submittedById,
      category: "newsletter",
      title: `Your newsletter submission was ${outcome.replace("_", " ")}`,
      body: note?.trim() || undefined,
      deepLink: `${MINISTRY_BASE}/${sub.issueId}`,
    });
    try {
      const email = (await prisma.user.findUnique({ where: { id: sub.submittedById }, select: { email: true } }))?.email;
      const ministryName = sub.ministryId
        ? (await prisma.ministry.findUnique({ where: { id: sub.ministryId }, select: { name: true } }))?.name ?? "your ministry"
        : "your ministry";
      if (email) {
        const tpl = newsletterSubmissionDecisionEmail({
          title: sub.title,
          ministryName,
          decision: outcome as "approved" | "changes_requested" | "declined",
          note: note?.trim(),
          url: `${SITE()}${MINISTRY_BASE}/${sub.issueId}`,
        });
        await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, type: "TRANSACTIONAL" });
      }
    } catch { /* best-effort */ }
  }
  return { ok: true };
}

/** Add an approved submission to the issue / remove it (§12). Toggles APPROVED ↔ ADDED_TO_ISSUE. */
export async function setSubmissionInIssue(admin: Actor, submissionId: string, included: boolean): Promise<{ ok: boolean; error?: string }> {
  requireAdmin(admin);
  const sub = await prisma.newsletterSubmission.findUniqueOrThrow({ where: { id: submissionId }, select: { id: true, issueId: true, status: true } });
  const to = included ? "ADDED_TO_ISSUE" : "APPROVED";
  if (!canSubmissionTransition(sub.status, to)) return { ok: false, error: "That change isn't allowed from the current status." };
  await prisma.newsletterSubmission.update({ where: { id: submissionId }, data: { status: to, version: { increment: 1 } } });
  await writeAudit(prisma, { actorId: admin.userId, action: included ? "newsletter.submission.add_to_issue" : "newsletter.submission.remove_from_issue", entity: "NewsletterSubmission", entityId: submissionId });
  await recomputeReadiness(sub.issueId);
  return { ok: true };
}

/* ============================ Editorial builder (sections) ============================ */

export type SectionPatch = {
  title?: string | null;
  subtitle?: string | null;
  bodyHtml?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  submissionId?: string | null;
  eventId?: string | null;
  config?: Prisma.InputJsonValue | null;
};

export async function updateSection(admin: Actor, sectionId: string, patch: SectionPatch): Promise<{ ok: boolean; error?: string }> {
  requireAdmin(admin);
  const section = await prisma.newsletterSection.findUniqueOrThrow({ where: { id: sectionId }, select: { issueId: true } });
  const data: Prisma.NewsletterSectionUpdateInput = {};
  if (patch.title !== undefined) data.title = patch.title?.trim() || null;
  if (patch.subtitle !== undefined) data.subtitle = patch.subtitle?.trim() || null;
  if (patch.bodyHtml !== undefined) data.bodyHtml = patch.bodyHtml ? sanitize(patch.bodyHtml) : null;
  if (patch.imageUrl !== undefined) data.imageUrl = patch.imageUrl ? (cleanUrl(patch.imageUrl) ?? null) : null;
  if (patch.imageAlt !== undefined) data.imageAlt = patch.imageAlt?.trim() || null;
  if (patch.ctaLabel !== undefined) data.ctaLabel = patch.ctaLabel?.trim() || null;
  if (patch.ctaUrl !== undefined) data.ctaUrl = patch.ctaUrl ? (cleanUrl(patch.ctaUrl) ?? null) : null;
  if (patch.submissionId !== undefined) data.submissionId = patch.submissionId || null;
  if (patch.eventId !== undefined) data.eventId = patch.eventId?.trim() || null;
  if (patch.config !== undefined) data.config = patch.config === null ? Prisma.DbNull : patch.config;

  await prisma.newsletterSection.update({ where: { id: sectionId }, data });
  await writeAudit(prisma, { actorId: admin.userId, action: "newsletter.section.update", entity: "NewsletterSection", entityId: sectionId });
  await recomputeReadiness(section.issueId);
  return { ok: true };
}

export async function addSection(admin: Actor, issueId: string, type: NewsletterSectionType): Promise<{ ok: boolean; id?: string }> {
  requireAdmin(admin);
  const max = await prisma.newsletterSection.aggregate({ where: { issueId }, _max: { sortOrder: true } });
  const created = await prisma.newsletterSection.create({
    data: { issueId, type, title: sectionLabel(type), sortOrder: (max._max.sortOrder ?? -1) + 1 },
    select: { id: true },
  });
  await writeAudit(prisma, { actorId: admin.userId, action: "newsletter.section.add", entity: "NewsletterSection", entityId: created.id, metadata: { type } });
  await recomputeReadiness(issueId);
  return { ok: true, id: created.id };
}

export async function setSectionHidden(admin: Actor, sectionId: string, hidden: boolean): Promise<void> {
  requireAdmin(admin);
  const s = await prisma.newsletterSection.update({ where: { id: sectionId }, data: { hidden }, select: { issueId: true } });
  await writeAudit(prisma, { actorId: admin.userId, action: "newsletter.section.hide", entity: "NewsletterSection", entityId: sectionId, metadata: { hidden } });
  await recomputeReadiness(s.issueId);
}

export async function deleteSection(admin: Actor, sectionId: string): Promise<void> {
  requireAdmin(admin);
  const s = await prisma.newsletterSection.findUniqueOrThrow({ where: { id: sectionId }, select: { issueId: true } });
  await prisma.newsletterSection.delete({ where: { id: sectionId } });
  await writeAudit(prisma, { actorId: admin.userId, action: "newsletter.section.delete", entity: "NewsletterSection", entityId: sectionId });
  await recomputeReadiness(s.issueId);
}

/** Reorder sections by an explicit id list (drag order). Ids not in the list keep their tail order. */
export async function reorderSections(admin: Actor, issueId: string, orderedIds: string[]): Promise<void> {
  requireAdmin(admin);
  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.newsletterSection.updateMany({ where: { id, issueId }, data: { sortOrder: i } })),
  );
  await writeAudit(prisma, { actorId: admin.userId, action: "newsletter.section.reorder", entity: "NewsletterIssue", entityId: issueId });
}

/** Cover + pastor message + audience + cadence live on the issue itself. */
export async function updateIssueMeta(
  admin: Actor,
  issueId: string,
  patch: {
    title?: string;
    coverHeadline?: string;
    theme?: string;
    coverImageUrl?: string | null;
    coverImageAlt?: string;
    pastorMessageHtml?: string | null;
    pastorMessageBy?: string;
    audienceSegment?: Segment;
    requestAt?: Date | null;
    reminderAt?: Date | null;
    submissionDeadlineAt?: Date | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  requireAdmin(admin);
  const data: Prisma.NewsletterIssueUpdateInput = {};
  if (patch.title !== undefined) data.title = patch.title.trim() || null;
  if (patch.coverHeadline !== undefined) data.coverHeadline = patch.coverHeadline.trim() || null;
  if (patch.theme !== undefined) data.theme = patch.theme.trim() || null;
  if (patch.coverImageUrl !== undefined) data.coverImageUrl = patch.coverImageUrl ? (cleanUrl(patch.coverImageUrl) ?? null) : null;
  if (patch.coverImageAlt !== undefined) data.coverImageAlt = patch.coverImageAlt.trim() || null;
  if (patch.pastorMessageHtml !== undefined) data.pastorMessageHtml = patch.pastorMessageHtml ? sanitize(patch.pastorMessageHtml) : null;
  if (patch.pastorMessageBy !== undefined) data.pastorMessageBy = patch.pastorMessageBy.trim() || null;
  if (patch.audienceSegment !== undefined) data.audienceSegment = patch.audienceSegment;
  if (patch.requestAt !== undefined) data.requestAt = patch.requestAt;
  if (patch.reminderAt !== undefined) data.reminderAt = patch.reminderAt;
  if (patch.submissionDeadlineAt !== undefined) data.submissionDeadlineAt = patch.submissionDeadlineAt;

  await prisma.newsletterIssue.update({ where: { id: issueId }, data });
  await writeAudit(prisma, { actorId: admin.userId, action: "newsletter.issue.update", entity: "NewsletterIssue", entityId: issueId });
  await recomputeReadiness(issueId);
  return { ok: true };
}

/* ============================ Render model (one content model → channels) ============================ */

export type RenderItem = EditionSectionItem & { href?: string };
export type RenderSection = {
  type: NewsletterSectionType;
  heading: string;
  subtitle?: string;
  bodyHtml?: string;
  imageUrl?: string;
  imageAlt?: string;
  cta?: { label: string; url: string };
  items: RenderItem[];
  links?: { label: string; url: string }[];
};

export type NewsletterRenderModel = {
  slug: string;
  monthLabel: string;
  status: NewsletterIssueStatus;
  title: string | null;
  coverHeadline: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  pastorMessageHtml: string | null;
  pastorMessageBy: string | null;
  webUrl: string;
  sections: RenderSection[];
};

/** Build the single render model both the web edition and the email edition consume (§20). */
export async function getRenderModel(issueId: string): Promise<NewsletterRenderModel> {
  const issue = await prisma.newsletterIssue.findUniqueOrThrow({
    where: { id: issueId },
    include: {
      sections: { orderBy: { sortOrder: "asc" }, include: { images: { orderBy: { sortOrder: "asc" } } } },
      submissions: { where: { status: { in: ["APPROVED", "ADDED_TO_ISSUE"] } }, include: { images: { orderBy: { sortOrder: "asc" } } } },
    },
  });

  const usedSubs = issue.submissions;
  const subById = new Map(usedSubs.map((s) => [s.id, s]));

  // Resolve any referenced events across sections in one query.
  const eventIds = new Set<string>();
  for (const s of issue.sections) {
    if (s.eventId) eventIds.add(s.eventId);
    const cfg = (s.config ?? {}) as { eventIds?: string[] };
    for (const id of cfg.eventIds ?? []) eventIds.add(id);
  }
  const events = eventIds.size
    ? await prisma.event.findMany({
        where: { id: { in: [...eventIds] }, status: "PUBLISHED", visibility: "PUBLIC" },
        select: { id: true, title: true, slug: true, startAt: true, location: true, summary: true, imageUrl: true, imageAlt: true },
      })
    : [];
  const eventById = new Map(events.map((e) => [e.id, e]));

  const eventItem = (id: string): RenderItem | null => {
    const e = eventById.get(id);
    if (!e) return null;
    const when = e.startAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });
    return {
      title: e.title,
      meta: [when, e.location].filter(Boolean).join(" · "),
      text: e.summary ?? undefined,
      imageUrl: e.imageUrl ?? undefined,
      imageAlt: e.imageAlt ?? undefined,
      ctaLabel: "Learn More",
      ctaUrl: `${SITE()}/calendar/events/${e.slug}`,
    };
  };

  const subItem = (subId: string): RenderItem | null => {
    const s = subById.get(subId);
    if (!s) return null;
    return {
      title: s.title,
      text: s.summary ?? s.body ?? undefined,
      imageUrl: s.images[0]?.url ?? undefined,
      imageAlt: s.images[0]?.alt ?? undefined,
      ctaLabel: s.ctaLabel ?? undefined,
      ctaUrl: s.ctaUrl ?? undefined,
      meta: s.eventStartAt ? s.eventStartAt.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" }) : undefined,
    };
  };

  const sections: RenderSection[] = [];
  for (const s of issue.sections) {
    if (s.hidden || s.type === "HERO" || s.type === "PASTOR_MESSAGE") continue; // hero + pastor are rendered from issue fields
    const cfg = (s.config ?? {}) as { eventIds?: string[]; submissionIds?: string[]; links?: { label: string; url: string }[] };
    const items: RenderItem[] = [];

    if (s.type === "UPCOMING_EVENTS") {
      for (const id of cfg.eventIds ?? []) { const it = eventItem(id); if (it) items.push(it); }
      if (s.eventId) { const it = eventItem(s.eventId); if (it) items.push(it); }
    } else {
      if (s.submissionId) { const it = subItem(s.submissionId); if (it) items.push(it); }
      for (const id of cfg.submissionIds ?? []) { const it = subItem(id); if (it) items.push(it); }
    }
    // Section's own images become photo items.
    for (const img of s.images) items.push({ imageUrl: img.url, imageAlt: img.alt ?? undefined, title: img.caption ?? undefined });

    const hasOwn = Boolean(s.bodyHtml?.trim() || s.imageUrl || s.ctaUrl || items.length || (s.type === "STAY_CONNECTED" && cfg.links?.length));
    if (!hasOwn) continue;

    sections.push({
      type: s.type,
      heading: s.title || sectionLabel(s.type),
      subtitle: s.subtitle ?? undefined,
      bodyHtml: s.bodyHtml ?? undefined,
      imageUrl: s.imageUrl ?? undefined,
      imageAlt: s.imageAlt ?? undefined,
      cta: s.ctaLabel && s.ctaUrl ? { label: s.ctaLabel, url: s.ctaUrl } : undefined,
      items,
      links: s.type === "STAY_CONNECTED" ? cfg.links ?? defaultStayConnectedLinks() : undefined,
    });
  }

  return {
    slug: issue.slug,
    monthLabel: monthLabel(issue.monthStart),
    status: issue.status,
    title: issue.title,
    coverHeadline: issue.coverHeadline,
    coverImageUrl: issue.coverImageUrl,
    coverImageAlt: issue.coverImageAlt,
    pastorMessageHtml: issue.pastorMessageHtml,
    pastorMessageBy: issue.pastorMessageBy,
    webUrl: `${SITE()}/newsletter/${issue.slug}`,
    sections,
  };
}

/** Map the render model → the email edition payload (§22). Rich HTML is flattened to plain text
 *  for email safety; images carry alt text. */
function renderModelToEmail(model: NewsletterRenderModel, unsubscribeUrl: string) {
  const stripHtml = (html: string): string => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const stayConnected = model.sections.find((s) => s.type === "STAY_CONNECTED")?.links ?? [];
  const editionSections: EditionSection[] = model.sections
    .filter((s) => s.type !== "STAY_CONNECTED")
    .map((s) => {
      const items: EditionSectionItem[] = [];
      if (s.bodyHtml || s.imageUrl || s.cta) {
        items.push({ title: undefined, text: s.bodyHtml ? stripHtml(s.bodyHtml) : undefined, imageUrl: s.imageUrl, imageAlt: s.imageAlt, ctaLabel: s.cta?.label, ctaUrl: s.cta?.url });
      }
      for (const it of s.items) items.push({ title: it.title, text: it.text, meta: it.meta, imageUrl: it.imageUrl, imageAlt: it.imageAlt, ctaLabel: it.ctaLabel, ctaUrl: it.ctaUrl });
      return { heading: s.heading, intro: s.subtitle, items };
    })
    .filter((s) => s.items.length > 0);

  return newsletterEditionEmail({
    monthLabel: model.monthLabel,
    coverHeadline: model.coverHeadline ?? undefined,
    coverImageUrl: model.coverImageUrl ?? undefined,
    coverImageAlt: model.coverImageAlt ?? undefined,
    pastorMessage: model.pastorMessageHtml ? stripHtml(model.pastorMessageHtml) : undefined,
    pastorMessageBy: model.pastorMessageBy ?? undefined,
    sections: editionSections,
    stayConnected,
    webUrl: model.webUrl,
    unsubscribeUrl,
  });
}

/* ============================ Publish validation + transitions ============================ */

async function collectInvalidUrls(issueId: string): Promise<string[]> {
  const [subs, sections, issue] = await Promise.all([
    prisma.newsletterSubmission.findMany({ where: { issueId, status: { in: ["APPROVED", "ADDED_TO_ISSUE"] } }, select: { ctaUrl: true, externalUrl: true } }),
    prisma.newsletterSection.findMany({ where: { issueId, hidden: false }, select: { ctaUrl: true, imageUrl: true } }),
    prisma.newsletterIssue.findUniqueOrThrow({ where: { id: issueId }, select: { coverImageUrl: true } }),
  ]);
  const urls = [
    ...subs.flatMap((s) => [s.ctaUrl, s.externalUrl]),
    ...sections.flatMap((s) => [s.ctaUrl, s.imageUrl]),
    issue.coverImageUrl,
  ].filter((u): u is string => !!u);
  return urls.filter((u) => !isSafeUrl(u));
}

/** Resolve the member audience for an issue's segment (minor-safe, §19). */
export async function resolveAudience(segment: Segment): Promise<string[]> {
  const members = await prisma.member.findMany({
    where: segmentWhere(segment),
    select: { isMinor: true, dateOfBirth: true, email: true },
  });
  return buildRecipientList(members);
}

/** Assemble the publish-readiness validation (§25/§26). Hard errors block; warnings are advisory. */
export async function getPublishValidation(issueId: string): Promise<NewsletterPublishValidation & { audienceSize: number }> {
  const issue = await prisma.newsletterIssue.findUniqueOrThrow({
    where: { id: issueId },
    select: { status: true, readinessScore: true, coverImageUrl: true, pastorMessageHtml: true, audienceSegment: true },
  });
  const [approvedCount, pendingReviewCount, invalidUrls, audience] = await Promise.all([
    prisma.newsletterSubmission.count({ where: { issueId, status: { in: ["APPROVED", "ADDED_TO_ISSUE"] } } }),
    prisma.newsletterSubmission.count({ where: { issueId, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    collectInvalidUrls(issueId),
    resolveAudience((issue.audienceSegment as Segment) ?? "ACTIVE_MEMBERS"),
  ]);
  const v = validateNewsletterForPublish({
    status: issue.status,
    readinessScore: issue.readinessScore,
    hasCoverImage: !!issue.coverImageUrl,
    hasPastorMessage: !!issue.pastorMessageHtml?.trim(),
    approvedCount,
    pendingReviewCount,
    audienceSize: audience.length,
    invalidUrls,
  });
  return { ...v, audienceSize: audience.length };
}

/**
 * Version-guarded lifecycle transition for the edges that don't send email. PUBLISH and SCHEDULE
 * have dedicated entry points (`publishIssueNow`, `scheduleIssue`) because they carry side effects.
 */
export async function transitionIssue(
  admin: Actor,
  issueId: string,
  to: NewsletterIssueStatus,
  expectedVersion: number,
): Promise<{ ok: boolean; error?: string }> {
  requireAdmin(admin);
  if (to === "PUBLISHED" || to === "SCHEDULED") {
    return { ok: false, error: "Use the schedule/send actions for publishing." };
  }
  const issue = await prisma.newsletterIssue.findUniqueOrThrow({ where: { id: issueId }, select: { status: true } });
  if (!canIssueTransition(issue.status, to)) return { ok: false, error: "That change isn't allowed from the current status." };

  const now = new Date();
  const data: Prisma.NewsletterIssueUncheckedUpdateManyInput = { status: to, version: expectedVersion + 1 };
  if (to === "APPROVED") { data.approvedById = admin.userId; data.approvedAt = now; }
  if (to === "ARCHIVED") data.archivedAt = now;

  const updated = await prisma.newsletterIssue.updateMany({ where: { id: issueId, version: expectedVersion }, data });
  if (updated.count === 0) return { ok: false, error: "This issue changed since you loaded it — refresh and try again." };

  if (to === "ARCHIVED") {
    await prisma.newsletterSubmission.updateMany({ where: { issueId, status: "ADDED_TO_ISSUE" }, data: { status: "APPROVED" } });
  }
  await writeAudit(prisma, { actorId: admin.userId, action: `newsletter.issue.${to.toLowerCase()}`, entity: "NewsletterIssue", entityId: issueId });
  return { ok: true };
}

/** Schedule a future send (§27). Requires an approved issue and a future instant. */
export async function scheduleIssue(admin: Actor, issueId: string, sendAt: Date, expectedVersion: number): Promise<{ ok: boolean; error?: string }> {
  requireAdmin(admin);
  if (sendAt.getTime() <= Date.now()) return { ok: false, error: "Choose a send time in the future." };
  const issue = await prisma.newsletterIssue.findUniqueOrThrow({ where: { id: issueId }, select: { status: true } });
  if (!canIssueTransition(issue.status, "SCHEDULED")) return { ok: false, error: "Only an approved issue can be scheduled." };
  const validation = await getPublishValidation(issueId);
  if (!validation.canPublish) return { ok: false, error: validation.errors.join(" ") };

  const updated = await prisma.newsletterIssue.updateMany({
    where: { id: issueId, version: expectedVersion },
    data: { status: "SCHEDULED", scheduledSendAt: sendAt, version: expectedVersion + 1 },
  });
  if (updated.count === 0) return { ok: false, error: "This issue changed since you loaded it — refresh and try again." };
  await writeAudit(prisma, { actorId: admin.userId, action: "newsletter.issue.scheduled", entity: "NewsletterIssue", entityId: issueId, metadata: { sendAt: sendAt.toISOString() } });
  await notifyRoles(["ADMIN", "PASTOR"], { category: "newsletter", title: `Newsletter scheduled to send`, deepLink: `${ADMIN_BASE}/${issueId}` }, { exceptUserId: admin.userId });
  return { ok: true };
}

/** Cancel a scheduled send, returning to APPROVED. */
export async function cancelSchedule(admin: Actor, issueId: string, expectedVersion: number): Promise<{ ok: boolean; error?: string }> {
  requireAdmin(admin);
  const updated = await prisma.newsletterIssue.updateMany({
    where: { id: issueId, version: expectedVersion, status: "SCHEDULED" },
    data: { status: "APPROVED", scheduledSendAt: null, version: expectedVersion + 1 },
  });
  if (updated.count === 0) return { ok: false, error: "This issue is no longer scheduled — refresh and try again." };
  await writeAudit(prisma, { actorId: admin.userId, action: "newsletter.issue.schedule_cancelled", entity: "NewsletterIssue", entityId: issueId });
  return { ok: true };
}

/**
 * The idempotent send + web-publish pipeline (§20). Claims a NewsletterDistribution row unique per
 * (issue, channel) so a duplicate/cron re-run no-ops. Sends the member edition through the shared
 * pipeline (MARKETING + listType "NEWSLETTER", suppression re-checked at send time), records
 * per-recipient EmailMessage rows + aggregate counts, then marks the issue PUBLISHED and the web
 * edition live. Returns counts. Callable by an admin ("send now") or the scheduler cron.
 */
async function runDeliver(issueId: string, actorId: string): Promise<{ ok: boolean; error?: string; sent?: number; suppressed?: number; recipients?: number }> {
  // Idempotency lock.
  try {
    await prisma.newsletterDistribution.create({ data: { issueId, channel: "EMAIL", status: "PENDING" } });
  } catch {
    return { ok: false, error: "This issue has already been sent." };
  }

  const issue = await prisma.newsletterIssue.findUniqueOrThrow({ where: { id: issueId }, select: { audienceSegment: true } });
  const segment = (issue.audienceSegment as Segment) ?? "ACTIVE_MEMBERS";
  const recipients = await resolveAudience(segment);
  const model = await getRenderModel(issueId);

  // Create a reporting campaign only for an admin-initiated send (a real user owns it). Scheduled
  // cron sends have no user and rely on the NewsletterDistribution ledger for reporting.
  const campaign = actorId !== "system"
    ? await prisma.emailCampaign.create({
        data: {
          subject: `The McKinney SDA Newsletter — ${model.monthLabel}`,
          type: "MARKETING",
          audience: segment,
          fromIdentity: env.MAIL_FROM,
          status: "SENDING",
          idempotencyKey: `newsletter:${issueId}`,
          bodyHtml: "", // per-recipient personalized (unsubscribe link); not a single stored body
          createdById: actorId,
        },
        select: { id: true },
      }).catch(() => null)
    : null;

  let sent = 0;
  let suppressed = 0;
  for (const email of recipients) {
    const unsubscribeUrl = `${SITE()}/api/email/unsubscribe/${unsubscribeToken(email, "NEWSLETTER")}`;
    const { subject, html } = renderModelToEmail(model, unsubscribeUrl);
    try {
      const identity = await prisma.emailIdentity.upsert({
        where: { emailNormalized: email },
        update: {},
        create: { emailNormalized: email },
        select: { id: true },
      });
      const message = campaign
        ? await prisma.emailMessage.create({ data: { identityId: identity.id, campaignId: campaign.id, type: "MARKETING", status: "QUEUED" }, select: { id: true } })
        : null;
      const res = await sendEmail({ to: email, subject, html, type: "MARKETING", listType: "NEWSLETTER" });
      if (message) {
        await prisma.emailMessage.update({ where: { id: message.id }, data: { status: res.sent ? "ACCEPTED" : "SUPPRESSED" } });
      }
      if (res.sent) sent++; else suppressed++;
    } catch {
      suppressed++;
    }
  }

  const now = new Date();
  if (campaign) await prisma.emailCampaign.update({ where: { id: campaign.id }, data: { status: "SENT", sentAt: now } });
  await prisma.newsletterDistribution.update({
    where: { issueId_channel: { issueId, channel: "EMAIL" } },
    data: { status: "SENT", recipientCount: recipients.length, sentCount: sent, suppressedCount: suppressed, completedAt: now },
  });
  await prisma.newsletterIssue.update({ where: { id: issueId }, data: { status: "PUBLISHED", publishedAt: now, webPublishedAt: now, scheduledSendAt: null } });

  await writeAudit(prisma, { actorId, action: "newsletter.issue.published", entity: "NewsletterIssue", entityId: issueId, metadata: { recipients: recipients.length, sent, suppressed } });
  await notifyRoles(["ADMIN", "PASTOR"], { category: "newsletter", title: `Newsletter sent — ${model.monthLabel}`, deepLink: `${ADMIN_BASE}/${issueId}` });
  return { ok: true, sent, suppressed, recipients: recipients.length };
}

/** Admin "send now" (§27). Validates, version-guards APPROVED→PUBLISHED (via runDeliver's ledger). */
export async function publishIssueNow(admin: Actor, issueId: string): Promise<{ ok: boolean; error?: string; sent?: number; suppressed?: number; recipients?: number }> {
  requireAdmin(admin);
  const issue = await prisma.newsletterIssue.findUniqueOrThrow({ where: { id: issueId }, select: { status: true } });
  if (!canIssueTransition(issue.status, "PUBLISHED")) return { ok: false, error: "Only an approved or scheduled issue can be sent." };
  const validation = await getPublishValidation(issueId);
  if (!validation.canPublish) return { ok: false, error: validation.errors.join(" ") };
  return runDeliver(issueId, admin.userId);
}

/** Scheduler entry point (§27) — deliver any SCHEDULED issue whose send time has arrived. Idempotent. */
export async function deliverDueScheduledIssues(now: Date = new Date()): Promise<{ delivered: number; results: { issueId: string; sent?: number; error?: string }[] }> {
  const due = await prisma.newsletterIssue.findMany({
    where: { status: "SCHEDULED", scheduledSendAt: { lte: now } },
    select: { id: true },
  });
  const results: { issueId: string; sent?: number; error?: string }[] = [];
  for (const issue of due) {
    const validation = await getPublishValidation(issue.id);
    if (!validation.canPublish) { results.push({ issueId: issue.id, error: validation.errors.join(" ") }); continue; }
    const r = await runDeliver(issue.id, "system");
    results.push({ issueId: issue.id, sent: r.sent, error: r.error });
  }
  return { delivered: results.filter((r) => !r.error).length, results };
}

/** Send a test copy of the edition to a specific address (§26). Does not touch the issue lifecycle. */
export async function sendTestEmail(admin: Actor, issueId: string, toEmail: string): Promise<{ ok: boolean; error?: string }> {
  requireAdmin(admin);
  const email = toEmail.trim();
  if (!email) return { ok: false, error: "Enter an email address for the test." };
  const model = await getRenderModel(issueId);
  const unsubscribeUrl = `${SITE()}/api/email/unsubscribe/${unsubscribeToken(email, "NEWSLETTER")}`;
  const { subject, html } = renderModelToEmail(model, unsubscribeUrl);
  const res = await sendEmail({ to: email, subject: `[TEST] ${subject}`, html, type: "TRANSACTIONAL" });
  await prisma.newsletterIssue.update({ where: { id: issueId }, data: { testEmailSentAt: new Date() } });
  await writeAudit(prisma, { actorId: admin.userId, action: "newsletter.issue.test_email", entity: "NewsletterIssue", entityId: issueId, metadata: { to: email, sent: res.sent } });
  return res.sent ? { ok: true } : { ok: false, error: res.reason === "no-resend-key" ? "Email is not configured in this environment." : "The test could not be sent to that address." };
}

/* ============================ Public reads ============================ */

/** Published issues for the public archive, newest first (§23). */
export async function listPublishedIssues(): Promise<{ slug: string; monthLabel: string; coverImageUrl: string | null; coverHeadline: string | null; publishedAt: Date | null }[]> {
  const issues = await prisma.newsletterIssue.findMany({
    where: { status: { in: ["PUBLISHED", "ARCHIVED"] } },
    orderBy: { monthStart: "desc" },
    select: { slug: true, monthStart: true, coverImageUrl: true, coverHeadline: true, publishedAt: true },
  });
  return issues.map((i) => ({ slug: i.slug, monthLabel: monthLabel(i.monthStart), coverImageUrl: i.coverImageUrl, coverHeadline: i.coverHeadline, publishedAt: i.publishedAt }));
}

/** The public web edition by slug (published/archived only). Returns null for anything unpublished. */
export async function getPublishedIssueBySlug(slug: string): Promise<NewsletterRenderModel | null> {
  const issue = await prisma.newsletterIssue.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (!issue || (issue.status !== "PUBLISHED" && issue.status !== "ARCHIVED")) return null;
  return getRenderModel(issue.id);
}

/** Neighboring published issues for prev/next navigation (§21). */
export async function getAdjacentIssues(slug: string): Promise<{ prev?: { slug: string; monthLabel: string }; next?: { slug: string; monthLabel: string } }> {
  const current = await prisma.newsletterIssue.findUnique({ where: { slug }, select: { monthStart: true } });
  if (!current) return {};
  const [older, newer] = await Promise.all([
    prisma.newsletterIssue.findFirst({ where: { status: { in: ["PUBLISHED", "ARCHIVED"] }, monthStart: { lt: current.monthStart } }, orderBy: { monthStart: "desc" }, select: { slug: true, monthStart: true } }),
    prisma.newsletterIssue.findFirst({ where: { status: { in: ["PUBLISHED", "ARCHIVED"] }, monthStart: { gt: current.monthStart } }, orderBy: { monthStart: "asc" }, select: { slug: true, monthStart: true } }),
  ]);
  return {
    prev: older ? { slug: older.slug, monthLabel: monthLabel(older.monthStart) } : undefined,
    next: newer ? { slug: newer.slug, monthLabel: monthLabel(newer.monthStart) } : undefined,
  };
}
