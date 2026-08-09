import Link from "next/link";
import { getServiceTimes, getSetting } from "@/lib/site";
import { getApprovedAnnouncements, getUpcomingEvents, getLatestSermon } from "@/lib/public-content";
import { churchJsonLd } from "@/lib/structured-data";
import { getLocale, t } from "@/lib/i18n";
import { env } from "@/env";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [times, livestream, anns, events, sermon] = await Promise.all([
    getServiceTimes(),
    getSetting("livestream_url"),
    getApprovedAnnouncements(4),
    getUpcomingEvents(4),
    getLatestSermon(),
  ]);
  const locale = await getLocale();
  const jsonLd = churchJsonLd({ name: "McKinney SDA Church", url: env.NEXT_PUBLIC_SITE_URL, address: { city: "McKinney", state: "TX" }, serviceTimes: times ?? undefined });
  const fmt = (d: Date) => new Date(d).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="rounded-xl bg-sda-navy text-white p-8">
        <h1 className="text-3xl font-bold">{t(locale, "home.title")}</h1>
        <p className="mt-2 max-w-2xl opacity-90">
{t(locale, "home.subtitle")}
        </p>
        {times ? (
          <dl className="mt-5 flex flex-wrap gap-8 text-sm">
            {times.sabbathSchool ? (<div><dt className="opacity-80">Sabbath School</dt><dd className="font-semibold">Sat {times.sabbathSchool}</dd></div>) : null}
            {times.divineWorship ? (<div><dt className="opacity-80">Divine Worship</dt><dd className="font-semibold">Sat {times.divineWorship}</dd></div>) : null}
            {times.prayerMeeting ? (<div><dt className="opacity-80">Prayer Meeting</dt><dd className="font-semibold">{times.prayerMeeting}</dd></div>) : null}
          </dl>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          {livestream ? <a href={livestream} target="_blank" rel="noopener noreferrer" className="rounded bg-white text-sda-navy px-4 py-2 font-medium">Watch Live</a> : null}
          <Link href="/beliefs" className="rounded border border-white/40 px-4 py-2">{t(locale, "home.beliefs")}</Link>
        </div>
      </section>

      <section aria-labelledby="ann-h">
        <h2 id="ann-h" className="text-xl font-semibold mb-4">Announcements</h2>
        {anns.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {anns.map((a) => (
              <li key={a.id} className="rounded border border-black/10 dark:border-white/10 p-4">
                <h3 className="font-medium">{a.title}</h3>
              </li>
            ))}
          </ul>
        ) : <p className="text-muted">No announcements yet.</p>}
      </section>

      <section aria-labelledby="ev-h">
        <h2 id="ev-h" className="text-xl font-semibold mb-4">Upcoming events</h2>
        {events.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {events.map((e) => (
              <li key={e.id} className="rounded border border-black/10 dark:border-white/10 p-4">
                <h3 className="font-medium">{e.title}</h3>
                <p className="text-sm text-muted">{fmt(e.startAt)}</p>
              </li>
            ))}
          </ul>
        ) : <p className="text-muted">No upcoming events posted.</p>}
      </section>

      <section aria-labelledby="s-h">
        <h2 id="s-h" className="text-xl font-semibold mb-4">Latest sermon</h2>
        {sermon ? (
          <div className="rounded border border-black/10 dark:border-white/10 p-4">
            <h3 className="font-medium">{sermon.title}</h3>
            {sermon.speaker ? <p className="text-sm text-muted">{sermon.speaker}</p> : null}
          </div>
        ) : <p className="text-muted">No sermons posted yet.</p>}
      </section>
    </div>
  );
}
