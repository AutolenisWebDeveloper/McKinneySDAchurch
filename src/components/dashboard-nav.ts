import type { Role } from "@prisma/client";
export function dashboardNav(role: Role): { href: string; label: string }[] {
  const items: { href: string; label: string }[] = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/directory", label: "Directory" },
    { href: "/dashboard/household", label: "My Household" },
    { href: "/dashboard/profile", label: "My Profile" },
    { href: "/dashboard/fundraisers", label: "My Fundraisers" },
  ];
  if (["MINISTRY_HEAD", "ADMIN", "PASTOR"].includes(role)) {
    items.push({ href: "/dashboard/ministry/announcements", label: "My Announcements" });
    items.push({ href: "/dashboard/ministry/events", label: "My Events" });
  }
  if (["ADMIN", "PASTOR"].includes(role)) {
    items.push({ href: "/dashboard/admin/approvals", label: "Approvals" });
    items.push({ href: "/dashboard/admin/visitors", label: "Visitors" });
    items.push({ href: "/dashboard/admin/email", label: "Member Email" });
    items.push({ href: "/dashboard/admin/care", label: "Care" });
    items.push({ href: "/dashboard/admin/officers", label: "Officers" });
    items.push({ href: "/dashboard/admin/sabbath-school", label: "Sabbath School" });
    items.push({ href: "/dashboard/admin/baptism", label: "Baptism" });
    items.push({ href: "/dashboard/admin/board", label: "Board" });
    items.push({ href: "/dashboard/admin/construction", label: "Building Project" });
    items.push({ href: "/dashboard/admin/ministries", label: "Departments" });
    items.push({ href: "/dashboard/admin/accounts", label: "Accounts" });
  }
  if (["ADMIN", "PASTOR", "TREASURER"].includes(role)) {
    items.push({ href: "/dashboard/admin/offerings", label: "Offerings" });
    items.push({ href: "/dashboard/admin/campaigns", label: "Campaigns" });
  }
  if (["ADMIN", "PASTOR", "MINISTRY_HEAD"].includes(role)) items.push({ href: "/dashboard/admin/bulletin", label: "Bulletins" });
  if (["ADMIN", "PASTOR", "CLERK"].includes(role)) items.push({ href: "/dashboard/admin/attendance", label: "Attendance" });
  if (["CLERK", "ADMIN", "PASTOR"].includes(role)) {
    items.push({ href: "/dashboard/clerk/transfers", label: "Transfers" });
    items.push({ href: "/dashboard/clerk/reconcile", label: "Reconcile" });
    items.push({ href: "/api/members/export", label: "Export members (CSV)" });
  }
  return items; // only routes that exist -> no dead links
}
