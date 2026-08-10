import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import {
  PortalPage, StatGrid, StatCard, PortalSection, QuickActionGrid, QuickAction, TaskRow, EmptyState,
} from "@/components/portal/home-ui";

export const dynamic = "force-dynamic";

export default async function ClerkPortal() {
  await requirePortal("clerk");

  const [openTransfers, upcomingMeetings, activeMembers, draftMinutes, recentTransfers] = await Promise.all([
    prisma.membershipTransfer.count({ where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } } }),
    prisma.boardMeeting.count({ where: { meetingDate: { gte: new Date() } } }),
    prisma.member.count({ where: { membershipStatus: "ACTIVE" } }),
    prisma.boardMeeting.count({ where: { status: "PENDING" } }),
    prisma.membershipTransfer.findMany({
      where: { status: { in: ["SUBMITTED", "IN_REVIEW", "HANDED_TO_EADVENTIST"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, direction: true, status: true, personName: true, createdAt: true },
    }),
  ]);

  return (
    <PortalPage
      title="Church Secretary"
      intro="What membership and governance work requires action? Transfers, board minutes, and official records."
    >
      <StatGrid>
        <StatCard label="Transfers to action" value={openTransfers} tone={openTransfers ? "accent" : "default"} href="/dashboard/clerk/transfers" />
        <StatCard label="Upcoming meetings" value={upcomingMeetings} href="/dashboard/admin/board" />
        <StatCard label="Draft minutes" value={draftMinutes} tone={draftMinutes ? "accent" : "default"} href="/dashboard/admin/board" />
        <StatCard label="Active members" value={activeMembers} />
      </StatGrid>

      <PortalSection title="Quick actions">
        <QuickActionGrid>
          <QuickAction href="/dashboard/clerk/transfers" title="Membership transfers" description="Process incoming and outgoing" />
          <QuickAction href="/dashboard/clerk/reconcile" title="eAdventist reconcile" description="Compare against the official record" />
          <QuickAction href="/dashboard/admin/board" title="Board & minutes" description="Meetings, agendas, minutes" />
          <QuickAction href="/dashboard/admin/officers" title="Officers" description="Current officers and terms" />
          <QuickAction href="/api/members/export" title="Export members (CSV)" description="Adults only; reconciliation aid" external />
        </QuickActionGrid>
      </PortalSection>

      <PortalSection title="Recent transfers">
        {recentTransfers.length ? (
          <div className="space-y-2">
            {recentTransfers.map((t) => (
              <TaskRow
                key={t.id}
                href="/dashboard/clerk/transfers"
                title={`${t.personName} — ${t.direction === "INCOMING" ? "Incoming" : "Outgoing"}`}
                meta={`${prettyStatus(t.status)} · ${t.createdAt.toLocaleDateString("en-US")}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No active transfers" hint="Incoming and outgoing membership transfers will appear here." />
        )}
      </PortalSection>
    </PortalPage>
  );
}

function prettyStatus(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}
