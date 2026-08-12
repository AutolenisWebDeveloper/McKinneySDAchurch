import { describe, it, expect } from "vitest";
import {
  bulletinFridayInstant, isFridayDistributionDue, resolveWednesdayReminderState,
  resolveMondayPersonalState, type ReminderSubmissionView,
} from "@/lib/bulletin-schedule";
import { upcomingSabbath } from "@/lib/weekly-packet";

const sabbath = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("bulletinFridayInstant (§18/§26 — Friday 5PM America/Chicago, DST-safe)", () => {
  it("resolves to 22:00 UTC during Central Daylight Time (summer)", () => {
    // Sabbath 2026-08-15 → Friday 2026-08-14, CDT (UTC-5): 17:00 CDT = 22:00 UTC.
    const t = bulletinFridayInstant(sabbath("2026-08-15"));
    expect(t.toISOString()).toBe("2026-08-14T22:00:00.000Z");
  });
  it("resolves to 23:00 UTC during Central Standard Time (winter)", () => {
    // Sabbath 2026-01-17 → Friday 2026-01-16, CST (UTC-6): 17:00 CST = 23:00 UTC.
    const t = bulletinFridayInstant(sabbath("2026-01-17"));
    expect(t.toISOString()).toBe("2026-01-16T23:00:00.000Z");
  });
});

describe("isFridayDistributionDue", () => {
  const sab = sabbath("2026-08-15");
  it("is not due before 5PM Central Friday", () => {
    expect(isFridayDistributionDue(new Date("2026-08-14T21:59:00Z"), sab)).toBe(false);
  });
  it("is due at/after 5PM Central Friday", () => {
    expect(isFridayDistributionDue(new Date("2026-08-14T22:00:00Z"), sab)).toBe(true);
    expect(isFridayDistributionDue(new Date("2026-08-15T12:00:00Z"), sab)).toBe(true);
  });
  it("is no longer due after the Sabbath day passes", () => {
    expect(isFridayDistributionDue(new Date("2026-08-16T01:00:00Z"), sab)).toBe(false);
  });
  it("upcomingSabbath on a Friday points at the next day's Sabbath", () => {
    expect(upcomingSabbath(new Date("2026-08-14T22:00:00Z")).toISOString().slice(0, 10)).toBe("2026-08-15");
  });
});

describe("resolveWednesdayReminderState (§12 — targeted, not blanket)", () => {
  const v = (state: ReminderSubmissionView["state"], isNothing = false): ReminderSubmissionView => ({ state, isNothing });
  it("prioritizes admin changes-requested feedback", () => {
    expect(resolveWednesdayReminderState([v("CHANGES_REQUESTED"), v("DRAFT")])).toBe("CHANGES_REQUESTED");
  });
  it("nudges an unfinished draft", () => {
    expect(resolveWednesdayReminderState([v("DRAFT")])).toBe("DRAFT");
  });
  it("does NOT remind when content is already submitted/approved", () => {
    expect(resolveWednesdayReminderState([v("SUBMITTED")])).toBeNull();
    expect(resolveWednesdayReminderState([v("APPROVED")])).toBeNull();
    expect(resolveWednesdayReminderState([v("UNDER_REVIEW")])).toBeNull();
  });
  it("does NOT remind when explicitly nothing this week", () => {
    expect(resolveWednesdayReminderState([v("SUBMITTED", true)])).toBeNull();
  });
  it("reminds heads who submitted nothing at all", () => {
    expect(resolveWednesdayReminderState([])).toBe("NO_SUBMISSION");
  });
});

describe("resolveMondayPersonalState (§11 — personalized copy)", () => {
  const v = (state: ReminderSubmissionView["state"], isNothing = false): ReminderSubmissionView => ({ state, isNothing });
  it("summarizes the head's current standing", () => {
    expect(resolveMondayPersonalState([])).toBe("NONE");
    expect(resolveMondayPersonalState([v("DRAFT")])).toBe("DRAFT");
    expect(resolveMondayPersonalState([v("SUBMITTED")])).toBe("SUBMITTED");
    expect(resolveMondayPersonalState([v("CHANGES_REQUESTED")])).toBe("CHANGES_REQUESTED");
    expect(resolveMondayPersonalState([v("SUBMITTED", true)])).toBe("NOTHING");
  });
});
