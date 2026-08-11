import type { Actor } from "@/lib/rbac";
import { type PortalKey, PORTAL_ROUTE } from "@/lib/roles";

export type NavItem = { href: string; label: string; external?: boolean };

/**
 * Navigation for each portal. Every entry points at a route that EXISTS today (no dead links);
 * portal-specific home routes are added as their pages ship. Visibility is filtered by the
 * actor's real roles — presentation only; authorization is still enforced in each page/action.
 */
export function portalNav(portal: PortalKey, actor: Actor): NavItem[] {
  switch (portal) {
    case "member":
      return [
        { href: PORTAL_ROUTE.member, label: "My Dashboard" },
        { href: "/dashboard/member/message", label: "Message Leadership" },
        { href: "/dashboard/member/transfer", label: "Membership Transfer" },
        { href: "/dashboard/member/preferences", label: "Communication Preferences" },
        { href: "/dashboard/search", label: "Search" },
        { href: "/dashboard/directory", label: "Directory" },
        { href: "/dashboard/household", label: "My Household" },
        { href: "/dashboard/profile", label: "My Profile" },
        { href: "/dashboard/fundraisers", label: "My Fundraisers" },
        { href: "/dashboard/manual", label: "Church Manual" },
      ];

    case "ministry":
      return [
        { href: PORTAL_ROUTE.ministry, label: "This Week" },
        { href: "/dashboard/ministry/submit", label: "Submit to Bulletin" },
        { href: "/dashboard/ministry/announcements", label: "My Announcements" },
        { href: "/dashboard/ministry/events", label: "My Events" },
        { href: "/dashboard/admin/bulletin", label: "Bulletins" },
        { href: "/dashboard/manual", label: "Church Manual" },
      ];

    case "leadership":
      return [
        { href: PORTAL_ROUTE.leadership, label: "Pastoral Overview" },
        { href: "/dashboard/leadership/workitems", label: "Work Items" },
        { href: "/dashboard/search", label: "Search" },
        { href: "/dashboard/admin/care", label: "Care Alerts" },
        { href: "/dashboard/admin/approvals", label: "Approvals" },
        { href: "/dashboard/manual", label: "Church Manual" },
      ];

    case "clerk":
      return [
        { href: PORTAL_ROUTE.clerk, label: "Secretary Home" },
        { href: "/dashboard/admin/members", label: "Members" },
        { href: "/dashboard/clerk/transfers", label: "Transfers" },
        { href: "/dashboard/search", label: "Search" },
        { href: "/dashboard/clerk/reconcile", label: "eAdventist Reconcile" },
        { href: "/dashboard/admin/board", label: "Board & Minutes" },
        { href: "/dashboard/admin/committees", label: "Committees" },
        { href: "/dashboard/admin/officers", label: "Officers" },
        { href: "/dashboard/admin/attendance", label: "Attendance" },
        { href: "/api/members/export", label: "Export members (CSV)", external: true },
        { href: "/dashboard/manual", label: "Church Manual" },
      ];

    case "treasurer":
      return [
        { href: PORTAL_ROUTE.treasurer, label: "Treasurer Home" },
        { href: "/dashboard/admin/offerings", label: "Offering Calendar" },
        { href: "/dashboard/admin/campaigns", label: "Campaigns" },
        { href: "/dashboard/admin/construction", label: "Building Fund" },
        { href: "/dashboard/manual", label: "Church Manual" },
      ];

    case "admin":
      return [
        { href: PORTAL_ROUTE.admin, label: "Operations" },
        { href: "/dashboard/admin/workitems", label: "Requests Inbox" },
        { href: "/dashboard/admin/weekly", label: "Weekly Bulletin" },
        { href: "/dashboard/admin/approvals", label: "Approvals" },
        { href: "/dashboard/admin/account-requests", label: "Account Requests" },
        { href: "/dashboard/admin/accounts", label: "Accounts & Roles" },
        { href: "/dashboard/admin/members", label: "Members" },
        { href: "/dashboard/admin/calendar", label: "Calendar" },
        { href: "/dashboard/admin/visitors", label: "Visitors" },
        { href: "/dashboard/admin/email", label: "Member Email" },
        { href: "/dashboard/admin/email/templates", label: "Email Templates" },
        { href: "/dashboard/admin/care", label: "Care" },
        { href: "/dashboard/admin/officers", label: "Officers" },
        { href: "/dashboard/admin/sabbath-school", label: "Sabbath School" },
        { href: "/dashboard/admin/baptism", label: "Baptism" },
        { href: "/dashboard/admin/board", label: "Board" },
        { href: "/dashboard/admin/committees", label: "Committees" },
        { href: "/dashboard/admin/manual", label: "Manage Manual" },
        { href: "/dashboard/admin/construction", label: "Building Project" },
        { href: "/dashboard/admin/content", label: "Website Content" },
        { href: "/dashboard/search", label: "Search" },
        { href: "/dashboard/admin/ministries", label: "Departments" },
        { href: "/dashboard/admin/bulletin", label: "Bulletins" },
        { href: "/dashboard/manual", label: "Church Manual" },
      ];

    default:
      return [];
  }
}

/** Build the nav for every portal the actor can access (used by the switcher + sidebar). */
export function navForActor(actor: Actor, portals: PortalKey[]): Record<string, NavItem[]> {
  const out: Record<string, NavItem[]> = {};
  for (const p of portals) out[p] = portalNav(p, actor);
  return out;
}
