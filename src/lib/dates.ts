/**
 * Shared public date/time formatting in the church's timezone. Consolidates the
 * America/Chicago `toLocaleString` calls that were re-implemented inline across
 * the calendar, homepage, and ministry pages. Presentation only.
 */
export const CHURCH_TZ = "America/Chicago";

const at = (d: Date | string, opts: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleString("en-US", { timeZone: CHURCH_TZ, ...opts });

/** "Aug" — short month for a date chip. */
export const monthShort = (d: Date | string) => at(d, { month: "short" });
/** "9" — day-of-month for a date chip. */
export const dayNum = (d: Date | string) => at(d, { day: "numeric" });
/** "August 2026" — month + year heading for grouping. */
export const monthYear = (d: Date | string) => at(d, { month: "long", year: "numeric" });
/** Stable "2026-08" key for grouping by month. */
export const monthKey = (d: Date | string) => at(d, { year: "numeric", month: "2-digit" });
/** "Saturday · 11:00 AM" — weekday + time for an event row. */
export const weekdayTime = (d: Date | string) => at(d, { weekday: "long", hour: "numeric", minute: "2-digit" });
/** "August 9, 2026" — long date. */
export const longDate = (d: Date | string) => at(d, { month: "long", day: "numeric", year: "numeric" });

/** Plain-text excerpt from sanitized HTML (no HTML injected into the DOM). */
export function excerptHtml(html: string, n = 140): string {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > n ? `${text.slice(0, n).trimEnd()}…` : text;
}
