import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getMinistryBySlug,
  getApprovedAnnouncementsForMinistry,
  getUpcomingEventsForMinistry,
} from "@/lib/public-content";
import { safe } from "@/lib/safe";
import { PageHeader, Callout } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { MinistryBadge } from "@/components/ministry-badge";
import { getMinistryContent } from "@/lib/ministry-content";
import { church } from "@/components/site-info";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = await safe(getMinistryBySlug(slug), null);
  if (!m) return { title: "Ministry" };
  const content = getMinistryContent(slug, { name: m.name, description: m.description });
  return {
    title: m.name,
    description: m.description?.trim() || content.tagline,
  };
}

function formatEventDate(d: Date | string) {
  return new Date(d).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function MinistryDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = await safe(getMinistryBySlug(slug), null);
  if (!m) notFound();

  const content = getMinistryContent(slug, { name: m.name, description: m.description });
  const [anns, events] = await Promise.all([
    safe(getApprovedAnnouncementsForMinistry(m.id), []),
    safe(getUpcomingEventsForMinistry(m.id), []),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={content.category}
        title={m.name}
        lede={m.description?.trim() || content.tagline}
        actions={<Link href="/ministries" className="btn btn-outline">All ministries</Link>}
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_20rem]">
          {/* Main column */}
          <div className="min-w-0 space-y-12">
            {/* About */}
            <section>
              <div className="flex items-center gap-4">
                <MinistryBadge monogram={content.monogram} size="lg" tone="solid" />
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-fg">About this ministry</h2>
                  <p className="mt-0.5 text-sm text-muted">{content.tagline}</p>
                </div>
              </div>
              <p className="mt-6 text-[1.05rem] leading-relaxed text-fg/90">{content.about}</p>

              {content.activities.length ? (
                <div className="mt-8">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">What we do</h3>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {content.activities.map((a) => (
                      <li key={a} className="flex items-start gap-3">
                        <svg className="mt-0.5 h-5 w-5 shrink-0 text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42l2.79 2.79 6.79-6.79a1 1 0 011.42 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm leading-relaxed text-fg/90">{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {content.scripture ? (
                <blockquote className="mt-8 border-l-4 border-gold/60 pl-5">
                  <p className="font-serif text-lg italic leading-relaxed text-fg/90">
                    &ldquo;{content.scripture.text}&rdquo;
                  </p>
                  <cite className="mt-2 block text-sm font-semibold not-italic text-muted">
                    — {content.scripture.ref}
                  </cite>
                </blockquote>
              ) : null}
            </section>

            {/* Announcements */}
            {anns.length ? (
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Announcements</h2>
                <ul className="space-y-4">
                  {anns.map((a) => (
                    <li key={a.id} className="card p-5">
                      <h3 className="font-serif text-base font-semibold text-fg">{a.title}</h3>
                      {a.contentHtml ? (
                        <div
                          className="richtext mt-2 text-sm text-fg/80"
                          dangerouslySetInnerHTML={{ __html: a.contentHtml }}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Events */}
            {events.length ? (
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Upcoming events</h2>
                <ul className="space-y-4">
                  {events.map((e) => (
                    <li key={e.id} className="card p-5">
                      <h3 className="font-serif text-base font-semibold text-fg">{e.title}</h3>
                      <p className="mt-1 text-sm font-medium text-primary">{formatEventDate(e.startAt)}</p>
                      {e.location ? <p className="mt-0.5 text-sm text-muted">{e.location}</p> : null}
                      {e.descriptionHtml ? (
                        <div
                          className="richtext mt-2 text-sm text-fg/80"
                          dangerouslySetInnerHTML={{ __html: e.descriptionHtml }}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              <h2 className="font-serif text-lg font-semibold text-fg">Ministry details</h2>
              <dl className="mt-4 space-y-4 text-sm">
                {m.leader?.name ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-widest text-muted">Led by</dt>
                    <dd className="mt-0.5 font-semibold text-fg">{m.leader.name}</dd>
                  </div>
                ) : null}
                {content.meets ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-widest text-muted">Meets</dt>
                    <dd className="mt-0.5 text-fg">{content.meets}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-muted">Where</dt>
                  <dd className="mt-0.5 text-fg">{church.meetingPlace}</dd>
                </div>
              </dl>
            </div>

            <div className="card p-6">
              <h2 className="font-serif text-lg font-semibold text-fg">Get involved</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Interested in {m.name}? We'd love to help you get connected and find your place.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link href="/contact" className="btn btn-primary w-full justify-center">Get connected</Link>
                <a href={church.emailHref} className="btn btn-outline w-full justify-center">Email the church</a>
              </div>
            </div>

            {!m.leader?.name ? (
              <Callout tone="info" title="Leadership coming soon">
                A leader for this ministry is being confirmed. In the meantime, reach out and
                we'll point you to the right person.
              </Callout>
            ) : null}
          </aside>
        </div>
      </Section>
    </>
  );
}
