import type { ApprovalStatus } from "@prisma/client";
import { type Actor, canReviewContent } from "./rbac";

/** Allowed status transitions for approvable content (announcements, events). */
const ALLOWED: Record<ApprovalStatus, ApprovalStatus[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["WITHDRAWN"],
  REJECTED: [],
  WITHDRAWN: [],
};

export function canTransition(from: ApprovalStatus, to: ApprovalStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export class InvalidTransitionError extends Error { constructor(m: string){ super(m); this.name="InvalidTransitionError"; } }
export class ReviewValidationError extends Error { constructor(m: string){ super(m); this.name="ReviewValidationError"; } }

export type ReviewDecision =
  | { action: "approve" }
  | { action: "reject"; reason: string }
  | { action: "withdraw" };

export type Reviewable = { status: ApprovalStatus; createdById: string; version: number };

export type ReviewPatch = {
  status: ApprovalStatus;
  reviewedById: string;
  reviewedAt: Date;
  rejectReason: string | null;
  version: number;
};

/**
 * Validate a review decision and compute the DB patch. Pure & DB-free so both
 * announcements and events reuse it and it is fully unit-testable. The atomic DB
 * write must still guard concurrency with `where: { id, version: expectedVersion }`.
 */
export function reviewDecision(
  actor: Actor,
  item: Reviewable,
  decision: ReviewDecision,
  opts: { expectedVersion: number; allowSelfApproval?: boolean }
): ReviewPatch {
  if (!canReviewContent(actor)) throw new ReviewValidationError("NOT_A_REVIEWER");
  if (item.version !== opts.expectedVersion) throw new ReviewValidationError("STALE_VERSION");

  const to: ApprovalStatus =
    decision.action === "approve" ? "APPROVED" :
    decision.action === "reject" ? "REJECTED" : "WITHDRAWN";

  if (!canTransition(item.status, to)) throw new InvalidTransitionError(`${item.status}->${to}`);
  if (decision.action === "reject" && !decision.reason.trim()) throw new ReviewValidationError("REASON_REQUIRED");
  if (decision.action === "approve" && !opts.allowSelfApproval && actor.userId === item.createdById) {
    throw new ReviewValidationError("SELF_APPROVAL_FORBIDDEN");
  }

  return {
    status: to,
    reviewedById: actor.userId,
    reviewedAt: new Date(),
    rejectReason: decision.action === "reject" ? decision.reason.trim() : null,
    version: item.version + 1,
  };
}
