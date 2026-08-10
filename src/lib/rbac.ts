import type { Role, WorkItemType, WorkItemConfidentiality } from "@prisma/client";
import { routeWorkItem } from "./routing";

/**
 * Centralized authorization. This is the ONLY place authorization decisions are made.
 * requireRole()/hasRole() gate by role; resource policies add ownership/scoping; can()
 * is the central action policy used by Phase-1+ code. Deny by default.
 *
 * Multi-role: an Actor may hold several active roles (MEMBER + ELDER + MINISTRY_HEAD).
 * Authorization derives from the FULL active role set, never from the active portal (§14).
 * Single-role callers (legacy) that set only `role` still work — `roles`/`ministryIds`
 * fall back to `[role]`/`[ministryId]`.
 */

export type Actor = {
  userId: string;
  /** Legacy/primary role, kept for back-compat and default-portal selection. */
  role: Role;
  /** All active roles (authorization source of truth). Falls back to [role] when absent. */
  roles?: Role[];
  /** Legacy single ministry scope. */
  ministryId?: string | null;
  /** Every ministry in which the actor holds a ministry-scoped role. Falls back to [ministryId]. */
  ministryIds?: string[];
  memberId?: string | null;
  householdId?: string | null;
  primaryRole?: Role | null;
};

export class ForbiddenError extends Error {
  constructor(msg = "Forbidden") { super(msg); this.name = "ForbiddenError"; }
}

/** The actor's full active role set (multi-role aware, back-compat safe). */
export function actorRoles(a: Actor): Role[] {
  return a.roles && a.roles.length ? a.roles : [a.role];
}

/** Every ministry the actor is scoped to via a ministry-scoped role. */
export function ministryScope(a: Actor): string[] {
  if (a.ministryIds && a.ministryIds.length) return a.ministryIds;
  return a.ministryId ? [a.ministryId] : [];
}

export function hasRole(actor: Actor, ...roles: Role[]): boolean {
  const owned = actorRoles(actor);
  return roles.some((r) => owned.includes(r));
}
export function requireRole(actor: Actor, ...roles: Role[]): void {
  if (!hasRole(actor, ...roles)) throw new ForbiddenError();
}

const isAdmin = (a: Actor) => hasRole(a, "ADMIN", "PASTOR");
const isLeadership = (a: Actor) => hasRole(a, "PASTOR", "ELDER", "ADMIN");

/* ---- Content: ministry heads own only their ministry's items ---- */
export function canManageAnnouncement(a: Actor, res: { ministryId: string; createdById?: string }): boolean {
  if (isAdmin(a)) return true;
  return hasRole(a, "MINISTRY_HEAD") && ministryScope(a).includes(res.ministryId);
}
export const canManageEvent = canManageAnnouncement;
export const canReviewContent = (a: Actor) => isAdmin(a); // approve/reject/publish

/* ---- People & sensitive data ---- */
export const canReadMember = (a: Actor) => isAdmin(a) || hasRole(a, "CLERK");
export const canReadPrayerRequest = (a: Actor) => isAdmin(a);
export const canReadBoardMinutes = (a: Actor) => isAdmin(a) || hasRole(a, "CLERK");
export const canManageTransfer = (a: Actor) => isAdmin(a) || hasRole(a, "CLERK");
export const canManageScreening = (a: Actor) => isAdmin(a) || hasRole(a, "CLERK");
export const canManageGiving = (a: Actor) => isAdmin(a) || hasRole(a, "TREASURER");

/* ---- Minors: only a guardian in the same household (or admin/pastor) ---- */
export function canManageDependent(
  a: Actor,
  minor: { householdId?: string | null; guardianMemberId?: string | null }
): boolean {
  if (isAdmin(a)) return true;
  return (
    hasRole(a, "MEMBER") &&
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

/* =====================================================================================
 * WorkItem authorization (§15/§16/§24). A requester always sees their own item. Staff
 * access derives from the routing roles for the item's type, further restricted by the
 * item's confidentiality. Confidentiality is policy-driven, so not every Elder sees every
 * pastoral record automatically.
 * ===================================================================================== */

export type WorkItemRef = {
  type: WorkItemType;
  ministryId?: string | null;
  confidentiality?: WorkItemConfidentiality;
  assigneeUserId?: string | null;
  requesterUserId?: string | null;
};

function rolesAllowedForItem(item: WorkItemRef): Role[] {
  const { roles } = routeWorkItem(item.type, { ministryId: item.ministryId });
  if (item.confidentiality === "LEADERSHIP_ONLY") {
    return roles.filter((r) => r === "PASTOR" || r === "ELDER" || r === "ADMIN");
  }
  return roles;
}

/** True if the actor may READ the item (requester, assignee, or a routing role). */
export function canReadWorkItem(a: Actor, item: WorkItemRef): boolean {
  if (item.requesterUserId && item.requesterUserId === a.userId) return true;
  if (item.assigneeUserId && item.assigneeUserId === a.userId) return true;
  const allowed = rolesAllowedForItem(item);
  if (hasRole(a, ...allowed)) {
    // Ministry-scoped access (e.g. a MINISTRY_HEAD routed a volunteer app) needs matching scope.
    if (hasRole(a, "MINISTRY_HEAD") && !isLeadership(a) && !hasRole(a, "ADMIN")) {
      return !!item.ministryId && ministryScope(a).includes(item.ministryId);
    }
    return true;
  }
  return false;
}

/** True if the actor may TRIAGE/ASSIGN/NOTE/manage the item's lifecycle (staff, not the requester alone). */
export function canManageWorkItem(a: Actor, item: WorkItemRef): boolean {
  const allowed = rolesAllowedForItem(item);
  if (!hasRole(a, ...allowed)) return false;
  if (hasRole(a, "MINISTRY_HEAD") && !isLeadership(a) && !hasRole(a, "ADMIN")) {
    return !!item.ministryId && ministryScope(a).includes(item.ministryId);
  }
  return true;
}

/** True if the actor may post a message on the item (requester or managing staff). */
export function canMessageWorkItem(a: Actor, item: WorkItemRef): boolean {
  if (item.requesterUserId && item.requesterUserId === a.userId) return true;
  return canManageWorkItem(a, item);
}

/** Only Admin/Pastor manage role assignments (§13A). */
export const canManageRoles = (a: Actor) => isAdmin(a);

/**
 * Central action policy. Deny by default. New Phase-1+ code should call `can()` rather than
 * scattering role checks. `resource` shape depends on the action.
 */
export type Action =
  | "care.read" | "care.manage"
  | "prayer.read" | "prayer.manage"
  | "workitem.read" | "workitem.manage" | "workitem.message"
  | "announcement.approve"
  | "member.manage"
  | "transfer.manage"
  | "minutes.read"
  | "role.manage"
  | "giving.manage";

export function can(actor: Actor, action: Action, resource?: WorkItemRef): boolean {
  switch (action) {
    case "care.read":
    case "prayer.read":
    case "workitem.read":
      return resource ? canReadWorkItem(actor, resource) : false;
    case "care.manage":
    case "prayer.manage":
    case "workitem.manage":
      return resource ? canManageWorkItem(actor, resource) : false;
    case "workitem.message":
      return resource ? canMessageWorkItem(actor, resource) : false;
    case "announcement.approve":
      return canReviewContent(actor);
    case "member.manage":
      return canReadMember(actor);
    case "transfer.manage":
      return canManageTransfer(actor);
    case "minutes.read":
      return canReadBoardMinutes(actor);
    case "role.manage":
      return canManageRoles(actor);
    case "giving.manage":
      return canManageGiving(actor);
    default:
      return false;
  }
}
