import type { WorkItemStatus } from "@prisma/client";

/**
 * Pure WorkItem lifecycle logic (no I/O) — the shared spine for CARE, PRAYER,
 * LEADERSHIP_MESSAGE, SUPPORT, VOLUNTEER, SPONSOR and CONTACT (§15). Domains may layer
 * extra rules on top, but every domain reuses these base transitions and guards so
 * status handling is implemented and tested once.
 *
 * The atomic DB write that applies a transition must still guard concurrency (e.g.
 * `where: { id, updatedAt: expectedUpdatedAt }`) and append an immutable WorkItemEvent.
 */

/** Allowed base transitions. CLOSED is terminal; RESOLVED may be reopened to FOLLOW_UP. */
const ALLOWED: Record<WorkItemStatus, WorkItemStatus[]> = {
  NEW: ["TRIAGED", "ASSIGNED", "NEEDS_INFO", "CLOSED"],
  TRIAGED: ["ASSIGNED", "IN_PROGRESS", "NEEDS_INFO", "CLOSED"],
  ASSIGNED: ["IN_PROGRESS", "FOLLOW_UP", "NEEDS_INFO", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["FOLLOW_UP", "NEEDS_INFO", "RESOLVED", "CLOSED"],
  FOLLOW_UP: ["IN_PROGRESS", "NEEDS_INFO", "RESOLVED", "CLOSED"],
  NEEDS_INFO: ["TRIAGED", "ASSIGNED", "IN_PROGRESS", "CLOSED"],
  RESOLVED: ["FOLLOW_UP", "CLOSED"],
  CLOSED: [],
};

export const TERMINAL_STATUSES: WorkItemStatus[] = ["CLOSED"];
export const CLOSING_STATUSES: WorkItemStatus[] = ["RESOLVED", "CLOSED"];

export function canTransition(from: WorkItemStatus, to: WorkItemStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function isTerminal(status: WorkItemStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export class WorkflowError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
    this.name = "WorkflowError";
  }
}

export type TransitionInput = {
  /** Assignee after the transition (required to enter ASSIGNED). */
  assigneeUserId?: string | null;
  /** Human reason recorded on the event and, for closings, persisted as closeReason. */
  reason?: string | null;
  /** Follow-up date (required to enter FOLLOW_UP). */
  followUpAt?: Date | null;
};

export type TransitionResult =
  | { ok: true; patch: TransitionPatch }
  | { ok: false; code: string };

export type TransitionPatch = {
  status: WorkItemStatus;
  assigneeUserId?: string | null;
  closeReason?: string | null;
  followUpAt?: Date | null;
  closedAt?: Date | null;
};

/**
 * Validate a transition and compute the DB patch. Returns a discriminated result rather
 * than throwing so callers can surface a friendly message; use `assertTransition` when a
 * throw is preferred.
 *
 * Guards:
 *  - ASSIGNED   requires an assignee.
 *  - FOLLOW_UP  requires a followUpAt date.
 *  - NEEDS_INFO requires a reason (what information is needed).
 *  - RESOLVED / CLOSED require a closing reason.
 */
export function evaluateTransition(
  from: WorkItemStatus,
  to: WorkItemStatus,
  input: TransitionInput = {},
  now: Date = new Date(),
): TransitionResult {
  if (from === to) return { ok: false, code: "NO_OP" };
  if (!canTransition(from, to)) return { ok: false, code: "ILLEGAL_TRANSITION" };

  const reason = input.reason?.trim() || "";

  if (to === "ASSIGNED" && !input.assigneeUserId) {
    return { ok: false, code: "ASSIGNEE_REQUIRED" };
  }
  if (to === "FOLLOW_UP" && !input.followUpAt) {
    return { ok: false, code: "FOLLOW_UP_DATE_REQUIRED" };
  }
  if (to === "NEEDS_INFO" && !reason) {
    return { ok: false, code: "REASON_REQUIRED" };
  }
  if ((to === "RESOLVED" || to === "CLOSED") && !reason) {
    return { ok: false, code: "CLOSE_REASON_REQUIRED" };
  }

  const patch: TransitionPatch = { status: to };
  if (to === "ASSIGNED") patch.assigneeUserId = input.assigneeUserId ?? null;
  if (to === "FOLLOW_UP") patch.followUpAt = input.followUpAt ?? null;
  if (to === "RESOLVED" || to === "CLOSED") patch.closeReason = reason;
  patch.closedAt = to === "CLOSED" ? now : null;

  return { ok: true, patch };
}

/** Throwing wrapper around evaluateTransition for server actions that prefer exceptions. */
export function assertTransition(
  from: WorkItemStatus,
  to: WorkItemStatus,
  input: TransitionInput = {},
  now: Date = new Date(),
): TransitionPatch {
  const res = evaluateTransition(from, to, input, now);
  if (!res.ok) throw new WorkflowError(res.code);
  return res.patch;
}
