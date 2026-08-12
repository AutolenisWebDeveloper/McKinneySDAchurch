import type { EventStatus } from "@prisma/client";

/**
 * The governed calendar-event lifecycle — pure, dependency-free, and fully unit-tested. The
 * generic `approval.ts` (PENDING/APPROVED/REJECTED/WITHDRAWN) that Announcements use is too coarse
 * for events, which need an explicit editorial pipeline where **approval and publication are
 * distinct states**. This module is the single source of truth for which transitions are legal
 * and who may perform them; the service layer (src/lib/events.ts) does the DB + audit + notify,
 * and authorization is enforced in src/lib/rbac.ts. UI never decides transitions on its own.
 *
 *   DRAFT ─submit→ SUBMITTED ─start_review→ UNDER_REVIEW
 *     │               │  │                     │  │  │
 *     │               │  │                     │  │  └─reject→ REJECTED
 *     │               │  │                     │  └─request_changes→ CHANGES_REQUESTED ─submit→ SUBMITTED
 *     │               │  └─approve→ APPROVED ──publish→ PUBLISHED
 *     │               └─(approve/reject/request_changes also reachable directly from SUBMITTED)
 *     └─discard→ ARCHIVED
 *
 *   APPROVED ─publish→ PUBLISHED ─unpublish→ APPROVED
 *   APPROVED|PUBLISHED ─cancel→ CANCELLED ;  ─request_changes→ CHANGES_REQUESTED
 */

/** Who is performing an action. Reviewer = Admin/Pastor; owner = the department head who owns
 *  the event's department (or an admin acting on their behalf). */
export type ActorKind = "owner" | "reviewer";

export type EventAction =
  | "submit" // owner sends a draft / returns a changes-requested event to admin
  | "start_review" // reviewer picks it up
  | "request_changes" // reviewer returns it with comments
  | "approve" // reviewer approves (NOT yet public)
  | "reject" // reviewer declines
  | "publish" // reviewer makes it publicly visible
  | "unpublish" // reviewer pulls it back to approved-but-private
  | "cancel" // reviewer calls off a scheduled event
  | "discard" // owner abandons a draft / changes-requested event
  | "archive"; // reviewer retires a non-public event from active queues

type TransitionSpec = {
  from: EventStatus[];
  to: EventStatus;
  by: ActorKind;
  /** A free-text comment is mandatory (e.g. changes requested / rejection reason). */
  requiresComment?: boolean;
};

/** The complete, legal transition graph. Nothing outside this table is permitted. */
export const EVENT_TRANSITIONS: Record<EventAction, TransitionSpec> = {
  submit: { from: ["DRAFT", "CHANGES_REQUESTED"], to: "SUBMITTED", by: "owner" },
  start_review: { from: ["SUBMITTED"], to: "UNDER_REVIEW", by: "reviewer" },
  request_changes: {
    from: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "PUBLISHED"],
    to: "CHANGES_REQUESTED",
    by: "reviewer",
    requiresComment: true,
  },
  approve: { from: ["SUBMITTED", "UNDER_REVIEW"], to: "APPROVED", by: "reviewer" },
  reject: { from: ["SUBMITTED", "UNDER_REVIEW"], to: "REJECTED", by: "reviewer", requiresComment: true },
  publish: { from: ["APPROVED"], to: "PUBLISHED", by: "reviewer" },
  unpublish: { from: ["PUBLISHED"], to: "APPROVED", by: "reviewer" },
  cancel: { from: ["APPROVED", "PUBLISHED"], to: "CANCELLED", by: "reviewer" },
  discard: { from: ["DRAFT", "CHANGES_REQUESTED"], to: "ARCHIVED", by: "owner" },
  archive: { from: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"], to: "ARCHIVED", by: "reviewer" },
};

export const ALL_EVENT_STATUSES: EventStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "PUBLISHED",
  "REJECTED",
  "CANCELLED",
  "ARCHIVED",
];

/** Terminal states carry no outgoing action for that actor kind but are never hard-deleted. */
export const TERMINAL_STATUSES: EventStatus[] = ["REJECTED", "ARCHIVED"];

export class EventTransitionError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.name = "EventTransitionError";
    this.code = code;
  }
}

/** Is this action legal from `status` for this actor kind? (comment content not considered) */
export function canDoEventAction(status: EventStatus, action: EventAction, by: ActorKind): boolean {
  const spec = EVENT_TRANSITIONS[action];
  if (!spec) return false;
  if (spec.by !== by) return false;
  return spec.from.includes(status);
}

/** Every action `by` may take from `status`, in a stable order (drives the UI action set). */
export function allowedEventActions(status: EventStatus, by: ActorKind): EventAction[] {
  return (Object.keys(EVENT_TRANSITIONS) as EventAction[]).filter((a) => canDoEventAction(status, a, by));
}

export type EventLike = { status: EventStatus; createdById: string; version: number };

export type EvaluatedTransition = {
  action: EventAction;
  from: EventStatus;
  to: EventStatus;
  comment: string | null;
};

/**
 * Validate an action against the graph and return the resolved transition, or throw
 * EventTransitionError. Pure: the caller performs the version-guarded DB write.
 *
 * `actor` is identified only by id + kind here; role authorization is enforced separately in
 * rbac.ts. We still encode two domain rules that belong to the state machine itself:
 *  - a mandatory comment for `request_changes` / `reject`;
 *  - separation of duties: the same person cannot `approve` (or `publish`) content they authored,
 *    unless governance explicitly allows it (`allowSelfReview`).
 */
export function evaluateEventAction(
  item: EventLike,
  action: EventAction,
  actor: { userId: string; kind: ActorKind },
  opts: { expectedVersion?: number; comment?: string | null; allowSelfReview?: boolean } = {},
): EvaluatedTransition {
  const spec = EVENT_TRANSITIONS[action];
  if (!spec) throw new EventTransitionError("UNKNOWN_ACTION");
  if (spec.by !== actor.kind) throw new EventTransitionError("WRONG_ACTOR");
  if (opts.expectedVersion !== undefined && item.version !== opts.expectedVersion) {
    throw new EventTransitionError("STALE_VERSION");
  }
  if (!spec.from.includes(item.status)) {
    throw new EventTransitionError(`INVALID_TRANSITION:${item.status}->${spec.to}`);
  }
  const comment = (opts.comment ?? "").trim();
  if (spec.requiresComment && !comment) throw new EventTransitionError("COMMENT_REQUIRED");
  if ((action === "approve" || action === "publish") && !opts.allowSelfReview && actor.userId === item.createdById) {
    throw new EventTransitionError("SELF_REVIEW_FORBIDDEN");
  }
  return { action, from: item.status, to: spec.to, comment: comment || null };
}

// ---------------------------------------------------------------------------
// Public visibility — approval ≠ publication.
// ---------------------------------------------------------------------------

/** The ONLY status that is publicly listed/discoverable. Approved-but-unpublished stays private. */
export function isPubliclyListed(status: EventStatus): boolean {
  return status === "PUBLISHED";
}

/** Statuses reachable at a public canonical URL: a live event, or a cancelled one so attendees
 *  who hold the link still learn it was called off. Everything else 404s publicly. */
export function isPubliclyReachable(status: EventStatus): boolean {
  return status === "PUBLISHED" || status === "CANCELLED";
}

// ---------------------------------------------------------------------------
// Presentation helpers (labels + semantic tone) — color is never the only signal.
// ---------------------------------------------------------------------------

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
};

export type StatusTone = "neutral" | "info" | "warn" | "success" | "danger" | "muted";

export const EVENT_STATUS_TONE: Record<EventStatus, StatusTone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  UNDER_REVIEW: "info",
  CHANGES_REQUESTED: "warn",
  APPROVED: "success",
  PUBLISHED: "success",
  REJECTED: "danger",
  CANCELLED: "danger",
  ARCHIVED: "muted",
};

/** Human label for an action, for buttons and the history timeline. */
export const EVENT_ACTION_LABEL: Record<EventAction, string> = {
  submit: "Submit for approval",
  start_review: "Start review",
  request_changes: "Request changes",
  approve: "Approve",
  reject: "Reject",
  publish: "Publish",
  unpublish: "Unpublish",
  cancel: "Cancel event",
  discard: "Discard",
  archive: "Archive",
};
