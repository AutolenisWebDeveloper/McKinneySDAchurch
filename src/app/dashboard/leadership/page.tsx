import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import {
  PortalPage, StatGrid, StatCard, PortalSection, QuickActionGrid, QuickAction, TaskRow, EmptyState,
} from "@/components/portal/home-ui";

export const dynamic = "force-dynamic";

const OPEN = ["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "FOLLOW_UP", "NEEDS_INFO"] as const;

export default async function LeadershipPortal() {
  const actor = await requirePortal("leadership");

  const [openCare, newPrayer, careAlerts, assignedToMe, recent] = await Promise.all([
    prisma.workItem.count({ where: { type: "CARE", status: { in: [...OPEN] } } }),
    prisma.workItem.count({ where: { type: "PRAYER", status: { in: ["NEW", "TRIAGED"] } } }),
    prisma.careAlert.count({ where: { status: { in: ["OPEN", "ASSIGNED"] } } }),
    prisma.workItem.count({ where: { assigneeUserId: actor.userId, status: { in: [...OPEN] } } }),
    prisma.workItem.findMany({
      where: { type: { in: ["CARE", "PRAYER", "LEADERSHIP_MESSAGE"] }, status: { in: [...OPEN] } },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 8,
      select: { id: true, title: true, type: true, status: true, priority: true, createdAt: true },
    }),
  ]);

  return (
    <PortalPage
      title="Pastoral Overview"
      intro="Who needs pastoral attention right now? Care requests, prayer, and messages to leadership — triaged in one place."
    >
      <StatGrid>
        <StatCard label="Open care" value={openCare} tone={openCare ? "warn" : "default"} href="/dashboard/admin/care" />
        <StatCard label="New prayer" value={newPrayer} tone={newPrayer ? "accent" : "default"} />
        <StatCard label="Attendance alerts" value={careAlerts} hint="from weekly scan" href="/dashboard/admin/care" />
        <StatCard label="Assigned to me" value={assignedToMe} tone={assignedToMe ? "accent" : "default"} />
      </StatGrid>

      <PortalSection title="Quick actions">
        <QuickActionGrid>
          <QuickAction href="/dashboard/admin/care" title="Care dashboard" description="Open alerts and pastoral notes" />
          <QuickAction href="/dashboard/admin/approvals" title="Approvals" description="Review announcements and events" />
        </QuickActionGrid>
      </PortalSection>

      <PortalSection title="Needs attention">
        {recent.length ? (
          <div className="space-y-2">
            {recent.map((w) => (
              <TaskRow
                key={w.id}
                href={`/dashboard/leadership/workitems/${w.id}`}
                title={w.title}
                meta={`${prettyType(w.type)} · ${prettyStatus(w.status)}${w.priority === "URGENT" || w.priority === "HIGH" ? ` · ${w.priority.toLowerCase()} priority` : ""}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing needs triage right now"
            hint="New care requests, prayer, and messages to leadership will surface here."
          />
        )}
      </PortalSection>
    </PortalPage>
  );
}

function prettyType(t: string) {
  return t.toLowerCase().replace(/_/g, " ");
}
function prettyStatus(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}
