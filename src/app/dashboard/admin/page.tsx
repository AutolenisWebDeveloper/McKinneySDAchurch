import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { CHURCH_TZ, centralWallToUtc } from "@/lib/tz";
import { phaseStatusLabel } from "@/lib/construction";
import { quickCreateActions } from "@/components/portal/portal-nav";
import type { IconName } from "@/components/portal/icons";
import {
  DashboardHeader,
  AttentionLayer,
  MetricTile,
  MetricRow,
  Panel,
  PanelLink,
  WorkflowProgress,
  TodayPanel,
  ReviewQueue,
  QuickActions,
  ActivityFeed,
  BuildingWidget,
  type Attention,
  type QueueRow,
  type TodayItem,
  type ActivityItem,
} from "@/components/portal/dashboard-ui";

export const dynamic = "force-dynamic";

const OPEN_WORKITEM = ["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "FOLLOW_UP", "NEEDS_INFO"] as const;

export default async function AdminPortal() {
  const actor = await requirePortal("admin");

  const now = new Date();
  const todayStr = dateInTz(now); // "YYYY-MM-DD" in church time
  const startOfDay = centralWallToUtc(`${todayStr}T00:00`) ?? now;
  const endOfDay = centralWallToUtc(`${todayStr}T23:59`) ?? now;
  const startOfMonth = centralWallToUtc(`${todayStr.slice(0, 7)}-01T00:00`) ?? now;
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    user,
    pendingAnn,
    pendingEvt,
    activeVisitors,
    openCare,
    openTransfers,
    openSupport,
    accountRequests,
    currentPacket,
    membersTotal,
    membersNew,
    householdsTotal,
    ministriesTotal,
    upcomingEvents,
    todayEvents,
    pendingEventRows,
    pendingAnnRows,
    accountRequestRows,
    activity,
    project,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: actor.userId }, select: { name: true, email: true } }),
    prisma.announcement.count({ where: { status: "PENDING" } }),
    prisma.event.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"] } } }),
    prisma.visitor.count({ where: { status: "ACTIVE" } }),
    prisma.careAlert.count({ where: { status: { in: ["OPEN", "ASSIGNED"] } } }),
    prisma.membershipTransfer.count({ where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } } }),
    prisma.workItem.count({ where: { type: "SUPPORT", status: { in: [...OPEN_WORKITEM] } } }),
    prisma.accountRequest.count({ where: { status: { in: ["PENDING_ADMIN_REVIEW", "NEEDS_INFO"] } } }),
    prisma.weeklyPacket.findFirst({
      where: { status: { in: ["COLLECTING", "IN_REVIEW", "READY"] } },
      orderBy: { sabbathDate: "asc" },
      select: {
        readinessScore: true,
        status: true,
        bulletinId: true,
        deadlineAt: true,
        submissions: { select: { kind: true, status: true } },
      },
    }),
    prisma.member.count(),
    prisma.member.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.household.count(),
    prisma.ministry.count(),
    prisma.event.count({ where: { status: "PUBLISHED", startAt: { gte: now, lte: in30Days } } }),
    prisma.event.findMany({
      where: { status: "PUBLISHED", startAt: { gte: startOfDay, lte: endOfDay } },
      orderBy: { startAt: "asc" },
      take: 6,
      select: { id: true, title: true, startAt: true, location: true },
    }),
    prisma.event.findMany({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, createdAt: true },
    }),
    prisma.announcement.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, createdAt: true },
    }),
    prisma.accountRequest.findMany({
      where: { status: { in: ["PENDING_ADMIN_REVIEW", "NEEDS_INFO"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, firstName: true, lastName: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { action: true, entity: true, createdAt: true, actor: { select: { name: true } } },
    }),
    prisma.constructionProject.findFirst({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      select: {
        title: true,
        totalGoal: true,
        currentRaised: true,
        phases: { orderBy: { sortOrder: "asc" }, select: { name: true, status: true } },
        updates: { orderBy: { createdAt: "desc" }, take: 1, select: { title: true, description: true, createdAt: true } },
      },
    }),
  ]);

  const pendingApprovals = pendingAnn + pendingEvt;
  const firstName = (user?.name || user?.email?.split("@")[0] || "there").split(/\s+/)[0]!;

  // ---- Needs your attention (real, actionable; the layer hides any that are zero) ----
  const attention: Attention[] = [
    {
      count: pendingApprovals,
      label: pendingApprovals === 1 ? "Approval" : "Approvals",
      sublabel: `${pendingEvt} event${pendingEvt === 1 ? "" : "s"} · ${pendingAnn} announcement${pendingAnn === 1 ? "" : "s"}`,
      href: "/dashboard/admin/approvals",
      icon: "approvals",
    },
    {
      count: accountRequests,
      label: "Account requests",
      sublabel: "Awaiting verification",
      href: "/dashboard/admin/account-requests",
      icon: "account-requests",
      tone: "accent",
    },
    {
      count: openCare,
      label: "Care follow-up",
      sublabel: "Priority review",
      href: "/dashboard/admin/care",
      icon: "care",
      tone: "warn",
    },
    {
      count: openTransfers,
      label: "Transfers",
      sublabel: "Membership in review",
      href: "/dashboard/clerk/transfers",
      icon: "transfer",
    },
    {
      count: openSupport,
      label: "Open requests",
      sublabel: "Support & volunteer",
      href: "/dashboard/admin/workitems",
      icon: "requests-inbox",
    },
  ];

  // ---- Weekly Bulletin workflow (steps derived from the packet's real state) ----
  const accepted = (currentPacket?.submissions ?? []).filter((s) => s.status === "ACCEPTED");
  const hasKind = (k: string) => accepted.some((s) => s.kind === k);
  const packetStatus = currentPacket?.status;
  const bulletinSteps = [
    { label: "Announcements", done: hasKind("ANNOUNCEMENT") },
    { label: "Events & calendar", done: hasKind("EVENT") },
    { label: "Ministry updates", done: hasKind("MINISTRY_UPDATE") },
    { label: "Order of service", done: !!currentPacket?.bulletinId },
    { label: "Final review", done: packetStatus === "IN_REVIEW" || packetStatus === "READY" },
    { label: "Publish", done: false },
  ];

  // ---- Today's operations ----
  const todayItems: TodayItem[] = todayEvents.map((e) => ({
    icon: "calendar",
    primary: e.title,
    secondary: e.location ?? undefined,
    meta: timeInTz(e.startAt),
    href: "/dashboard/admin/calendar",
  }));
  if (currentPacket?.deadlineAt && sameDay(currentPacket.deadlineAt, startOfDay, endOfDay)) {
    todayItems.push({
      icon: "bulletin",
      primary: "Bulletin content closes today",
      secondary: "Weekly packet deadline",
      meta: timeInTz(currentPacket.deadlineAt),
      href: "/dashboard/admin/weekly",
    });
  }

  // ---- Review queue (unified, most-recent-first) ----
  const queue: (QueueRow & { at: Date })[] = [
    ...pendingEventRows.map((e) => ({
      title: e.title,
      type: "Event",
      submitted: ago(e.createdAt, now),
      status: "Review",
      statusTone: "info" as const,
      href: `/dashboard/admin/calendar/${e.id}`,
      at: e.createdAt,
    })),
    ...pendingAnnRows.map((a) => ({
      title: a.title,
      type: "Announcement",
      submitted: ago(a.createdAt, now),
      status: "Pending",
      statusTone: "info" as const,
      href: "/dashboard/admin/approvals",
      at: a.createdAt,
    })),
    ...accountRequestRows.map((r) => ({
      title: `${r.firstName} ${r.lastName}`.trim() || "Account request",
      type: "Account request",
      submitted: ago(r.createdAt, now),
      status: "Verify",
      statusTone: "accent" as const,
      href: "/dashboard/admin/account-requests",
      at: r.createdAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  // ---- Recent activity (from the audit log; presentation only) ----
  const activityItems: ActivityItem[] = activity.map((a) => ({
    icon: iconForEntity(a.entity),
    text: `${titleize(a.action)} · ${titleize(a.entity)}`,
    who: a.actor?.name ?? undefined,
    when: ago(a.createdAt, now),
  }));

  const currentPhase =
    project?.phases.find((p) => p.status === "IN_PROGRESS") ?? project?.phases[0] ?? null;

  return (
    <div className="space-y-6">
      <DashboardHeader
        greeting={`${greetingFor(now)}, ${firstName}`}
        subtitle="Here’s what needs your attention across McKinney SDA today."
        dateLabel={dateLabel(now)}
      />

      <AttentionLayer items={attention} />

      <MetricRow>
        <MetricTile label="Members" value={membersTotal} hint={membersNew ? `+${membersNew} this month` : "directory"} href="/dashboard/admin/members" />
        <MetricTile label="Households" value={householdsTotal} href="/dashboard/admin/households" />
        <MetricTile label="Active visitors" value={activeVisitors} href="/dashboard/admin/visitors" />
        <MetricTile label="Ministries" value={ministriesTotal} href="/dashboard/admin/ministries" />
        <MetricTile label="Upcoming events" value={upcomingEvents} hint="next 30 days" href="/dashboard/admin/calendar" />
        <MetricTile label="Open care" value={openCare} tone={openCare ? "warn" : "default"} href="/dashboard/admin/care" />
      </MetricRow>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          title="Weekly bulletin"
          action={<PanelLink href="/dashboard/admin/weekly">Open</PanelLink>}
        >
          <WorkflowProgress
            value={currentPacket ? currentPacket.readinessScore : null}
            steps={bulletinSteps}
            cta={{ href: "/dashboard/admin/weekly", label: currentPacket ? "Continue bulletin" : "Start next bulletin" }}
          />
        </Panel>

        <Panel
          title="Today"
          className="lg:col-span-2"
          action={<PanelLink href="/dashboard/admin/calendar">View calendar</PanelLink>}
        >
          <TodayPanel items={todayItems} />
        </Panel>
      </div>

      <Panel title="Review queue" action={<PanelLink href="/dashboard/admin/approvals">View all</PanelLink>}>
        <ReviewQueue rows={queue} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Quick actions">
          <QuickActions actions={quickCreateActions("admin") as { href: string; label: string; icon?: IconName }[]} />
        </Panel>

        <Panel title="Building project" action={<PanelLink href="/dashboard/admin/construction">Open</PanelLink>}>
          {project ? (
            <BuildingWidget
              title={project.title}
              raised={project.currentRaised}
              goal={project.totalGoal}
              phase={currentPhase ? `${currentPhase.name} · ${phaseStatusLabel(currentPhase.status)}` : null}
              latestUpdate={
                project.updates[0]
                  ? { title: project.updates[0].title || excerpt(project.updates[0].description), when: dateShort(project.updates[0].createdAt) }
                  : null
              }
              href="/dashboard/admin/construction"
            />
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted">No active building project.</p>
          )}
        </Panel>

        <Panel title="Recent activity">
          <ActivityFeed items={activityItems} />
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ date/format helpers (church timezone) */

function dateInTz(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CHURCH_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function timeInTz(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: CHURCH_TZ, hour: "numeric", minute: "2-digit" }).format(d);
}
function dateLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: CHURCH_TZ, weekday: "long", month: "long", day: "numeric" }).format(d);
}
function dateShort(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: CHURCH_TZ, month: "short", day: "numeric", year: "numeric" }).format(d);
}
function greetingFor(d: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: CHURCH_TZ, hour: "numeric", hour12: false }).format(d));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
function sameDay(d: Date, start: Date, end: Date): boolean {
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

/** Compact relative time ("just now", "3h ago", "2d ago"). */
function ago(d: Date, now: Date): string {
  const s = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return dateShort(d);
}

function titleize(s: string): string {
  return s
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function excerpt(html: string, n = 60): string {
  const t = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n).trimEnd()}…` : t;
}
function iconForEntity(entity: string): IconName {
  const e = entity.toLowerCase();
  if (e.includes("member")) return "members";
  if (e.includes("household")) return "households";
  if (e.includes("event")) return "calendar";
  if (e.includes("announcement")) return "content";
  if (e.includes("account") || e.includes("user") || e.includes("role")) return "account-requests";
  if (e.includes("transfer")) return "transfer";
  if (e.includes("care")) return "care";
  if (e.includes("visitor")) return "visitors";
  if (e.includes("bulletin") || e.includes("packet")) return "bulletin";
  if (e.includes("construction") || e.includes("building") || e.includes("pledge")) return "building";
  if (e.includes("email")) return "email";
  return "dot";
}
