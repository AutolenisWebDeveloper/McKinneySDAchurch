import type { TransferStatus } from "@prisma/client";

/**
 * Membership transfer lifecycle (§29). eAdventist remains the system of record; this is a
 * convenience queue. Pure logic (no I/O) so transitions are deterministic and unit-tested.
 *
 * Flow:
 *   Transfer IN  (public)              → SUBMITTED → IN_REVIEW → HANDED_TO_EADVENTIST → COMPLETED
 *   Transfer OUT (member self-service) → SUBMITTED → IN_REVIEW → …
 *   Transfer OUT (leadership on behalf)→ AWAITING_MEMBER_CONFIRMATION → (member confirms) IN_REVIEW
 *                                                                     → (member denies)  DISPUTED
 * DISPUTED locks ordinary clerk processing; only leadership may resolve it.
 */
const ALLOWED: Record<TransferStatus, TransferStatus[]> = {
  SUBMITTED: ["AWAITING_MEMBER_CONFIRMATION", "IN_REVIEW", "NEEDS_INFO", "DECLINED", "WITHDRAWN"],
  AWAITING_MEMBER_CONFIRMATION: ["IN_REVIEW", "DISPUTED", "NEEDS_INFO", "WITHDRAWN"],
  IN_REVIEW: ["HANDED_TO_EADVENTIST", "NEEDS_INFO", "DECLINED", "WITHDRAWN"],
  NEEDS_INFO: ["IN_REVIEW", "SUBMITTED", "DECLINED", "WITHDRAWN"],
  HANDED_TO_EADVENTIST: ["COMPLETED", "WITHDRAWN"],
  DISPUTED: ["IN_REVIEW", "DECLINED", "WITHDRAWN"], // leadership-only resolution
  COMPLETED: [],
  DECLINED: [],
  WITHDRAWN: [],
};

export function canTransferTransition(from: TransferStatus, to: TransferStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export const TRANSFER_PIPELINE: TransferStatus[] = [
  "SUBMITTED", "IN_REVIEW", "HANDED_TO_EADVENTIST", "COMPLETED",
];

/** Terminal states — no further processing. */
export function isTransferTerminal(status: TransferStatus): boolean {
  return status === "COMPLETED" || status === "DECLINED" || status === "WITHDRAWN";
}

/**
 * DISPUTED locks ordinary clerk processing — only leadership (Pastor/Admin/Elder) may act on it.
 * A denied member confirmation lands here and must be reviewed before anything else happens.
 */
export function isOrdinaryProcessingLocked(status: TransferStatus): boolean {
  return status === "DISPUTED";
}

/**
 * A leadership-on-behalf OUTGOING transfer must be confirmed by the member before it can be
 * processed. Self-initiated (MEMBER) and INCOMING transfers do not require confirmation.
 */
export function requiresMemberConfirmation(input: {
  direction: "INCOMING" | "OUTGOING";
  onBehalf: boolean;
}): boolean {
  return input.direction === "OUTGOING" && input.onBehalf;
}

/** The status a new transfer starts in, given how it was initiated. */
export function initialTransferStatus(input: {
  direction: "INCOMING" | "OUTGOING";
  onBehalf: boolean;
}): TransferStatus {
  return requiresMemberConfirmation(input) ? "AWAITING_MEMBER_CONFIRMATION" : "SUBMITTED";
}
