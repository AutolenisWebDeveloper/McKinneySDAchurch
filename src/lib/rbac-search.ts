import type { Role } from "@prisma/client";

/**
 * RBAC-aware search scoping (§45). Determines WHICH resource types an actor may search, so
 * authorization is applied before any result (title, snippet, count) is ever produced. A plain
 * member can never receive care/prayer/member/governance results.
 */

export type SearchScope =
  | "announcements"
  | "events"
  | "bulletins"
  | "manual"
  | "members"
  | "care"
  | "prayer"
  | "transfers"
  | "committees";

const has = (roles: Role[], ...r: Role[]) => r.some((x) => roles.includes(x));

/** The scopes an actor may search, given their active roles. Deny by default. */
export function searchScopesForRoles(roles: Role[]): SearchScope[] {
  const scopes = new Set<SearchScope>();
  // Everyone authenticated (member) may search published/shared content + the Church Manual.
  scopes.add("announcements");
  scopes.add("events");
  scopes.add("bulletins");
  scopes.add("manual");

  const leadership = has(roles, "PASTOR", "ELDER", "ADMIN");
  const secretary = has(roles, "CLERK", "ADMIN", "PASTOR");

  if (leadership) {
    scopes.add("care");
    scopes.add("prayer");
    scopes.add("members");
  }
  if (secretary) {
    scopes.add("members");
    scopes.add("transfers");
    scopes.add("committees");
  }
  return [...scopes];
}

export function canSearchScope(roles: Role[], scope: SearchScope): boolean {
  return searchScopesForRoles(roles).includes(scope);
}
