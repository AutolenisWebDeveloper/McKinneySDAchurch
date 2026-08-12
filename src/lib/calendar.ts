/**
 * Pure, dependency-free helpers for the public single-month calendar.
 *
 * Everything here is framework-agnostic and unit-tested (src/tests/calendar-grid.test.ts):
 * civil-date math for the month grid, timezone-correct bucketing of events onto the day they
 * fall on *in the church's timezone*, and the semantic category system that colors event chips.
 *
 * Why civil dates (plain YYYY-MM-DD strings): a calendar cell is a wall-clock day, not an
 * instant. An event stored at 2026-02-22T00:00:00Z is 6:00 PM on Feb 21 in America/Chicago and
 * must land on the 21st. We resolve every instant to its Central calendar day once, then do all
 * grid math on those strings so nothing drifts by a day at midnight or across DST.
 */
import type { IconName } from "@/components/portal/icons";

export const CHURCH_TZ = "America/Chicago";

// ---------------------------------------------------------------------------
// Civil-date (YYYY-MM-DD) helpers
// ---------------------------------------------------------------------------

/** A wall-clock calendar day, independent of any timezone. */
export type Ymd = string; // "2026-08-15"

const ymdFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHURCH_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The church-timezone calendar day an instant falls on, as "YYYY-MM-DD". */
export function centralYmd(date: Date | string): Ymd {
  return ymdFmt.format(new Date(date));
}

/** Minutes past local midnight (Central) for an instant — for intra-day sorting/labels. */
export function centralMinutes(date: Date | string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHURCH_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(date));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

/** "11:15 AM" — time-of-day only, in the church timezone. */
export function centralTimeLabel(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CHURCH_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

/** Build "YYYY-MM-DD" from civil parts (month is 1-based here for readability). */
export function toYmd(year: number, month1: number, day: number): Ymd {
  return `${year}-${String(month1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse a "YYYY-MM-DD" into civil parts (month is 1-based). */
export function parseYmd(ymd: Ymd): { year: number; month1: number; day: number } {
  const [y, m, d] = ymd.split("-").map(Number);
  return { year: y!, month1: m!, day: d! };
}

// ---------------------------------------------------------------------------
// Month grid
// ---------------------------------------------------------------------------

export type MonthKey = { year: number; month: number }; // month is 0-based (0 = Jan)

export type DayCell = {
  ymd: Ymd;
  day: number; // day-of-month
  inMonth: boolean; // belongs to the focused month (vs. leading/trailing filler)
  isToday: boolean;
  weekday: number; // 0 = Sun … 6 = Sat
};

/** English month name for a 0-based month index (locale-formatted, church tz-safe). */
export function monthLabel({ year, month }: MonthKey, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month, 1)),
  );
}

/** Move a month key by ±n months, normalizing the year. */
export function addMonths({ year, month }: MonthKey, delta: number): MonthKey {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** The month key an instant belongs to, in the church timezone. */
export function monthKeyOf(date: Date | string): MonthKey {
  const { year, month1 } = parseYmd(centralYmd(date));
  return { year, month: month1 - 1 };
}

/**
 * A fixed 6×7 (42-cell) Sunday→Saturday grid for the given month. The row count is constant so
 * the calendar never changes height between months (no layout shift). `todayYmd` is passed in
 * (resolved server-side in Central) so "today" is identical on server and client — no hydration
 * mismatch and no dependency on the client clock.
 */
export function buildMonthGrid({ year, month }: MonthKey, todayYmd: Ymd): DayCell[] {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0 = Sun
  const cells: DayCell[] = [];
  // Start on the Sunday on/just before the 1st.
  const start = new Date(Date.UTC(year, month, 1 - firstWeekday));
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    const ymd = toYmd(y, m + 1, day);
    cells.push({
      ymd,
      day,
      inMonth: m === month && y === year,
      isToday: ymd === todayYmd,
      weekday: d.getUTCDay(),
    });
  }
  return cells;
}

/** Inclusive list of civil days an event spans, from its start day to its end day. */
export function expandEventDays(startYmd: Ymd, endYmd: Ymd): Ymd[] {
  const s = parseYmd(startYmd);
  const e = parseYmd(endYmd);
  let cur = Date.UTC(s.year, s.month1 - 1, s.day);
  const end = Date.UTC(e.year, e.month1 - 1, e.day);
  const out: Ymd[] = [];
  // Guard against inverted/absurd ranges so a bad row can't loop forever.
  for (let i = 0; cur <= end && i < 400; i++, cur += 86_400_000) {
    const d = new Date(cur);
    out.push(toYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
  }
  return out.length ? out : [startYmd];
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAY_LABELS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

// ---------------------------------------------------------------------------
// Semantic event categories (color is never the only signal — each has an
// icon + a label, and the chip text always sits on theme tokens for AA).
// ---------------------------------------------------------------------------

export type CategoryKey = "worship" | "youth" | "children" | "family" | "outreach";

export type Category = {
  key: CategoryKey;
  label: string;
  icon: IconName;
  /** Fixed brand hue used for the leading dot / marker (readable in light and dark). */
  dotClass: string;
  /** Soft tinted surface for the selected/legend chip. */
  softClass: string;
};

export const CATEGORIES: Record<CategoryKey, Category> = {
  worship: { key: "worship", label: "Worship & Devotion", icon: "sabbath-school", dotClass: "bg-denim-700", softClass: "bg-denim-500/10 text-denim-800 dark:text-denim-100" },
  youth: { key: "youth", label: "Youth", icon: "committees", dotClass: "bg-teal", softClass: "bg-teal/10 text-denim-800 dark:text-denim-100" },
  children: { key: "children", label: "Children", icon: "members", dotClass: "bg-bright-teal", softClass: "bg-bright-teal/10 text-denim-800 dark:text-denim-100" },
  family: { key: "family", label: "Family", icon: "households", dotClass: "bg-gold", softClass: "bg-gold/15 text-denim-800 dark:text-denim-100" },
  outreach: { key: "outreach", label: "Outreach", icon: "care", dotClass: "bg-orange", softClass: "bg-orange/10 text-denim-800 dark:text-denim-100" },
};

export const CATEGORY_ORDER: CategoryKey[] = ["worship", "youth", "children", "family", "outreach"];

/**
 * The serializable event shape the server hands the client calendar. Instants are resolved to
 * Central civil days + labels on the server so the client ships no timezone logic and there is
 * no server/client hydration drift.
 */
export type CalendarEvent = {
  id: string;
  title: string;
  startYmd: Ymd;
  endYmd: Ymd;
  startMinutes: number;
  timeLabel: string; // "11:15 AM" (start, Central)
  multiDay: boolean;
  isFeatured: boolean;
  category: CategoryKey;
  ministryName: string | null;
  ministrySlug: string | null;
  location: string | null;
  excerpt: string | null; // plain-text, already stripped of HTML
  startLongDate: string; // "Saturday, August 15, 2026"
  endLongDate: string;
  googleUrl: string;
  icsUrl: string;
};

/** Map a ministry slug to one of the restrained semantic categories. */
export function categoryForSlug(slug: string | null | undefined): CategoryKey {
  switch (slug) {
    case "youth-ministries":
      return "youth";
    case "childrens-ministries":
      return "children";
    case "family-ministries":
    case "womens-ministries":
      return "family";
    case "personal-ministries":
    case "community-services":
    case "health-ministries":
    case "hospitality":
      return "outreach";
    case "church-calendar":
    case "prayer-ministry":
    default:
      return "worship";
  }
}
