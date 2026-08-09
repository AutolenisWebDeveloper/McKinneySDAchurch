/** Care/attendance signal logic. Pure + testable. */
export function careCutoff(asOf: Date, weeks: number): Date {
  return new Date(+asOf - weeks * 7 * 86400000);
}

/** Missing = we HAVE an attendance signal and it's older than the cutoff. Null = no signal -> not missing. */
export function isMissing(lastAttendance: Date | null | undefined, asOf: Date, weeks: number): boolean {
  if (!lastAttendance) return false;
  return +new Date(lastAttendance) < +careCutoff(asOf, weeks);
}

function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((+t - +firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Stable per-member, per-week key so a daily scan can't create duplicate alerts for one absence. */
export function careDedupeKey(memberId: string, asOf: Date): string {
  return `${memberId}:${isoWeek(asOf)}`;
}
