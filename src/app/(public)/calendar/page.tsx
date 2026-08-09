import { getUpcomingEvents } from "@/lib/public-content";
import { googleCalUrl } from "@/lib/ics";
import { PageHeader } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Calendar",
  description: "Upcoming services, events, and gatherings at McKinney SDA Church.",
};

const EXT = "noopener noreferrer";

export default async function Calendar() {
  const events = await getUpcomingEvents(50);
  return (
    <>
      <PageHeader
        eyebrow="What’s coming up"
        title="Calendar"
        lede="Everything happening in the life of our church family. Add an event to your own calendar with one tap."
      />
      <Section>
        {events.length ? (
          <ul className="space-y-4">
            {events.map((e) => {
              const d = new Date(e.startAt);
              return (
                <li key={e.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-denim-600 py-2 text-center text-white">
                    <span className="text-xs font-semibold uppercase tracking-wide text-white/80">{d.toLocaleString("en-US", { timeZone: "America/Chicago", month: "short" })}</span>
                    <span className="text-2xl font-semibold leading-none">{d.toLocaleString("en-US", { timeZone: "America/Chicago", day: "numeric" })}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-lg font-semibold text-fg">{e.title}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {d.toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "long", hour: "numeric", minute: "2-digit" })}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3 text-sm">
                    <a className="font-semibold text-primary hover:text-primary-hover" href={googleCalUrl(e)} target="_blank" rel={EXT}>Add to Google</a>
                    <a className="font-semibold text-primary hover:text-primary-hover" href={`/api/calendar/${e.id}`}>.ics</a>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card p-8 text-center">
            <p className="font-serif text-lg font-semibold text-fg">No upcoming events posted</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">New gatherings will appear here soon. Join us any Sabbath in the meantime.</p>
          </div>
        )}
      </Section>
    </>
  );
}
