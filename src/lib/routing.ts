import type { Role, WorkItemType, WorkItemPriority } from "@prisma/client";

/**
 * Pure routing policy (no I/O) — §16. Routing is configuration, not scattered conditionals:
 * given a WorkItem's type (and optional category/priority/ministry), decide which roles
 * should be notified and whether the item is ministry-scoped. Introducing a future
 * care-specific role later means editing this table only, never the WorkItem plumbing.
 */

export type RoutingContext = {
  category?: string | null;
  priority?: WorkItemPriority;
  ministryId?: string | null;
};

export type RoutingDecision = {
  /** Roles whose holders should be notified / can triage this item. */
  roles: Role[];
  /** When true, notify ministry-scoped role holders for `ministryId` (if provided). */
  ministryScoped: boolean;
};

const BASE_ROUTES: Record<WorkItemType, RoutingDecision> = {
  CARE: { roles: ["PASTOR", "ELDER"], ministryScoped: false },
  PRAYER: { roles: ["PASTOR", "ELDER"], ministryScoped: false },
  LEADERSHIP_MESSAGE: { roles: ["PASTOR", "ELDER", "ADMIN"], ministryScoped: false },
  SUPPORT: { roles: ["ADMIN"], ministryScoped: false },
  CONTACT: { roles: ["ADMIN"], ministryScoped: false },
  VOLUNTEER: { roles: ["ADMIN"], ministryScoped: true },
  SPONSOR: { roles: ["ADMIN"], ministryScoped: false },
};

export function routeWorkItem(type: WorkItemType, ctx: RoutingContext = {}): RoutingDecision {
  const base = BASE_ROUTES[type];
  const roles = new Set<Role>(base.roles);
  let ministryScoped = base.ministryScoped;

  // Urgent care/prayer additionally always reaches the Pastor (defensive; already included).
  if ((type === "CARE" || type === "PRAYER") && ctx.priority === "URGENT") {
    roles.add("PASTOR");
  }

  // A volunteer application tied to a ministry also routes to that ministry's head.
  if (type === "VOLUNTEER" && ctx.ministryId) {
    roles.add("MINISTRY_HEAD");
    ministryScoped = true;
  }

  return { roles: [...roles], ministryScoped };
}
