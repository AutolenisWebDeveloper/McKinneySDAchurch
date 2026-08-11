import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import {
  PortalPage, StatGrid, StatCard, PortalSection, QuickActionGrid, QuickAction,
} from "@/components/portal/home-ui";

export const dynamic = "force-dynamic";

const OPEN = ["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "FOLLOW_UP", "NEEDS_INFO"] as const;

export default async function AdminPortal() {
  await requirePortal("admin");

  const [pendingAnn, pendingEvt, activeVisitors, openCare, openTransfers, openSupport, accountRequests, currentPacket] = await Promise.all([
    prisma.announcement.count({ where: { status: "PENDING" } }),
    prisma.event.count({ where: { status: "PENDING" } }),
    prisma.visitor.count({ where: { status: "ACTIVE" } }),
    prisma.careAlert.count({ where: { status: { in: ["OPEN", "ASSIGNED"] } } }),
    prisma.membershipTransfer.count({ where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } } }),
    prisma.workItem.count({ where: { type: "SUPPORT", status: { in: [...OPEN] } } }),
    prisma.accountRequest.count({ where: { status: { in: ["PENDING_ADMIN_REVIEW", "NEEDS_INFO"] } } }),
    prisma.weeklyPacket.findFirst({ where: { status: { in: ["COLLECTING", "IN_REVIEW", "READY"] } }, orderBy: { sabbathDate: "asc" }, select: { readinessScore: true } }),
  ]);

  const pendingApprovals = pendingAnn + pendingEvt;

  return (
    <PortalPage
      title="Operations"
      intro="What across the church requires review, approval, communication, or intervention?"
    >
      <StatGrid>
        <StatCard label="Bulletin readiness" value={currentPacket ? `${currentPacket.readinessScore}%` : "—"} hint="this week" href="/dashboard/admin/weekly" />
        <StatCard label="Pending approvals" value={pendingApprovals} tone={pendingApprovals ? "accent" : "default"} href="/dashboard/admin/approvals" />
        <StatCard label="Account requests" value={accountRequests} tone={accountRequests ? "accent" : "default"} href="/dashboard/admin/account-requests" />
        <StatCard label="Open care" value={openCare} tone={openCare ? "warn" : "default"} href="/dashboard/admin/care" />
        <StatCard label="Transfers" value={openTransfers} tone={openTransfers ? "accent" : "default"} href="/dashboard/clerk/transfers" />
        <StatCard label="Active visitors" value={activeVisitors} href="/dashboard/admin/visitors" />
        <StatCard label="Support requests" value={openSupport} tone={openSupport ? "accent" : "default"} />
      </StatGrid>

      <PortalSection title="Review & approve">
        <QuickActionGrid>
          <QuickAction href="/dashboard/admin/approvals" title="Approvals" description="Announcements and events awaiting review" />
          <QuickAction href="/dashboard/admin/accounts" title="Accounts & roles" description="Provision logins and manage roles" />
          <QuickAction href="/dashboard/admin/members" title="Members" description="Create and manage member profiles" />
          <QuickAction href="/dashboard/admin/member-info" title="Member info forms" description="Household details submitted from the website" />
          <QuickAction href="/dashboard/admin/visitors" title="Visitors" description="Follow-up and convert to members" />
          <QuickAction href="/dashboard/admin/workitems" title="Requests inbox" description="Volunteer, sponsor, support, and contact" />
        </QuickActionGrid>
      </PortalSection>

      <PortalSection title="Communicate & operate">
        <QuickActionGrid>
          <QuickAction href="/dashboard/admin/email" title="Member email" description="Send to a member segment" />
          <QuickAction href="/dashboard/admin/care" title="Care" description="Pastoral care oversight" />
          <QuickAction href="/dashboard/admin/construction" title="Building project" description="Capital campaign updates" />
          <QuickAction href="/dashboard/admin/ministries" title="Departments" description="Ministries and leaders" />
          <QuickAction href="/dashboard/admin/calendar" title="Calendar" description="Publish and manage events" />
          <QuickAction href="/dashboard/admin/bulletin" title="Bulletins" description="Weekly order of service" />
          <QuickAction href="/dashboard/admin/board" title="Board" description="Meetings and minutes" />
        </QuickActionGrid>
      </PortalSection>
    </PortalPage>
  );
}
