import type { Role } from "@prisma/client";

/**
 * Centralized authorization. requireRole() gates by role; the resource policies
 * add ownership/scoping. These are the ONLY place authorization decisions are made.
 * Public-facing queries additionally filter APPROVED + publishAt<=now elsewhere.
 */

export type Actor = {
  userId: string;
  role: Role;
  ministryId?: string | null;
  memberId?: string | null;
  householdId?: string | null;
};

export class ForbiddenError extends Error {
  constructor(msg = "Forbidden") { super(msg); this.name = "ForbiddenError"; }
}

export function hasRole(actor: Actor, ...roles: Role[]): boolean {
  return roles.includes(actor.role);
}
export function requireRole(actor: Actor, ...roles: Role[]): void {
  if (!hasRole(actor, ...roles)) throw new ForbiddenError();
}

const isAdmin = (a: Actor) => a.role === "ADMIN" || a.role === "PASTOR";

/* ---- Content: ministry heads own only their ministry's items ---- */
export function canManageAnnouncement(a: Actor, res: { ministryId: string; createdById?: string }): boolean {
  if (isAdmin(a)) return true;
  return a.role === "MINISTRY_HEAD" && a.ministryId === res.ministryId;
}
export const canManageEvent = canManageAnnouncement;
export const canReviewContent = (a: Actor) => isAdmin(a); // approve/reject/publish

/* ---- People & sensitive data ---- */
export const canReadMember = (a: Actor) =>
  isAdmin(a) || a.role === "CLERK";
export const canReadPrayerRequest = (a: Actor) => isAdmin(a);
export const canReadBoardMinutes = (a: Actor) => isAdmin(a) || a.role === "CLERK";
export const canManageTransfer = (a: Actor) => isAdmin(a) || a.role === "CLERK";
export const canManageScreening = (a: Actor) => isAdmin(a) || a.role === "CLERK";
export const canManageGiving = (a: Actor) => isAdmin(a) || a.role === "TREASURER";

/* ---- Minors: only a guardian in the same household (or admin/pastor) ---- */
export function canManageDependent(
  a: Actor,
  minor: { householdId?: string | null; guardianMemberId?: string | null }
): boolean {
  if (isAdmin(a)) return true;
  return (
    a.role === "MEMBER" &&
    !!a.householdId &&
    a.householdId === minor.householdId &&
    a.memberId === minor.guardianMemberId
  );
}

/* ---- Safeguarding gate: no assignment to minor-facing roles without a live clearance ---- */
export type Screening = { status: string; expiresAt: Date | null } | null | undefined;
export function isScreeningCurrent(s: Screening, now = new Date()): boolean {
  return !!s && s.status === "CLEARED" && !!s.expiresAt && s.expiresAt > now;
}
/** Gate every assignment to a minor-facing ministry, Sabbath School division, or youth club. */
export function canScheduleWithMinors(_a: Actor, screening: Screening, now = new Date()): boolean {
  return isScreeningCurrent(screening, now);
}
