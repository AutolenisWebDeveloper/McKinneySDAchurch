import type { Actor } from "@/lib/rbac";
import { type PortalKey, PORTAL_ROUTE } from "@/lib/roles";
import type { IconName } from "./icons";

export type NavItem = { href: string; label: string; icon?: IconName; external?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

/**
 * Grouped navigation for each portal. Every entry points at a route that EXISTS today (no dead
 * links); items are organized into small, labelled categories so the sidebar reads as an
 * information architecture rather than a flat list of destinations. Visibility is gated by
 * portal access only (presentation) — authorization is still enforced in each page/action, and
 * no capability that was previously reachable has been removed (see the reconciliation in the
 * redesign notes). When adding a per-item role gate here, never hide a destination the actor is
 * actually authorized to use.
 */
export function portalNav(portal: PortalKey, _actor: Actor): NavGroup[] {
  switch (portal) {
    case "member":
      return [
        { label: "Overview", items: [{ href: PORTAL_ROUTE.member, label: "My Dashboard", icon: "overview" }] },
        {
          label: "My membership",
          items: [
            { href: "/dashboard/household", label: "My Household", icon: "households" },
            { href: "/dashboard/profile", label: "My Profile", icon: "profile" },
            { href: "/dashboard/member/transfer", label: "Membership Transfer", icon: "transfer" },
          ],
        },
        {
          label: "Communication",
          items: [
            { href: "/dashboard/member/message", label: "Message Leadership", icon: "message" },
            { href: "/dashboard/member/preferences", label: "Communication Preferences", icon: "preferences" },
          ],
        },
        {
          label: "Building Project",
          items: [
            { href: "/construction", label: "Building Project", icon: "building" },
            { href: "/dashboard/fundraisers", label: "My Fundraiser", icon: "fundraisers" },
          ],
        },
        {
          label: "Church",
          items: [
            { href: "/dashboard/directory", label: "Directory", icon: "directory" },
            { href: "/dashboard/search", label: "Search", icon: "search" },
            { href: "/dashboard/manual", label: "Church Manual", icon: "manual" },
          ],
        },
      ];

    case "ministry":
      return [
        { label: "Overview", items: [{ href: PORTAL_ROUTE.ministry, label: "This Week", icon: "overview" }] },
        {
          label: "My ministry",
          items: [
            { href: "/dashboard/ministry/bulletin", label: "Weekly Bulletin", icon: "bulletin" },
            { href: "/dashboard/ministry/newsletter", label: "Monthly Newsletter", icon: "newsletter" },
            { href: "/dashboard/ministry/submit", label: "Program & Events", icon: "bulletins" },
            { href: "/dashboard/ministry/announcements", label: "My Announcements", icon: "content" },
            { href: "/dashboard/ministry/events", label: "My Events", icon: "calendar" },
          ],
        },
        {
          label: "Reference",
          items: [
            { href: "/dashboard/admin/bulletin", label: "Bulletins", icon: "bulletins" },
            { href: "/dashboard/manual", label: "Church Manual", icon: "manual" },
          ],
        },
      ];

    case "leadership":
      return [
        { label: "Overview", items: [{ href: PORTAL_ROUTE.leadership, label: "Pastoral Overview", icon: "overview" }] },
        {
          label: "Care & requests",
          items: [
            { href: "/dashboard/leadership/workitems", label: "Work Items", icon: "work-items" },
            { href: "/dashboard/admin/care", label: "Care Alerts", icon: "care" },
            { href: "/dashboard/admin/approvals", label: "Approvals", icon: "approvals" },
          ],
        },
        {
          label: "Reference",
          items: [
            { href: "/dashboard/search", label: "Search", icon: "search" },
            { href: "/dashboard/manual", label: "Church Manual", icon: "manual" },
          ],
        },
      ];

    case "clerk":
      return [
        { label: "Overview", items: [{ href: PORTAL_ROUTE.clerk, label: "Secretary Home", icon: "overview" }] },
        {
          label: "Membership",
          items: [
            { href: "/dashboard/admin/members", label: "Members", icon: "members" },
            { href: "/dashboard/admin/households", label: "Households", icon: "households" },
            { href: "/dashboard/admin/member-info", label: "Member Info Forms", icon: "member-info" },
            { href: "/dashboard/clerk/transfers", label: "Transfers", icon: "transfer" },
            { href: "/dashboard/clerk/reconcile", label: "eAdventist Reconcile", icon: "reconcile" },
          ],
        },
        {
          label: "Governance",
          items: [
            { href: "/dashboard/admin/board", label: "Board & Minutes", icon: "board" },
            { href: "/dashboard/admin/committees", label: "Committees", icon: "committees" },
            { href: "/dashboard/admin/officers", label: "Officers", icon: "officers" },
            { href: "/dashboard/admin/attendance", label: "Attendance", icon: "attendance" },
          ],
        },
        {
          label: "Tools",
          items: [
            { href: "/dashboard/search", label: "Search", icon: "search" },
            { href: "/api/members/export", label: "Export members (CSV)", icon: "export", external: true },
            { href: "/dashboard/manual", label: "Church Manual", icon: "manual" },
          ],
        },
      ];

    case "treasurer":
      return [
        { label: "Overview", items: [{ href: PORTAL_ROUTE.treasurer, label: "Treasurer Home", icon: "overview" }] },
        {
          label: "Finance",
          items: [
            { href: "/dashboard/admin/offerings", label: "Offering Calendar", icon: "finance" },
            { href: "/dashboard/admin/campaigns", label: "Campaigns", icon: "campaign" },
            { href: "/dashboard/admin/construction", label: "Building Fund", icon: "building" },
            { href: "/dashboard/admin/construction/fundraisers", label: "Fundraisers", icon: "fundraisers" },
          ],
        },
        {
          label: "Reference",
          items: [{ href: "/dashboard/manual", label: "Church Manual", icon: "manual" }],
        },
      ];

    case "admin":
      return [
        { label: "Overview", items: [{ href: PORTAL_ROUTE.admin, label: "Operations", icon: "overview" }] },
        {
          label: "People",
          items: [
            { href: "/dashboard/admin/members", label: "Members", icon: "members" },
            { href: "/dashboard/admin/households", label: "Households", icon: "households" },
            { href: "/dashboard/admin/visitors", label: "Visitors", icon: "visitors" },
            { href: "/dashboard/admin/member-info", label: "Member Info Forms", icon: "member-info" },
            { href: "/dashboard/admin/account-requests", label: "Account Requests", icon: "account-requests" },
            { href: "/dashboard/admin/accounts", label: "Accounts & Roles", icon: "accounts" },
          ],
        },
        {
          label: "Communications",
          items: [
            { href: "/dashboard/admin/weekly", label: "Weekly Bulletin", icon: "bulletin" },
            { href: "/dashboard/admin/bulletin", label: "Bulletins", icon: "bulletins" },
            { href: "/dashboard/admin/newsletter", label: "Monthly Newsletter", icon: "newsletter" },
            { href: "/dashboard/admin/email", label: "Member Email", icon: "email" },
            { href: "/dashboard/admin/email/templates", label: "Email Templates", icon: "email-template" },
          ],
        },
        {
          label: "Ministry & care",
          items: [
            { href: "/dashboard/admin/care", label: "Care", icon: "care" },
            { href: "/dashboard/admin/ministries", label: "Departments", icon: "departments" },
            { href: "/dashboard/admin/sabbath-school", label: "Sabbath School", icon: "sabbath-school" },
            { href: "/dashboard/admin/baptism", label: "Baptism", icon: "baptism" },
          ],
        },
        {
          label: "Church operations",
          items: [
            { href: "/dashboard/admin/calendar", label: "Calendar", icon: "calendar" },
            { href: "/dashboard/admin/officers", label: "Officers", icon: "officers" },
            { href: "/dashboard/admin/board", label: "Board", icon: "board" },
            { href: "/dashboard/admin/committees", label: "Committees", icon: "committees" },
            { href: "/dashboard/admin/manual", label: "Manage Manual", icon: "manage-manual" },
            { href: "/dashboard/manual", label: "Church Manual", icon: "manual" },
          ],
        },
        {
          label: "Requests & approvals",
          items: [
            { href: "/dashboard/admin/workitems", label: "Requests Inbox", icon: "requests-inbox" },
            { href: "/dashboard/admin/approvals", label: "Approvals", icon: "approvals" },
          ],
        },
        {
          label: "Content",
          items: [
            { href: "/dashboard/admin/content", label: "Website Content", icon: "content" },
            { href: "/dashboard/search", label: "Search", icon: "search" },
          ],
        },
        {
          label: "Building",
          items: [
            { href: "/dashboard/admin/construction", label: "Building Project", icon: "building" },
            { href: "/dashboard/admin/construction/fundraisers", label: "Fundraisers", icon: "fundraisers" },
            { href: "/dashboard/admin/construction/library", label: "Share Library", icon: "content" },
            { href: "/dashboard/admin/campaigns", label: "Campaigns", icon: "campaign" },
          ],
        },
      ];

    default:
      return [];
  }
}

/** Build the grouped nav for every portal the actor can access (used by the switcher + sidebar). */
export function navForActor(actor: Actor, portals: PortalKey[]): Record<string, NavGroup[]> {
  const out: Record<string, NavGroup[]> = {};
  for (const p of portals) out[p] = portalNav(p, actor);
  return out;
}

/** Flattened item list for a portal (command palette / search over destinations). */
export function navItemsFlat(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((g) => g.items);
}

/**
 * Role-aware "Create" / start-a-task entry points shown in the header and dashboard Quick
 * Actions. Every href is an existing route (no dead links) and every destination routes through
 * its own workflow + authorization — nothing here bypasses approvals or provisioning.
 */
export function quickCreateActions(portal: PortalKey): NavItem[] {
  switch (portal) {
    case "admin":
      return [
        { href: "/dashboard/admin/email", label: "Send member email", icon: "email" },
        { href: "/dashboard/admin/calendar", label: "Manage calendar", icon: "calendar" },
        { href: "/dashboard/admin/content", label: "Website content", icon: "content" },
        { href: "/dashboard/admin/construction", label: "Building update", icon: "building" },
      ];
    case "ministry":
      return [
        { href: "/dashboard/ministry/bulletin/new", label: "New bulletin announcement", icon: "bulletin" },
        { href: "/dashboard/ministry/events/new", label: "New event", icon: "calendar" },
        { href: "/dashboard/ministry/announcements/new", label: "New announcement", icon: "content" },
      ];
    case "clerk":
      return [
        { href: "/dashboard/admin/members", label: "Members", icon: "members" },
        { href: "/dashboard/admin/households", label: "Households", icon: "households" },
        { href: "/dashboard/clerk/transfers", label: "Transfers", icon: "transfer" },
      ];
    case "treasurer":
      return [
        { href: "/dashboard/admin/campaigns", label: "Campaigns", icon: "campaign" },
        { href: "/dashboard/admin/offerings", label: "Offering calendar", icon: "finance" },
      ];
    case "member":
      return [
        { href: "/dashboard/fundraisers/new", label: "Start my fundraiser", icon: "fundraisers" },
        { href: "/dashboard/member/message", label: "Message leadership", icon: "message" },
        { href: "/dashboard/member/transfer", label: "Request transfer", icon: "transfer" },
      ];
    case "leadership":
    default:
      return [];
  }
}
