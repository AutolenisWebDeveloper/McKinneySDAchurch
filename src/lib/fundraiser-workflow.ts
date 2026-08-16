import type { FundraiserStatus, FundraiserType } from "@prisma/client";

/**
 * Pure state machine + rules for My Building Fundraiser (spec §5–§11, §18). I/O-free and
 * fully unit-tested, following the same split the calendar uses (event-workflow.ts is the
 * rules, event-* services do the DB + audit + notify). Every guard here is re-applied by the
 * service layer in fundraisers.ts — the UI never decides any of it.
 */

/* ------------------------------------------------------------------ status */

export const FUNDRAISER_STATUS_LABEL: Record<FundraiserStatus, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  CHANGES_REQUESTED: "Changes requested",
  REJECTED: "Not approved",
  ACTIVE: "Active",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

export const FUNDRAISER_TYPE_LABEL: Record<FundraiserType, string> = {
  PERSONAL: "Personal",
  FAMILY: "Family",
  MINISTRY: "Ministry or team",
};

/** Statuses that still count as "the owner's live fundraiser" for dashboard purposes. */
export const OPEN_STATUSES: FundraiserStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "REJECTED",
  "ACTIVE",
];

/** Only an ACTIVE fundraiser has a reachable public page (§18). */
export function isPubliclyVisible(status: FundraiserStatus): boolean {
  return status === "ACTIVE";
}

/** A CLOSED or ARCHIVED fundraiser is read-only; nothing about it may be edited. */
export function isEditable(status: FundraiserStatus): boolean {
  return status !== "CLOSED" && status !== "ARCHIVED";
}

/* -------------------------------------------------------------- transitions */

export type FundraiserAction =
  | "submit"
  | "approve"
  | "request_changes"
  | "reject"
  | "reopen"
  | "close"
  | "archive";

export type TransitionActor = "owner" | "admin";

type Rule = { from: FundraiserStatus[]; to: FundraiserStatus; actors: TransitionActor[]; requiresNote?: boolean };

/**
 * The complete, closed set of legal transitions (§7). Anything not listed here is rejected —
 * deny by default, exactly like the WorkItem and Event state machines.
 */
const RULES: Record<FundraiserAction, Rule> = {
  submit: { from: ["DRAFT", "CHANGES_REQUESTED"], to: "PENDING_REVIEW", actors: ["owner", "admin"] },
  approve: { from: ["PENDING_REVIEW"], to: "ACTIVE", actors: ["admin"] },
  request_changes: { from: ["PENDING_REVIEW"], to: "CHANGES_REQUESTED", actors: ["admin"], requiresNote: true },
  reject: { from: ["PENDING_REVIEW"], to: "REJECTED", actors: ["admin"], requiresNote: true },
  reopen: { from: ["REJECTED"], to: "PENDING_REVIEW", actors: ["admin"] },
  close: { from: ["ACTIVE"], to: "CLOSED", actors: ["owner", "admin"] },
  archive: { from: ["CLOSED"], to: "ARCHIVED", actors: ["admin"] },
};

export type TransitionResult =
  | { ok: true; status: FundraiserStatus }
  | { ok: false; reason: string };

/** Resolve an action into its next status, or an explanation of why it is not allowed. */
export function transition(
  from: FundraiserStatus,
  action: FundraiserAction,
  actor: TransitionActor,
  opts: { note?: string | null } = {},
): TransitionResult {
  const rule = RULES[action];
  if (!rule) return { ok: false, reason: "Unknown action." };
  if (!rule.actors.includes(actor)) return { ok: false, reason: "You are not allowed to take that action." };
  if (!rule.from.includes(from)) {
    return { ok: false, reason: `A ${FUNDRAISER_STATUS_LABEL[from].toLowerCase()} fundraiser cannot be ${pastTense(action)}.` };
  }
  if (rule.requiresNote && !opts.note?.trim()) return { ok: false, reason: "Add a note explaining what the owner needs to do." };
  return { ok: true, status: rule.to };
}

function pastTense(action: FundraiserAction): string {
  switch (action) {
    case "submit": return "submitted";
    case "approve": return "approved";
    case "request_changes": return "returned for changes";
    case "reject": return "declined";
    case "reopen": return "reopened";
    case "close": return "closed";
    case "archive": return "archived";
  }
}

/** Every action this actor could take from this status — drives which buttons render. */
export function availableActions(from: FundraiserStatus, actor: TransitionActor): FundraiserAction[] {
  return (Object.keys(RULES) as FundraiserAction[]).filter(
    (a) => RULES[a].actors.includes(actor) && RULES[a].from.includes(from),
  );
}

/* --------------------------------------------------------------- edit rules */

/** Edited freely while ACTIVE — content that does not change what the page IS (§8). */
export const SELF_SERVICE_FIELDS = ["story", "graphicUrl", "targetDate", "personalGoal", "displayName"] as const;
/** Identity-level edits: they send the fundraiser back through review (§8). */
export const REAPPROVAL_FIELDS = ["title", "type"] as const;

export type EditablePatch = {
  title?: string;
  type?: FundraiserType;
  story?: string | null;
  graphicUrl?: string | null;
  targetDate?: Date | null;
  personalGoal?: number;
  displayName?: string;
};

export type EditContext = {
  status: FundraiserStatus;
  title: string;
  type: FundraiserType;
  /** Treasurer-verified dollars raised so far — the floor a goal may not go below. */
  verifiedRaised: number;
  minGoal: number;
  maxGoal: number;
};

export type EditDecision =
  | { ok: true; requiresReapproval: boolean; nextStatus: FundraiserStatus }
  | { ok: false; reason: string };

/**
 * Decide whether an edit is allowed and whether it re-enters review. Content edits keep an
 * ACTIVE fundraiser live so giving is never interrupted; changing the title or the type
 * changes what supporters were shown, so it returns to PENDING_REVIEW.
 */
export function decideEdit(ctx: EditContext, patch: EditablePatch): EditDecision {
  if (!isEditable(ctx.status)) {
    return { ok: false, reason: `A ${FUNDRAISER_STATUS_LABEL[ctx.status].toLowerCase()} fundraiser can no longer be edited.` };
  }

  if (patch.personalGoal !== undefined) {
    const goalCheck = validateGoal(patch.personalGoal, ctx);
    if (!goalCheck.ok) return goalCheck;
  }
  if (patch.title !== undefined && !patch.title.trim()) {
    return { ok: false, reason: "Give your fundraiser a title." };
  }

  const identityChanged =
    (patch.title !== undefined && patch.title.trim() !== ctx.title) ||
    (patch.type !== undefined && patch.type !== ctx.type);

  // Re-review only matters for something that is already public. A draft or an in-review
  // fundraiser is not live, so an identity edit just stays where it is.
  const requiresReapproval = identityChanged && ctx.status === "ACTIVE";
  return {
    ok: true,
    requiresReapproval,
    nextStatus: requiresReapproval ? "PENDING_REVIEW" : ctx.status,
  };
}

/**
 * Goal validation, including the floor (§8, §18): a goal may never be set below the money
 * already verified against the fundraiser, because that would show it as instantly complete
 * and misrepresent what supporters gave toward.
 */
export function validateGoal(
  goal: number,
  ctx: { verifiedRaised: number; minGoal: number; maxGoal: number },
): { ok: true } | { ok: false; reason: string } {
  if (!Number.isFinite(goal) || !Number.isInteger(goal)) return { ok: false, reason: "Enter your goal in whole dollars." };
  if (goal < ctx.minGoal) return { ok: false, reason: `The smallest goal you can set is ${usd(ctx.minGoal)}.` };
  if (goal > ctx.maxGoal) return { ok: false, reason: `The largest goal you can set is ${usd(ctx.maxGoal)}.` };
  if (goal < ctx.verifiedRaised) {
    return { ok: false, reason: `Your goal can't be lower than the ${usd(ctx.verifiedRaised)} already raised. Set it to ${usd(ctx.verifiedRaised)} or more.` };
  }
  return { ok: true };
}

/** The lowest goal this fundraiser may currently be set to. */
export function goalFloor(ctx: { verifiedRaised: number; minGoal: number }): number {
  return Math.max(ctx.minGoal, ctx.verifiedRaised);
}

/** Configured bounds for a fundraising goal, in whole dollars. */
export const GOAL_MIN = 100;
export const GOAL_MAX = 1_000_000;

function usd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/* ---------------------------------------------------------- type eligibility */

export type CreatorContext = {
  kind: "member" | "supporter";
  /** Member is deactivated / a minor → cannot own a fundraiser at all. */
  eligible: boolean;
  householdId?: string | null;
  /** Holds the household "manage fundraising" permission (or is the household's primary contact). */
  canManageHouseholdFundraising?: boolean;
  /** Ministries the actor may raise for (ministry-scoped leadership, or all for admins). */
  ministryIds?: string[];
  isAdmin?: boolean;
};

/**
 * The types this creator may choose (§5). A Supporter is PERSONAL-only by construction —
 * they have no household, ministry, or team.
 */
export function eligibleTypes(ctx: CreatorContext): FundraiserType[] {
  if (!ctx.eligible) return [];
  if (ctx.kind === "supporter") return ["PERSONAL"];
  const out: FundraiserType[] = ["PERSONAL"];
  if (ctx.isAdmin || (ctx.householdId && ctx.canManageHouseholdFundraising)) out.push("FAMILY");
  if (ctx.isAdmin || (ctx.ministryIds?.length ?? 0) > 0) out.push("MINISTRY");
  return out;
}

export function canCreateType(ctx: CreatorContext, type: FundraiserType): boolean {
  return eligibleTypes(ctx).includes(type);
}

/* ------------------------------------------------------- primary fundraiser */

export type PrimaryCandidate = {
  id: string;
  type: FundraiserType;
  status: FundraiserStatus;
  /** True when this actor owns the fundraiser personally (their own Personal page). */
  isOwn: boolean;
  /** True when this actor may edit it (owner, household permission, ministry leadership). */
  canEdit: boolean;
  /** Verified percent of goal (uncapped). */
  pct: number;
  /** Most recent meaningful activity — used only as a tiebreak. */
  lastActivityAt: Date;
  createdAt: Date;
};

/**
 * Deterministic primary-fundraiser rule (§11): the member's own Personal ACTIVE fundraiser
 * wins; otherwise the ACTIVE one they can edit with the highest verified %; otherwise the most
 * recently active; ties break on the earliest created date. Everything else moves under
 * "Other fundraisers I'm part of".
 */
export function pickPrimary<T extends PrimaryCandidate>(candidates: T[]): { primary: T | null; others: T[] } {
  if (!candidates.length) return { primary: null, others: [] };

  const byCreated = (a: T, b: T) => a.createdAt.getTime() - b.createdAt.getTime();
  const active = candidates.filter((c) => c.status === "ACTIVE");

  const ownPersonal = active.filter((c) => c.isOwn && c.type === "PERSONAL").sort(byCreated);
  const editable = active
    .filter((c) => c.canEdit)
    .sort((a, b) => b.pct - a.pct || byCreated(a, b));
  const recent = [...active].sort(
    (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime() || byCreated(a, b),
  );
  // No ACTIVE fundraiser at all: fall back to whatever the member has in flight, so a
  // pending or returned fundraiser still gets the dashboard's attention. Closed and archived
  // fundraisers are excluded — they are history, not something to lead the dashboard with.
  const inFlight = candidates
    .filter((c) => OPEN_STATUSES.includes(c.status))
    .sort((a, b) => OPEN_STATUSES.indexOf(a.status) - OPEN_STATUSES.indexOf(b.status) || byCreated(a, b));

  const primary = ownPersonal[0] ?? editable[0] ?? recent[0] ?? inFlight[0] ?? null;
  return { primary, others: candidates.filter((c) => c.id !== primary?.id) };
}

/* ----------------------------------------------------------------- milestones */

export const MILESTONES = [25, 50, 75, 100] as const;
export type Milestone = (typeof MILESTONES)[number];

/** Milestones already reached at this verified percentage. */
export function milestonesReached(pct: number): Milestone[] {
  return MILESTONES.filter((m) => pct >= m);
}

/** The next milestone to aim for, or null once the goal is reached. */
export function nextMilestone(pct: number): Milestone | null {
  return MILESTONES.find((m) => pct < m) ?? null;
}

/**
 * Milestones crossed between the previously notified high-water mark and now, so each of
 * 25/50/75/100 notifies exactly once even if a single large gift jumps several at a time.
 */
export function newlyCrossedMilestones(previousNotified: number, pct: number): Milestone[] {
  return MILESTONES.filter((m) => m > previousNotified && pct >= m);
}
