import { Suspense } from "react";
import Link from "next/link";
import { getPublicCalendarEvents } from "@/lib/public-content";
import { googleCalUrl } from "@/lib/ics";
import { excerptHtml } from "@/lib/dates";
import {
  CHURCH_TZ,
  centralMinutes,
  centralTimeLabel,
  centralYmd,
  categoryForSlug,
  monthKeyOf,
  WEEKDAY_LABELS,
  type CalendarEvent,
} from "@/lib/calendar";
import { PageHeader, EmptyState, Skeleton } from "@/components/page-ui";
import { Section, Container } from "@/components/ui";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Calendar",
  description:
    "One month at a time: worship, ministry programs, and gatherings at McKinney SDA Church. Browse by month and add any event to your own calendar.",
};

const longWeekday = (d: Date) =>
  new Date(d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: CHURCH_TZ,
  });

type EventRow = Awaited<ReturnType<typeof getPublicCalendarEvents>>[number];

function toCalendarEvent(e: EventRow): CalendarEvent {
  const startYmd = centralYmd(e.startAt);
  const endYmd = centralYmd(e.endAt);
  return {
    id: e.id,
    title: e.title,
    startYmd,
    endYmd,
    startMinutes: centralMinutes(e.startAt),
    timeLabel: centralTimeLabel(e.startAt),
    multiDay: startYmd !== endYmd,
    isFeatured: e.isFeatured,
    category: categoryForSlug(e.ministry?.slug),
    ministryName: e.ministry?.name ?? null,
    ministrySlug: e.ministry?.slug ?? null,
    location: e.location,
    excerpt: e.descriptionHtml ? excerptHtml(e.descriptionHtml, 160) : null,
    startLongDate: longWeekday(e.startAt),
    endLongDate: longWeekday(e.endAt),
    googleUrl: googleCalUrl(e),
    icsUrl: `/api/calendar/${e.id}`,
  };
}

/** Streams in behind a skeleton; owns the DB read and its error/empty states. */
async function CalendarBody() {
  let events: CalendarEvent[];
  try {
    const rows = await getPublicCalendarEvents();
    events = rows.map(toCalendarEvent);
  } catch {
    return (
      <EmptyState
        title="We couldn't load the calendar"
        body="Something went wrong fetching events. Please refresh the page in a moment — if it keeps happening, let us know."
      />
    );
  }

  const now = new Date();
  return <MonthCalendar events={events} initialMonth={monthKeyOf(now)} todayYmd={centralYmd(now)} />;
}

/** Fixed-shape placeholder so the page reserves the calendar's height while events load. */
function CalendarSkeleton() {
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8 xl:gap-10" aria-hidden="true">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-7 w-40" />
          </div>
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
        <div className="mt-6 overflow-hidden rounded-xl border border-line">
          <div className="grid grid-cols-7 border-b border-line bg-surface-2">
            {WEEKDAY_LABELS.map((wd) => (
              <div key={wd} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted/60">
                {wd}
              </div>
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, r) => (
            <div key={r} className="grid grid-cols-7">
              {Array.from({ length: 7 }).map((_, c) => (
                <div key={c} className="min-h-14 border-b border-r border-line p-1.5 last:border-r-0 sm:min-h-28">
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8 lg:mt-0">
        <div className="card space-y-3 p-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function Calendar() {
  return (
    <>
      <PageHeader
        title="Calendar"
        lede="Everything happening in the life of our church family — one month at a time. Add any event to your own calendar with one tap."
        tone="denim"
      />

      <Section size="wide">
        <Suspense fallback={<CalendarSkeleton />}>
          <CalendarBody />
        </Suspense>
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
