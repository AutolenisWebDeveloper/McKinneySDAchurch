/**
 * Pure scheduling logic for the weekly bulletin crons (§11, §12, §18, §26) — no I/O.
 * Deterministic Sabbath-week + Friday-5pm-Central resolution and reminder-state targeting,
 * kept pure so it is fully unit-tested and DST-safe (all TZ math delegates to tz.ts / Intl).
 */
import { centralWallToUtc } from "./tz";
import type { SubmissionState } from "./weekly-packet";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The UTC instant of 5:00 PM America/Chicago on the Friday before a given Sabbath.
 * `sabbathDate` is the Saturday at UTC midnight (as produced by `upcomingSabbath`).
 * DST-safe: 5pm CDT (summer) and 5pm CST (winter) resolve to different UTC instants correctly.
 */
export function bulletinFridayInstant(sabbathDate: Date): Date {
  const friday = new Date(sabbathDate.getTime() - DAY_MS);
  const y = friday.getUTCFullYear();
  const mo = String(friday.getUTCMonth() + 1).padStart(2, "0");
  const d = String(friday.getUTCDate()).padStart(2, "0");
  const instant = centralWallToUtc(`${y}-${mo}-${d}T17:00`);
  // centralWallToUtc only returns null on a malformed string; the composed value is always valid.
  return instant ?? new Date(friday.getTime() + 22 * 60 * 60 * 1000);
}

/**
 * Whether the Friday 5PM member distribution is due at `now` for `sabbathDate`. True once the
 * clock reaches 5PM Central on that Friday and before the Sabbath itself passes (a wide window;
 * the per-bulletin distribution ledger is what actually prevents a duplicate send).
 */
export function isFridayDistributionDue(now: Date, sabbathDate: Date): boolean {
  const due = bulletinFridayInstant(sabbathDate);
  const sabbathEnd = new Date(sabbathDate.getTime() + DAY_MS); // end of Sabbath day (UTC)
  return now.getTime() >= due.getTime() && now.getTime() < sabbathEnd.getTime();
}

/* ---- Wednesday targeted-reminder resolution (§12) ---- */

export type ReminderState = "NO_SUBMISSION" | "DRAFT" | "CHANGES_REQUESTED" | "SUBMITTED";

export type ReminderSubmissionView = {
  /** Canonical submission state (normalized). */
  state: SubmissionState;
  /** True for an explicit "nothing this week" marker (kind === NOTHING_THIS_WEEK). */
  isNothing: boolean;
};

/**
 * Decide which (if any) Wednesday reminder a department head should receive, given all of their
 * submissions for the packet. Returns `null` when no reminder is warranted (already submitted /
 * approved, or explicitly marked nothing this week) so the cron never nags unnecessarily.
 *
 * Precedence: unresolved admin feedback → unfinished draft → (submitted/approved ⇒ none) →
 * (explicit nothing ⇒ none) → never submitted anything.
 */
export function resolveWednesdayReminderState(subs: ReminderSubmissionView[]): ReminderState | null {
  const real = subs.filter((s) => !s.isNothing);
  if (real.some((s) => s.state === "CHANGES_REQUESTED")) return "CHANGES_REQUESTED";
  if (real.some((s) => s.state === "DRAFT")) return "DRAFT";
  if (real.length > 0) return null; // submitted / under review / approved — action not required
  if (subs.some((s) => s.isNothing)) return null; // explicitly nothing this week
  return "NO_SUBMISSION";
}

/** Compact personal status used to tailor the Monday reminder copy (§11). */
export type MondayPersonalState = "NONE" | "DRAFT" | "SUBMITTED" | "CHANGES_REQUESTED" | "NOTHING";

export function resolveMondayPersonalState(subs: ReminderSubmissionView[]): MondayPersonalState {
  const real = subs.filter((s) => !s.isNothing);
  if (real.some((s) => s.state === "CHANGES_REQUESTED")) return "CHANGES_REQUESTED";
  if (real.some((s) => s.state === "DRAFT")) return "DRAFT";
  if (real.length > 0) return "SUBMITTED";
  if (subs.some((s) => s.isNothing)) return "NOTHING";
  return "NONE";
}
