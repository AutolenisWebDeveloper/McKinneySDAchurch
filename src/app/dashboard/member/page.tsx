import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import {
  PortalPage, StatGrid, StatCard, PortalSection, QuickActionGrid, QuickAction, TaskRow, EmptyState,
} from "@/components/portal/home-ui";

export const dynamic = "force-dynamic";

const OPEN = ["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "FOLLOW_UP", "NEEDS_INFO"] as const;

export default async function MemberPortal() {
  const actor = await requirePortal("member");

  const [openRequests, recent, householdCount, unread] = await Promise.all([
    prisma.workItem.count({ where: { requesterUserId: actor.userId, status: { in: [...OPEN] } } }),
    prisma.workItem.findMany({
      where: { requesterUserId: actor.userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, type: true, status: true, updatedAt: true },
    }),
    actor.householdId
      ? prisma.member.count({ where: { householdId: actor.householdId } })
      : Promise.resolve(0),
    prisma.notification.count({ where: { userId: actor.userId, readAt: null, archivedAt: null } }),
  ]);

  const giving = env.ADVENTIST_GIVING_URL;

  return (
    <PortalPage
      title="My Church"
      intro="Your household, your profile, your requests, and how to get involved — all in one place."
    >
      <StatGrid>
        <StatCard label="Open requests" value={openRequests} href="/dashboard/member" tone={openRequests ? "accent" : "default"} />
        <StatCard label="Unread notices" value={unread} tone={unread ? "accent" : "default"} />
        <StatCard label="Household" value={householdCount} hint="people" href="/dashboard/household" />
      </StatGrid>

      <PortalSection title="What would you like to do?">
        <QuickActionGrid>
          <QuickAction href="/dashboard/profile" title="Update my profile" description="Contact details and directory preferences" />
          <QuickAction href="/dashboard/household" title="My household" description="Add family members and dependents" />
          <QuickAction href="/dashboard/directory" title="Church directory" description="Find fellow members who opted in" />
          <QuickAction href="/dashboard/member/message" title="Message leadership" description="Reach the pastor and elders privately" />
          <QuickAction href="/prayer" title="Request prayer" description="Share a prayer request with leadership" />
          <QuickAction href="/care" title="Report a care need" description="Let a pastor or elder know someone needs care" />
          {giving && <QuickAction href={giving} title="Give" description="Securely through AdventistGiving" external />}
        </QuickActionGrid>
      </PortalSection>

      <PortalSection title="My recent requests">
        {recent.length ? (
          <div className="space-y-2">
            {recent.map((r) => (
              <TaskRow
                key={r.id}
                href={`/dashboard/member/requests/${r.id}`}
                title={r.title}
                meta={`${label(r.type)} · ${status(r.status)} · updated ${r.updatedAt.toLocaleDateString("en-US")}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No requests yet" hint="Prayer, care, and messages you send will appear here with their status." />
        )}
      </PortalSection>
    </PortalPage>
  );
}

function label(t: string) {
  return t.toLowerCase().replace(/_/g, " ");
}
function status(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}
