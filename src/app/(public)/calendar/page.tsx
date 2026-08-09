import { getUpcomingEvents } from "@/lib/public-content";
import { googleCalUrl } from "@/lib/ics";
export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar — McKinney SDA Church" };
export default async function Calendar() {
  const events = await getUpcomingEvents(50);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>
      {events.length ? (
        <ul className="space-y-4">
          {events.map((e) => (
            <li key={e.id} className="rounded border border-black/10 dark:border-white/10 p-4">
              <p className="font-medium">{e.title}</p>
              <p className="text-sm text-muted">{new Date(e.startAt).toLocaleString("en-US", { timeZone: "America/Chicago" })}{e.location ? ` · ${e.location}` : ""}</p>
              <div className="mt-2 text-sm flex gap-4">
                <a className="underline" href={googleCalUrl(e)} target="_blank" rel="noopener noreferrer">Add to Google</a>
                <a className="underline" href={`/api/calendar/${e.id}`}>Download .ics</a>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted">No upcoming events posted.</p>}
    </div>
  );
}
