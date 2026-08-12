import Link from "next/link";
import type { EventStatus, Prisma } from "@prisma/client";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { eventOwnerScope } from "@/lib/rbac";
import { PortalPage, EmptyState } from "@/components/portal/home-ui";
import { StatusBadge } from "@/components/calendar/StatusBadge";

export const dynamic = "force-dynamic";

/** The workspace tabs. Each maps to a set of lifecycle states (and, for "past", a time filter). */
const TABS: { key: string; label: string; statuses?: EventStatus[]; past?: boolean }[] = [
  { key: "all", label: "All" },
  { key: "drafts", label: "Drafts", statuses: ["DRAFT"] },
  { key: "submitted", label: "Submitted", statuses: ["SUBMITTED", "UNDER_REVIEW"] },
  { key: "changes", label: "Changes requested", statuses: ["CHANGES_REQUESTED"] },
  { key: "approved", label: "Approved", statuses: ["APPROVED"] },
  { key: "published", label: "Published", statuses: ["PUBLISHED"] },
  { key: "past", label: "Past", past: true },
];

const fmt = (d: Date) =>
  new Date(d).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default async function MyEvents({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const actor = await requireActor("MINISTRY_HEAD", "ADMIN", "PASTOR");
  const { tab = "all" } = await searchParams;
  const scope = eventOwnerScope(actor);

  // Base scope: department heads see their departments' events (plus anything they authored);
  // admins/pastors see everything.
  const base: Prisma.EventWhereInput = scope.all
    ? {}
    : { OR: [{ ministryId: { in: scope.ministryIds } }, { createdById: actor.userId }] };

  // Counts per tab (in one grouped query where possible).
  const grouped = await prisma.event.groupBy({ by: ["status"], where: base, _count: true });
  const countByStatus = new Map(grouped.map((g) => [g.status, g._count]));
  const tabCount = (t: (typeof TABS)[number]) =>
    t.past || !t.statuses ? undefined : t.statuses.reduce((n, s) => n + (countByStatus.get(s) ?? 0), 0);

  const active = TABS.find((t) => t.key === tab) ?? TABS[0]!;
  const now = new Date();
  const where: Prisma.EventWhereInput = active.past
    ? { ...base, startAt: { lt: now }, status: { in: ["PUBLISHED", "APPROVED", "CANCELLED"] } }
    : active.statuses
      ? { ...base, status: { in: active.statuses } }
      : base;

  const events = await prisma.event.findMany({
    where,
    orderBy: active.past ? { startAt: "desc" } : { updatedAt: "desc" },
    take: 100,
    include: { ministry: { select: { name: true } } },
  });

  return (
    <PortalPage
      title="My Events"
      intro="Create, track, and manage your department's events through approval and publication."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1.5" aria-label="Event status">
          {TABS.map((t) => {
            const n = tabCount(t);
            const on = t.key === active.key;
            return (
              <Link
                key={t.key}
                href={`/dashboard/ministry/events?tab=${t.key}`}
                aria-current={on ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  on ? "border-primary bg-primary/10 text-fg" : "border-line-strong bg-surface text-muted hover:text-fg"
                }`}
              >
                {t.label}
                {n ? <span className="rounded-full bg-denim-700/10 px-1.5 text-xs font-semibold text-denim-800 dark:text-denim-100">{n}</span> : null}
              </Link>
            );
          })}
        </nav>
        <Link href="/dashboard/ministry/events/new" className="btn btn-primary px-4 py-2 text-sm">+ Submit event</Link>
      </div>

      {events.length ? (
        <ul className="card divide-y divide-line px-5">
          {events.map((e) => (
            <li key={e.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link href={`/dashboard/ministry/events/${e.id}`} className="font-medium text-fg hover:text-primary">
                  <span className="truncate">{e.title}</span>
                </Link>
                <p className="mt-0.5 text-sm text-muted">
                  {fmt(e.startAt)}
                  {e.location ? ` · ${e.location}` : ""}
                  {scope.all ? ` · ${e.ministry.name}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={e.status} />
                <Link href={`/dashboard/ministry/events/${e.id}`} className="btn btn-outline px-3 py-1.5 text-sm">Open</Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={active.key === "all" ? "No events yet" : `Nothing ${active.label.toLowerCase()}`}
          hint="Submit an event and track it here from draft through publication."
        />
      )}
    </PortalPage>
  );
}
