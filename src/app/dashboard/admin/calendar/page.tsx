import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { EventForm } from "./EventForm";
import { createEvent, deleteEvent } from "./actions";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return new Date(d).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminCalendar() {
  await requireActor("ADMIN", "PASTOR");
  const now = new Date();
  const [upcoming, past, ministries] = await Promise.all([
    prisma.event.findMany({
      where: { startAt: { gte: now } },
      orderBy: { startAt: "asc" },
      include: { ministry: { select: { name: true } } },
    }),
    prisma.event.findMany({
      where: { startAt: { lt: now } },
      orderBy: { startAt: "desc" },
      include: { ministry: { select: { name: true } } },
    }),
    prisma.ministry.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const Row = ({ e }: { e: (typeof upcoming)[number] }) => (
    <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-medium text-fg">
          <span className="truncate">{e.title}</span>
          {e.isFeatured ? <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-fg">Featured</span> : null}
          {e.status !== "APPROVED" ? <span className="rounded-full bg-accent-strong/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-accent-strong">{e.status}</span> : null}
        </p>
        <p className="mt-0.5 text-sm text-muted">
          {fmt(e.startAt)}
          {e.location ? ` · ${e.location}` : ""} · {e.ministry.name}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link href={`/dashboard/admin/calendar/${e.id}`} className="btn btn-outline px-3 py-1.5 text-sm">Edit</Link>
        <form action={deleteEvent}>
          <input type="hidden" name="id" value={e.id} />
          <button className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent-strong hover:text-accent-strong">Delete</button>
        </form>
      </div>
    </li>
  );

  return (
    <PortalPage
      title="Calendar"
      intro="Create and manage the events that appear on the public calendar. Events you add here are published immediately."
    >
      <PortalSection title="Add an event">
        {ministries.length ? (
          <div className="card p-5 sm:p-6">
            <EventForm action={createEvent} ministries={ministries} submitLabel="Publish event" />
          </div>
        ) : (
          <EmptyState title="No departments yet" hint="Add a department first, then you can attach events to it." />
        )}
      </PortalSection>

      <PortalSection title={`Upcoming events${upcoming.length ? ` (${upcoming.length})` : ""}`}>
        {upcoming.length ? (
          <ul className="card divide-y divide-line px-5">{upcoming.map((e) => <Row key={e.id} e={e} />)}</ul>
        ) : (
          <EmptyState title="No upcoming events" hint="Add one above — it'll show on the public calendar right away." />
        )}
      </PortalSection>

      {past.length ? (
        <PortalSection title={`Past events${past.length ? ` (${past.length})` : ""}`}>
          <ul className="card divide-y divide-line px-5">{past.map((e) => <Row key={e.id} e={e} />)}</ul>
        </PortalSection>
      ) : null}
    </PortalPage>
  );
}
