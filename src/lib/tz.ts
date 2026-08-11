/**
 * Timezone helpers for the church's local time (Central).
 *
 * Admins enter event times as wall-clock Central time via `<input type="datetime-local">`,
 * which yields a naive string like "2026-08-15T19:00" with no zone. We must interpret that
 * as America/Chicago and store the correct UTC instant — otherwise a serverless (UTC) host
 * would read it as 19:00 UTC and the public calendar (rendered in America/Chicago) would
 * show it hours early. These helpers convert both directions using the platform Intl data,
 * so daylight-saving is handled correctly without a date library.
 */

export const CHURCH_TZ = "America/Chicago";

/** Minutes that `tz` is offset from UTC at the given instant (e.g. Central summer → -300). */
function tzOffsetMinutes(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0; // some engines emit "24" for midnight
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUTC - date.getTime()) / 60000;
}

/**
 * Convert a naive "YYYY-MM-DDTHH:mm" wall-clock string, understood as Central time, into the
 * correct UTC `Date`. Returns `null` if the string isn't a well-formed datetime-local value.
 */
export function centralWallToUtc(wall: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(wall.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m as unknown as string[];
  // First guess: treat the wall time as if it were UTC, then correct by the zone offset at
  // that instant. One correction is exact except within the ~1h DST gap/overlap, which is
  // immaterial for scheduling church events.
  const guess = Date.UTC(+y!, +mo! - 1, +d!, +h!, +mi!, s ? +s : 0);
  const offset = tzOffsetMinutes(new Date(guess), CHURCH_TZ);
  return new Date(guess - offset * 60000);
}

/**
 * Format a `Date` as the Central wall-clock "YYYY-MM-DDTHH:mm" string an
 * `<input type="datetime-local">` expects, for pre-filling edit forms.
 */
export function utcToCentralWall(date: Date): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHURCH_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}
