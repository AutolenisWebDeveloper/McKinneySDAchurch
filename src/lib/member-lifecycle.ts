/**
 * Pure helpers for admin member & household lifecycle management (status labels, account-access
 * derivation, and the hard-delete safety gate). No DB access here — the transactional service
 * lives in `member-admin.ts`. Kept pure so the rules are unit-testable.
 */

export const MEMBERSHIP_STATUSES = ["ACTIVE", "MISSING", "REMOVED", "TRANSFERRED_OUT", "DECEASED"] as const;
export type MembershipStatusValue = (typeof MEMBERSHIP_STATUSES)[number];

export const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatusValue, string> = {
  ACTIVE: "Active",
  MISSING: "Missing",
  REMOVED: "Removed",
  TRANSFERRED_OUT: "Transferred out",
  DECEASED: "Deceased",
};

/** The access state of a member's login, for display and to decide which control to show. */
export type AccountAccessState = "no-login" | "pending" | "active" | "disabled";

export function memberAccessState(
  m: { user: { activatedAt: Date | null; disabledAt: Date | null } | null },
): AccountAccessState {
  if (!m.user) return "no-login";
  if (m.user.disabledAt) return "disabled";
  if (!m.user.activatedAt) return "pending";
  return "active";
}

export const ACCESS_STATE_LABEL: Record<AccountAccessState, string> = {
  "no-login": "No login",
  pending: "Pending sign-in",
  active: "Active",
  disabled: "Disabled",
};

/** App-level deactivation is a simple reversible flag on Member/Household. */
export function isDeactivated(e: { deactivatedAt: Date | null }): boolean {
  return e.deactivatedAt != null;
}

/**
 * Permanent deletion is a deliberate two-step: an entity must be **deactivated first** before it
 * can be hard-deleted. This prevents a single mis-click from destroying a live member/household
 * and their history; the admin has to consciously deactivate, then delete.
 */
export function canHardDelete(e: { deactivatedAt: Date | null }): boolean {
  return e.deactivatedAt != null;
}
