import Link from "next/link";
import type { EventStatus } from "@prisma/client";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { intervalsOverlap } from "@/lib/calendar";
import { PortalPage, PortalSection, StatGrid, StatCard, EmptyState } from "@/components/portal/home-ui";
import { StatusBadge } from "@/components/calendar/StatusBadge";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Date(d).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** A compact event row used throughout the queues. */
function EventRow({ e }: { e: { id: string; title: string; startAt: Date; status: EventStatus; ministry: { name: string } } }) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link href={`/dashboard/admin/calendar/${e.id}`} className="font-medium text-fg hover:text-primary">{e.title}</Link>
        <p className="mt-0.5 text-sm text-muted">{fmt(e.startAt)} · {e.ministry.name}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge status={e.status} />
        <Link href={`/dashboard/admin/calendar/${e.id}`} className="btn btn-outline px-3 py-1.5 text-sm">Review</Link>
      </div>
    </li>
  );
}

export default async function AdminCalendar() {
  await requireActor("ADMIN", "PASTOR");
  const now = new Date();
  const in120 = new Date(now.getTime() + 120 * 86_400_000);
  const sel = { id: true, title: true, startAt: true, endAt: true, status: true, venueName: true, locationType: true, ministry: { select: { name: true } } } as const;

  const [inbox, changesRequested, readyToPublish, publishedUpcoming, boardIssues, cancelled, counts, upcomingForConflict] =
    await Promise.all([
      prisma.event.findMany({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } }, orderBy: { submittedAt: "asc" }, take: 50, select: sel }),
      prisma.event.findMany({ where: { status: "CHANGES_REQUESTED" }, orderBy: { updatedAt: "desc" }, take: 30, select: sel }),
      prisma.event.findMany({ where: { status: "APPROVED" }, orderBy: { startAt: "asc" }, take: 30, select: sel }),
      prisma.event.findMany({ where: { status: "PUBLISHED", startAt: { gte: now } }, orderBy: { startAt: "asc" }, take: 20, select: sel }),
      prisma.event.findMany({
        where: {
          boardApprovalRequired: true,
          boardApprovalState: { in: ["PENDING", "NOT_APPROVED"] },
          status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "PUBLISHED"] },
        },
        orderBy: { startAt: "asc" },
        take: 20,
        select: sel,
      }),
      prisma.event.findMany({ where: { status: "CANCELLED", startAt: { gte: now } }, orderBy: { startAt: "asc" }, take: 20, select: sel }),
      prisma.event.groupBy({ by: ["status"], _count: true }),
      // Upcoming approved/published events, for a lightweight same-venue conflict scan.
      prisma.event.findMany({
        where: { status: { in: ["APPROVED", "PUBLISHED"] }, startAt: { gte: now, lte: in120 } },
        orderBy: { startAt: "asc" },
        take: 300,
        select: { id: true, title: true, startAt: true, endAt: true, venueName: true, locationType: true, ministry: { select: { name: true } } },
      }),
    ]);

  const countOf = (s: EventStatus) => counts.find((c) => c.status === s)?._count ?? 0;

  // Pairwise same-venue overlap scan (bounded set → cheap). Surfaces likely double-bookings.
  const conflictIds = new Set<string>();
  const conflicts: { a: (typeof upcomingForConflict)[number]; b: (typeof upcomingForConflict)[number] }[] = [];
  for (let i = 0; i < upcomingForConflict.length; i++) {
    for (let j = i + 1; j < upcomingForConflict.length; j++) {
      const a = upcomingForConflict[i]!;
      const b = upcomingForConflict[j]!;
      const physical = (t: string | null) => t === "CHURCH" || t === "EXTERNAL" || t === "HYBRID";
      const sameVenue = physical(a.locationType) && physical(b.locationType) && !!a.venueName && a.venueName.trim().toLowerCase() === (b.venueName ?? "").trim().toLowerCase();
      if (sameVenue && intervalsOverlap(a.startAt, a.endAt, b.startAt, b.endAt)) {
        conflicts.push({ a, b });
        conflictIds.add(a.id);
        conflictIds.add(b.id);
      }
    }
  }

  return (
    <PortalPage title="Calendar" intro="Review, approve, and publish the events departments submit — and manage what's on the public calendar.">
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/admin/calendar/new" className="btn btn-primary px-4 py-2 text-sm">+ Add event</Link>
        <Link href="/calendar" className="btn btn-outline px-4 py-2 text-sm">View public calendar</Link>
      </div>

      <StatGrid>
        <StatCard label="Pending submissions" value={countOf("SUBMITTED")} tone={countOf("SUBMITTED") ? "accent" : "default"} />
        <StatCard label="Under review" value={countOf("UNDER_REVIEW")} />
        <StatCard label="Changes requested" value={countOf("CHANGES_REQUESTED")} tone={countOf("CHANGES_REQUESTED") ? "warn" : "default"} />
        <StatCard label="Ready to publish" value={countOf("APPROVED")} tone={countOf("APPROVED") ? "accent" : "default"} />
        <StatCard label="Published" value={countOf("PUBLISHED")} />
        <StatCard label="Board issues" value={boardIssues.length} tone={boardIssues.length ? "warn" : "default"} />
        <StatCard label="Conflicts" value={conflictIds.size} tone={conflictIds.size ? "warn" : "default"} />
        <StatCard label="Cancelled" value={countOf("CANCELLED")} />
      </StatGrid>

      <PortalSection title={`Approval inbox${inbox.length ? ` (${inbox.length})` : ""}`}>
        {inbox.length ? (
          <ul className="card divide-y divide-line px-5">{inbox.map((e) => <EventRow key={e.id} e={e} />)}</ul>
        ) : (
          <EmptyState title="Inbox zero" hint="No events are waiting for review right now." />
        )}
      </PortalSection>

      {changesRequested.length ? (
        <PortalSection title={`Changes requested (${changesRequested.length})`}>
          <ul className="card divide-y divide-line px-5">{changesRequested.map((e) => <EventRow key={e.id} e={e} />)}</ul>
        </PortalSection>
      ) : null}

      <PortalSection title={`Ready to publish${readyToPublish.length ? ` (${readyToPublish.length})` : ""}`}>
        {readyToPublish.length ? (
          <ul className="card divide-y divide-line px-5">{readyToPublish.map((e) => <EventRow key={e.id} e={e} />)}</ul>
        ) : (
          <EmptyState title="Nothing approved and waiting" hint="Approved events that haven't been published appear here." />
        )}
      </PortalSection>

      {boardIssues.length ? (
        <PortalSection title={`Board-approval issues (${boardIssues.length})`}>
          <p className="text-sm text-muted">These events require board approval but aren’t confirmed approved yet — verify before publishing.</p>
          <ul className="card divide-y divide-line px-5">{boardIssues.map((e) => <EventRow key={e.id} e={e} />)}</ul>
        </PortalSection>
      ) : null}

      {conflicts.length ? (
        <PortalSection title={`Potential scheduling conflicts (${conflicts.length})`}>
          <ul className="card divide-y divide-line px-5">
            {conflicts.slice(0, 20).map(({ a, b }, i) => (
              <li key={i} className="py-3 text-sm">
                <p className="font-medium text-fg">Same venue, overlapping time</p>
                <p className="text-muted">
                  <Link href={`/dashboard/admin/calendar/${a.id}`} className="text-primary hover:underline">{a.title}</Link>
                  {" ↔ "}
                  <Link href={`/dashboard/admin/calendar/${b.id}`} className="text-primary hover:underline">{b.title}</Link>
                  {" · "}{a.venueName} · {fmt(a.startAt)}
                </p>
              </li>
            ))}
          </ul>
        </PortalSection>
      ) : null}

      <PortalSection title={`Published — upcoming${publishedUpcoming.length ? ` (${publishedUpcoming.length})` : ""}`}>
        {publishedUpcoming.length ? (
          <ul className="card divide-y divide-line px-5">{publishedUpcoming.map((e) => <EventRow key={e.id} e={e} />)}</ul>
        ) : (
          <EmptyState title="No upcoming published events" hint="Publish an approved event to see it here and on the public calendar." />
        )}
      </PortalSection>

      {cancelled.length ? (
        <PortalSection title={`Cancelled — upcoming (${cancelled.length})`}>
          <ul className="card divide-y divide-line px-5">{cancelled.map((e) => <EventRow key={e.id} e={e} />)}</ul>
        </PortalSection>
      ) : null}
    </PortalPage>
  );
}
