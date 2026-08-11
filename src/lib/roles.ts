import type { Role } from "@prisma/client";

/**
 * Pure role/portal logic (no I/O). Portal context is PRESENTATION ONLY and never an
 * authorization decision (see §14): a user keeps every role regardless of which portal
 * they are viewing. Authorization always derives from the active UserRole set + resource
 * policy in rbac.ts — never from the active portal.
 */

export type PortalKey =
  | "member"
  | "ministry"
  | "leadership"
  | "clerk"
  | "treasurer"
  | "admin";

/** Canonical display order for the portal switcher. */
export const PORTAL_ORDER: PortalKey[] = [
  "member",
  "ministry",
  "leadership",
  "clerk",
  "treasurer",
  "admin",
];

/** Human labels. "Church Secretary" is the user-facing name for the CLERK/clerk portal (§18). */
export const PORTAL_LABEL: Record<PortalKey, string> = {
  member: "Member",
  ministry: "Ministry",
  leadership: "Leadership",
  clerk: "Church Secretary",
  treasurer: "Treasurer",
  admin: "Admin",
};

/** Dashboard base route for each portal. */
export const PORTAL_ROUTE: Record<PortalKey, string> = {
  member: "/dashboard/member",
  ministry: "/dashboard/ministry",
  leadership: "/dashboard/leadership",
  clerk: "/dashboard/clerk",
  treasurer: "/dashboard/treasurer",
  admin: "/dashboard/admin",
};

/**
 * Ranking used only to pick a sensible DEFAULT portal when a user holds several roles.
 * Higher = more authority. This does NOT imply a permission hierarchy — each permission
 * is checked explicitly in rbac.ts.
 */
const ROLE_RANK: Record<Role, number> = {
  MEMBER: 0,
  MINISTRY_HEAD: 10,
  TREASURER: 20,
  CLERK: 30,
  ELDER: 40,
  ADMIN: 50,
  PASTOR: 60,
};

export function rankRole(role: Role): number {
  return ROLE_RANK[role] ?? 0;
}

/** The single portal that best represents a role (its "home"). */
export function roleHomePortal(role: Role): PortalKey {
  switch (role) {
    case "MINISTRY_HEAD":
      return "ministry";
    case "ELDER":
    case "PASTOR":
      return "leadership";
    case "CLERK":
      return "clerk";
    case "TREASURER":
      return "treasurer";
    case "ADMIN":
      return "admin";
    case "MEMBER":
    default:
      return "member";
  }
}

/**
 * Which roles grant access to which portal. `member` is granted to every authenticated
 * user and so is handled separately (not keyed here).
 */
const PORTAL_ROLES: Record<Exclude<PortalKey, "member">, Role[]> = {
  ministry: ["MINISTRY_HEAD"],
  leadership: ["PASTOR", "ELDER", "ADMIN"],
  clerk: ["CLERK"],
  treasurer: ["TREASURER"],
  admin: ["ADMIN", "PASTOR"],
};

/** True if any of the actor's roles grants the given portal. Every user gets `member`. */
export function canAccessPortal(roles: Role[], portal: PortalKey): boolean {
  if (portal === "member") return true;
  const grant = PORTAL_ROLES[portal];
  return roles.some((r) => grant.includes(r));
}

/** Ordered, de-duplicated list of every portal the actor may switch to. */
export function portalsForRoles(roles: Role[]): PortalKey[] {
  return PORTAL_ORDER.filter((p) => canAccessPortal(roles, p));
}

/**
 * The portal to land on by default. Honors an explicit `primaryRole` preference when that
 * role is actually held; otherwise falls back to the home portal of the highest-ranked role.
 */
export function primaryPortal(roles: Role[], primaryRole?: Role | null): PortalKey {
  if (!roles.length) return "member";
  if (primaryRole && roles.includes(primaryRole)) {
    return roleHomePortal(primaryRole);
  }
  const top = [...roles].sort((a, b) => rankRole(b) - rankRole(a))[0]!;
  return roleHomePortal(top);
}

/** Highest-ranked role in a set (used for display badges). */
export function highestRole(roles: Role[]): Role {
  if (!roles.length) return "MEMBER";
  return [...roles].sort((a, b) => rankRole(b) - rankRole(a))[0]!;
}
