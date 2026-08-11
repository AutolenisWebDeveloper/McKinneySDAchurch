import Link from "next/link";
import { getUpcomingEvents } from "@/lib/public-content";
import { safe } from "@/lib/safe";
import { googleCalUrl } from "@/lib/ics";
import { monthShort, dayNum, monthYear, monthKey, weekdayTime, excerptHtml } from "@/lib/dates";
import { PageHeader, EmptyState } from "@/components/page-ui";
import { Section, Container } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Calendar",
  description: "Upcoming services, events, and gatherings at McKinney SDA Church. Add any event to your own calendar with one tap.",
};

const EXT = "noopener noreferrer";

type EventItem = Awaited<ReturnType<typeof getUpcomingEvents>>[number];

export default async function Calendar() {
  const events = await safe(getUpcomingEvents(60), []);

  // Group by month, preserving ascending order.
  const groups: { key: string; label: string; items: EventItem[] }[] = [];
  for (const e of events) {
    const key = monthKey(e.startAt);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: monthYear(e.startAt), items: [] };
      groups.push(g);
    }
    g.items.push(e);
  }

  return (
    <>
      <PageHeader
        eyebrow="What's coming up"
        title="Calendar"
        lede="Everything happening in the life of our church family. Add any event to your own calendar with one tap."
        tone="denim"
      />

      <Section>
        {events.length ? (
          <div className="space-y-14">
            {groups.map((group) => (
              <div key={group.key}>
                <Reveal>
                  <h2 className="flex items-center gap-4 font-serif text-xl font-semibold text-fg">
                    {group.label}
                    <span className="h-px flex-1 bg-line" aria-hidden="true" />
                    <span className="text-sm font-normal text-muted">{group.items.length} {group.items.length === 1 ? "event" : "events"}</span>
                  </h2>
                </Reveal>

                <ul className="mt-6 space-y-4">
                  {group.items.map((e, i) => (
                    <Reveal as="li" key={e.id} delayMs={Math.min(i, 4) * 60}>
                      <div className={`card flex flex-col gap-4 p-5 sm:flex-row sm:items-center ${e.isFeatured ? "ring-1 ring-accent/40" : ""}`}>
                        <div className={`flex w-16 shrink-0 flex-col items-center justify-center rounded-lg py-2 text-center text-white ${e.isFeatured ? "bg-accent-strong" : "bg-denim-600"}`}>
                          <span className="text-xs font-semibold uppercase tracking-wide text-white/80">{monthShort(e.startAt)}</span>
                          <span className="text-2xl font-semibold leading-none">{dayNum(e.startAt)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <h3 className="font-serif text-lg font-semibold text-fg">{e.title}</h3>
                            {e.isFeatured ? <span className="chip border-accent/50 text-accent-strong">Featured</span> : null}
                          </div>
                          <p className="mt-1 text-sm text-muted">
                            {weekdayTime(e.startAt)}
                            {e.location ? ` · ${e.location}` : ""}
                          </p>
                          {e.descriptionHtml ? <p className="mt-1.5 line-clamp-2 text-sm text-muted">{excerptHtml(e.descriptionHtml, 150)}</p> : null}
                          {e.ministry?.name ? (
                            <Link href={`/ministries/${e.ministry.slug}`} className="mt-2 inline-flex text-xs font-semibold uppercase tracking-wide text-primary hover:text-primary-hover">
                              {e.ministry.name}
                            </Link>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-3 text-sm">
                          <a className="font-semibold text-primary hover:text-primary-hover" href={googleCalUrl(e)} target="_blank" rel={EXT}>Add to Google</a>
                          <a className="font-semibold text-primary hover:text-primary-hover" href={`/api/calendar/${e.id}`}>.ics</a>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No upcoming events posted" body="New gatherings will appear here soon. Join us any Sabbath in the meantime." />
        )}
      </Section>

      <section className="bg-tint">
        <Container className="py-12 sm:py-14">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted">Looking for weekly worship times instead?</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/plan-a-visit" className="btn btn-primary">Plan a visit</Link>
              <Link href="/bulletin" className="btn btn-outline">This week's bulletin</Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
