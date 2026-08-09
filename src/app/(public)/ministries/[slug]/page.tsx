import { notFound } from "next/navigation";
import { getMinistryBySlug, getApprovedAnnouncementsForMinistry, getUpcomingEventsForMinistry } from "@/lib/public-content";
export const dynamic = "force-dynamic";
export default async function MinistryDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = await getMinistryBySlug(slug);
  if (!m) notFound();
  const [anns, events] = await Promise.all([getApprovedAnnouncementsForMinistry(m.id), getUpcomingEventsForMinistry(m.id)]);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{m.name}</h1>
        {m.leader?.name ? <p className="text-muted text-sm mt-1">Led by {m.leader.name}</p> : null}
        {m.description ? <p className="mt-3 max-w-2xl">{m.description}</p> : null}
      </div>
      <section><h2 className="font-semibold mb-2">Announcements</h2>
        {anns.length ? <ul className="space-y-2">{anns.map((a) => <li key={a.id}>{a.title}</li>)}</ul> : <p className="text-muted">None right now.</p>}
      </section>
      <section><h2 className="font-semibold mb-2">Upcoming events</h2>
        {events.length ? <ul className="space-y-2">{events.map((e) => <li key={e.id}>{e.title} — {new Date(e.startAt).toLocaleString("en-US", { timeZone: "America/Chicago" })}</li>)}</ul> : <p className="text-muted">None scheduled.</p>}
      </section>
    </div>
  );
}
