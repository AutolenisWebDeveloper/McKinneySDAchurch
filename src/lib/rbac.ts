import type { Role, WorkItemType, WorkItemConfidentiality, DocumentVisibility } from "@prisma/client";
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

/* ---- Calendar: governed events (§Calendar) ----
 * "Owner" work (create/edit/save-draft/submit/discard) is scoped to a department the actor
 * heads; Admin/Pastor own every department. "Reviewer" work (start review / request changes /
 * approve / reject / publish / unpublish / cancel) is Admin/Pastor only — a department head can
 * never approve or publish, which enforces the separation the calendar workflow requires. */

/** May create/edit/save-draft/submit an event for this department. */
export const canManageEventForMinistry = (a: Actor, ministryId: string) =>
  canManageEvent(a, { ministryId });

/** May take reviewer actions on events (approve / reject / request changes / publish / cancel). */
export const canReviewEvent = (a: Actor) => isAdmin(a);

/** May make an approved event publicly visible (or pull it back). */
export const canPublishEvent = (a: Actor) => isAdmin(a);

/** Every department id the actor may submit/own events for. Admin/Pastor → null (means "all"). */
export function eventOwnerScope(a: Actor): { all: boolean; ministryIds: string[] } {
  if (isAdmin(a)) return { all: true, ministryIds: [] };
  return { all: false, ministryIds: ministryScope(a) };
}

/**
 * How this actor relates to a given event, if at all: a "reviewer" (Admin/Pastor), an "owner"
 * (department head of the event's department), or null (no access). Reviewer wins when the actor
 * is both. The service uses this to pick the correct set of state-machine transitions.
 */
export function eventActorKind(
  a: Actor,
  event: { ministryId: string },
): "reviewer" | "owner" | null {
  if (canReviewEvent(a)) return "reviewer";
  if (hasRole(a, "MINISTRY_HEAD") && ministryScope(a).includes(event.ministryId)) return "owner";
  return null;
}

/* ---- People & sensitive data ---- */
export const canReadMember = (a: Actor) => isAdmin(a) || hasRole(a, "CLERK");
export const canReadPrayerRequest = (a: Actor) => isAdmin(a);
export const canReadBoardMinutes = (a: Actor) => isAdmin(a) || hasRole(a, "CLERK");
export const canManageTransfer = (a: Actor) => isAdmin(a) || hasRole(a, "CLERK");
export const canManageScreening = (a: Actor) => isAdmin(a) || hasRole(a, "CLERK");
export const canManageGiving = (a: Actor) => isAdmin(a) || hasRole(a, "TREASURER");

/* ---- Governance & official records (mirror the checks currently inlined at call sites) ---- */
/** Committees are managed by the church office (Admin/Pastor/Clerk). */
export const canManageCommittee = (a: Actor) => isAdmin(a) || hasRole(a, "CLERK");
/** Board/business-meeting minutes are approved by Admin/Pastor. */
export const canApproveMinutes = (a: Actor) => isAdmin(a);
/** Leadership creates an OUTGOING transfer on behalf of a member (§29). */
export const canCreateTransferOnBehalf = (a: Actor) => isLeadership(a) || hasRole(a, "CLERK");
/** A DISPUTED transfer may only be resolved by leadership, never an ordinary clerk. */
export const canOverrideTransferDispute = (a: Actor) => isLeadership(a);

/* ---- Admin surfaces (Church Manual, email templates, CMS, account requests) ---- */
export const canManageManual = (a: Actor) => isAdmin(a);
export const canManageEmailTemplate = (a: Actor) => isAdmin(a);
export const canPublishCms = (a: Actor) => isAdmin(a);
export const canReviewAccountRequest = (a: Actor) => isAdmin(a);

/* ---- Documents: read is visibility-gated; management is Admin/Pastor (§34) ---- */
export type DocumentRef = { visibility: DocumentVisibility };
/** Read/download a stored document. PUBLIC → any actor; MEMBERS_ONLY → any member/staff;
 *  ADMIN_ONLY → Admin/Pastor. (Download signs a URL only after this returns true.) */
export function canReadDocument(a: Actor, doc: DocumentRef): boolean {
  switch (doc.visibility) {
    case "PUBLIC":
      return true;
    case "MEMBERS_ONLY":
      return hasRole(a, "MEMBER", "MINISTRY_HEAD", "ELDER", "CLERK", "TREASURER", "ADMIN", "PASTOR");
    case "ADMIN_ONLY":
      return isAdmin(a);
    default:
      return false;
  }
}
/** Upload / replace / archive / delete a document. */
export const canManageDocument = (a: Actor) => isAdmin(a);

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

/* =====================================================================================
 * Fundraising — My Building Fundraiser (§5, §8, §10, §16). Ownership is polymorphic by
 * fundraiser type, so "can this actor act on this fundraiser" is decided here rather than
 * inline at each route. A Supporter is NEVER an Actor: a non-member reaches only their own
 * fundraiser through a scoped magic-link session (see lib/supporter-auth.ts), so nothing in
 * this module can grant a Supporter member-portal access.
 * ===================================================================================== */

export type FundraiserRef = {
  type: "PERSONAL" | "FAMILY" | "MINISTRY";
  ownerUserId?: string | null;
  householdId?: string | null;
  ministryId?: string | null;
  supporterId?: string | null;
};

/** A member's own eligibility to own a fundraiser at all. Minors never qualify (safeguarding). */
export type FundraiserEligibility = {
  isMinor?: boolean;
  deactivatedAt?: Date | null;
};

export function canCreateFundraiser(a: Actor, member: FundraiserEligibility | null | undefined): boolean {
  // Decision (§5, default): any authenticated, non-minor member whose record is active.
  // Admin/Pastor may always act, including on behalf of the campaign.
  if (isAdmin(a)) return true;
  if (!hasRole(a, "MEMBER")) return false;
  if (!member) return false;
  return !member.isMinor && !member.deactivatedAt;
}

/** May this actor create a FAMILY fundraiser for this household? (§10) */
export function canManageHouseholdFundraising(
  a: Actor,
  household: { id: string; primaryContactId?: string | null } | null | undefined,
  member: { id: string; canManageHouseholdFundraising?: boolean } | null | undefined,
): boolean {
  if (isAdmin(a)) return true;
  if (!household || !member) return false;
  if (a.householdId !== household.id) return false;
  return !!member.canManageHouseholdFundraising || household.primaryContactId === member.id;
}

/** May this actor raise on behalf of this ministry/team? Mirrors the calendar's owner scope. */
export function canManageFundraiserForMinistry(a: Actor, ministryId: string): boolean {
  if (isAdmin(a)) return true;
  return hasRole(a, "MINISTRY_HEAD") && ministryScope(a).includes(ministryId);
}

/**
 * May this actor EDIT the fundraiser (change goal/story/graphic/date, submit, close)?
 * A Supporter-owned fundraiser is never editable by a member actor — only by an admin, or by
 * the Supporter through their own scoped session.
 */
export function canEditFundraiser(
  a: Actor,
  f: FundraiserRef,
  ctx: { member?: { id: string; canManageHouseholdFundraising?: boolean } | null; household?: { id: string; primaryContactId?: string | null } | null } = {},
): boolean {
  if (isAdmin(a)) return true;
  switch (f.type) {
    case "PERSONAL":
      return !f.supporterId && !!f.ownerUserId && f.ownerUserId === a.userId;
    case "FAMILY":
      return !!f.householdId && canManageHouseholdFundraising(a, ctx.household ?? (f.householdId ? { id: f.householdId } : null), ctx.member ?? null);
    case "MINISTRY":
      return !!f.ministryId && canManageFundraiserForMinistry(a, f.ministryId);
    default:
      return false;
  }
}

/**
 * May this actor SEE and SHARE the fundraiser from inside the portal? Broader than edit: every
 * household member can view/share their family's fundraiser, and every member of a ministry
 * can view/share the ministry's, even without edit rights (§10).
 */
export function canViewFundraiser(a: Actor, f: FundraiserRef, ctx: Parameters<typeof canEditFundraiser>[2] = {}): boolean {
  if (canEditFundraiser(a, f, ctx)) return true;
  if (f.type === "FAMILY") return !!f.householdId && f.householdId === a.householdId;
  if (f.type === "MINISTRY") return !!f.ministryId && ministryScope(a).includes(f.ministryId);
  return false;
}

/** Approve / request changes / reject / archive / reassign — the church office only (§16). */
export const canReviewFundraiser = (a: Actor) => isAdmin(a);

/** Confirm a gift ↔ fundraiser match from the AdventistGiving CSV. This is what sets verified. */
export const canConfirmAttribution = (a: Actor) => canManageGiving(a);

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
  | "transfer.createOnBehalf" | "transfer.overrideDispute"
  | "minutes.read" | "minutes.approve"
  | "committee.manage"
  | "manual.manage"
  | "emailTemplate.manage"
  | "cms.publish"
  | "accountRequest.review"
  | "document.read" | "document.download" | "document.manage"
  | "role.manage"
  | "giving.manage"
  | "fundraiser.view" | "fundraiser.edit" | "fundraiser.review" | "fundraiser.confirmAttribution";

/** Resource shape depends on the action: WorkItem actions take a WorkItemRef; document
 *  actions take a DocumentRef; fundraiser actions take a FundraiserRef; role-only actions
 *  take no resource. */
export type Resource = WorkItemRef | DocumentRef | FundraiserRef;

export function can(actor: Actor, action: Action, resource?: Resource): boolean {
  switch (action) {
    case "care.read":
    case "prayer.read":
    case "workitem.read":
      return resource ? canReadWorkItem(actor, resource as WorkItemRef) : false;
    case "care.manage":
    case "prayer.manage":
    case "workitem.manage":
      return resource ? canManageWorkItem(actor, resource as WorkItemRef) : false;
    case "workitem.message":
      return resource ? canMessageWorkItem(actor, resource as WorkItemRef) : false;
    case "announcement.approve":
      return canReviewContent(actor);
    case "member.manage":
      return canReadMember(actor);
    case "transfer.manage":
      return canManageTransfer(actor);
    case "transfer.createOnBehalf":
      return canCreateTransferOnBehalf(actor);
    case "transfer.overrideDispute":
      return canOverrideTransferDispute(actor);
    case "minutes.read":
      return canReadBoardMinutes(actor);
    case "minutes.approve":
      return canApproveMinutes(actor);
    case "committee.manage":
      return canManageCommittee(actor);
    case "manual.manage":
      return canManageManual(actor);
    case "emailTemplate.manage":
      return canManageEmailTemplate(actor);
    case "cms.publish":
      return canPublishCms(actor);
    case "accountRequest.review":
      return canReviewAccountRequest(actor);
    case "document.read":
    case "document.download":
      return resource ? canReadDocument(actor, resource as DocumentRef) : false;
    case "document.manage":
      return canManageDocument(actor);
    case "role.manage":
      return canManageRoles(actor);
    case "giving.manage":
      return canManageGiving(actor);
    case "fundraiser.view":
      return resource ? canViewFundraiser(actor, resource as FundraiserRef) : false;
    case "fundraiser.edit":
      return resource ? canEditFundraiser(actor, resource as FundraiserRef) : false;
    case "fundraiser.review":
      return canReviewFundraiser(actor);
    case "fundraiser.confirmAttribution":
      return canConfirmAttribution(actor);
    default:
      return false;
  }
}

/** Deny-by-default guard: throw ForbiddenError unless the action is permitted. Prefer this
 *  in server actions/route handlers over scattering role literals, so authorization stays
 *  centralized in this module. */
export function requireCan(actor: Actor, action: Action, resource?: Resource): void {
  if (!can(actor, action, resource)) throw new ForbiddenError();
}
