import { CHURCH_TZ } from "./dates";

/** "6:00 PM" in church time. */
const timeOnly = (d: Date) => new Date(d).toLocaleString("en-US", { timeZone: CHURCH_TZ, hour: "numeric", minute: "2-digit" });
/** "Saturday, August 15" in church time. */
const dayLabel = (d: Date) => new Date(d).toLocaleString("en-US", { timeZone: CHURCH_TZ, weekday: "long", month: "long", day: "numeric" });
const dayKey = (d: Date) => new Date(d).toLocaleString("en-CA", { timeZone: CHURCH_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** Human event date/time label, e.g. "Saturday, August 15 · 6:00–8:00 PM". Null when no start. */
export function eventTimeLabel(start?: Date | null, end?: Date | null): string | null {
  if (!start) return null;
  const base = `${dayLabel(start)} · ${timeOnly(start)}`;
  if (end && dayKey(end) === dayKey(start)) return `${base}–${timeOnly(end)}`;
  if (end) return `${base} – ${dayLabel(end)} ${timeOnly(end)}`;
  return base;
}
