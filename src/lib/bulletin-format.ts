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

const shortDow = (d: Date) => new Date(d).toLocaleString("en-US", { timeZone: CHURCH_TZ, weekday: "short" }).toUpperCase();
const shortMon = (d: Date) => new Date(d).toLocaleString("en-US", { timeZone: CHURCH_TZ, month: "short" }).toUpperCase();
const dom = (d: Date) => new Date(d).toLocaleString("en-US", { timeZone: CHURCH_TZ, day: "numeric" });
const compactTime = (d: Date) => new Date(d).toLocaleString("en-US", { timeZone: CHURCH_TZ, hour: "numeric", minute: "2-digit" }).replace(":00", "");

/** Compact uppercase timing chip for print, e.g. "FRI · AUG 14 · 6 PM". Null when no start. */
export function eventChip(start?: Date | null): string | null {
  if (!start) return null;
  return `${shortDow(start)} · ${shortMon(start)} ${dom(start)} · ${compactTime(start)}`;
}
