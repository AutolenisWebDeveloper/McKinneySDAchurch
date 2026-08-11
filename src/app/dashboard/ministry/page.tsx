import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { ministryScope } from "@/lib/rbac";
import {
  PortalPage, StatGrid, StatCard, PortalSection, QuickActionGrid, QuickAction, TaskRow, EmptyState,
} from "@/components/portal/home-ui";

export const dynamic = "force-dynamic";

export default async function MinistryPortal() {
  const actor = await requirePortal("ministry");
  const scope = ministryScope(actor);
  const scopeWhere = scope.length ? { ministryId: { in: scope } } : { createdById: actor.userId };

  const [pendingAnn, pendingEvt, recentAnn, recentEvt] = await Promise.all([
    prisma.announcement.count({ where: { ...scopeWhere, status: "PENDING" } }),
    prisma.event.count({ where: { ...scopeWhere, status: "PENDING" } }),
    prisma.announcement.findMany({
      where: scopeWhere, orderBy: { createdAt: "desc" }, take: 4,
      select: { id: true, title: true, status: true, createdAt: true },
    }),
    prisma.event.findMany({
      where: scopeWhere, orderBy: { createdAt: "desc" }, take: 4,
      select: { id: true, title: true, status: true, startAt: true },
    }),
  ]);

  return (
    <PortalPage
      title="This Week"
      intro="What does the church need from your ministry this week? Submit announcements and events; track their approval."
    >
      <StatGrid>
        <StatCard label="Announcements pending" value={pendingAnn} tone={pendingAnn ? "accent" : "default"} href="/dashboard/ministry/announcements" />
        <StatCard label="Events pending" value={pendingEvt} tone={pendingEvt ? "accent" : "default"} href="/dashboard/ministry/events" />
      </StatGrid>

      <PortalSection title="Submit to this week">
        <QuickActionGrid>
          <QuickAction href="/dashboard/ministry/submit" title="Submit to the bulletin" description="Announcements, events, program items, or “nothing this week”" />
          <QuickAction href="/dashboard/ministry/announcements/new" title="Submit an announcement" description="Sent to admins for approval" />
          <QuickAction href="/dashboard/ministry/events/new" title="Submit an event" description="Added to the calendar once approved" />
        </QuickActionGrid>
      </PortalSection>

      <PortalSection title="My announcements" action={undefined}>
        {recentAnn.length ? (
          <div className="space-y-2">
            {recentAnn.map((a) => (
              <TaskRow key={a.id} href="/dashboard/ministry/announcements" title={a.title} meta={statusLabel(a.status)} />
            ))}
          </div>
        ) : (
          <EmptyState title="No announcements yet" hint="Submit one and it will appear here with its approval status." />
        )}
      </PortalSection>

      <PortalSection title="My events">
        {recentEvt.length ? (
          <div className="space-y-2">
            {recentEvt.map((e) => (
              <TaskRow
                key={e.id}
                href="/dashboard/ministry/events"
                title={e.title}
                meta={`${statusLabel(e.status)} · ${e.startAt.toLocaleDateString("en-US")}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No events yet" hint="Submit an event for the calendar." />
        )}
      </PortalSection>
    </PortalPage>
  );
}

function statusLabel(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
