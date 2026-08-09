import Link from "next/link";
import { notFound } from "next/navigation";
import { getMinistryBySlug, getApprovedAnnouncementsForMinistry, getUpcomingEventsForMinistry } from "@/lib/public-content";
import { safe } from "@/lib/safe";
import { PageHeader } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = await safe(getMinistryBySlug(slug), null);
  return { title: m?.name ?? "Ministry", description: m?.description ?? undefined };
}

export default async function MinistryDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = await safe(getMinistryBySlug(slug), null);
  if (!m) notFound();
  const [anns, events] = await Promise.all([
    safe(getApprovedAnnouncementsForMinistry(m.id), []),
    safe(getUpcomingEventsForMinistry(m.id), []),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Ministry"
        title={m.name}
        lede={m.description ?? undefined}
        actions={<Link href="/ministries" className="btn btn-outline">All ministries</Link>}
      />
      <Section>
        {m.leader?.name ? (
          <p className="mb-8 text-sm text-muted">Led by <span className="font-semibold text-fg">{m.leader.name}</span></p>
        ) : null}

        <div className="grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Announcements</h2>
            {anns.length ? (
              <ul className="space-y-3">
                {anns.map((a) => (
                  <li key={a.id} className="card p-5">
                    <h3 className="font-serif text-base font-semibold text-fg">{a.title}</h3>
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted">Nothing to share right now.</p>}
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Upcoming events</h2>
            {events.length ? (
              <ul className="space-y-3">
                {events.map((e) => (
                  <li key={e.id} className="card p-5">
                    <h3 className="font-serif text-base font-semibold text-fg">{e.title}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {new Date(e.startAt).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted">No events scheduled yet.</p>}
          </section>
        </div>
      </Section>
    </>
  );
}
