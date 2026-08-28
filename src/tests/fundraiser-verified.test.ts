import { describe, it, expect } from "vitest";
import {
  verifiedTotal,
  candidateTotal,
  fundraiserProgress,
  verifiedThisMonth,
  supporterCount,
  referralCount,
  targetDatePassed,
  buildActivity,
  shareTargets,
} from "@/lib/fundraising";

const at = (s: string) => new Date(s);

describe("verified vs candidate dollars (§3, §4)", () => {
  const ledger = [
    { amount: 500, status: "CONFIRMED", confirmedAt: at("2026-08-02T12:00:00Z") },
    { amount: 250, status: "CONFIRMED", confirmedAt: at("2026-08-14T12:00:00Z") },
    { amount: 9000, status: "PENDING", confirmedAt: null },
    { amount: 400, status: "CANCELLED", confirmedAt: null },
  ];

  it("counts only treasurer-confirmed gifts as verified", () => {
    expect(verifiedTotal(ledger)).toBe(750);
  });

  it("never lets a pending candidate attribution reach the verified total", () => {
    expect(candidateTotal(ledger)).toBe(9000);
    expect(verifiedTotal(ledger)).not.toContain?.(9000);
    expect(verifiedTotal([{ amount: 9000, status: "PENDING" }])).toBe(0);
  });

  it("ignores cancelled gifts entirely", () => {
    expect(verifiedTotal([{ amount: 400, status: "CANCELLED" }])).toBe(0);
    expect(candidateTotal([{ amount: 400, status: "CANCELLED" }])).toBe(0);
  });
});

describe("progress and over-goal (§3, §18)", () => {
  it("computes the spec's worked example", () => {
    const p = fundraiserProgress(7500, 10000);
    expect(p).toMatchObject({ raised: 7500, goal: 10000, pct: 75, barPct: 75, remaining: 2500, goalReached: false });
  });

  it("shows the true percentage over goal but caps the bar at 100", () => {
    const p = fundraiserProgress(11200, 10000);
    expect(p.pct).toBe(112);
    expect(p.barPct).toBe(100);
    expect(p.remaining).toBe(0);
    expect(p.goalReached).toBe(true);
  });

  it("treats exactly on goal as reached", () => {
    expect(fundraiserProgress(10000, 10000).goalReached).toBe(true);
  });

  it("handles the zero state without dividing by zero", () => {
    expect(fundraiserProgress(0, 10000)).toMatchObject({ pct: 0, barPct: 0, remaining: 10000, goalReached: false });
    expect(fundraiserProgress(0, 0)).toMatchObject({ pct: 0, barPct: 0, remaining: 0, goalReached: false });
    expect(fundraiserProgress(500, 0).goalReached).toBe(false);
  });
});

describe("this month, supporters, referrals, target date", () => {
  const now = at("2026-08-15T00:00:00Z");
  const ledger = [
    { amount: 500, status: "CONFIRMED", confirmedAt: at("2026-07-31T23:00:00Z") },
    { amount: 250, status: "CONFIRMED", confirmedAt: at("2026-08-14T12:00:00Z") },
    { amount: 100, status: "CONFIRMED", confirmedAt: at("2026-08-01T00:30:00Z") },
    { amount: 700, status: "PENDING", confirmedAt: null },
  ];

  it("sums only the current calendar month's verified gifts", () => {
    // Compared in local time, which is how the dashboard renders these dates.
    const expected = ledger
      .filter((d) => d.status === "CONFIRMED" && d.confirmedAt!.getMonth() === now.getMonth() && d.confirmedAt!.getFullYear() === now.getFullYear())
      .reduce((s, d) => s + d.amount, 0);
    expect(verifiedThisMonth(ledger, now)).toBe(expected);
    expect(verifiedThisMonth(ledger, now)).toBeLessThan(verifiedTotal(ledger));
  });

  it("counts people, not gifts — one person giving twice is one supporter", () => {
    const repeat = [
      { amount: 100, status: "CONFIRMED", email: "Ada@Example.org", donorName: "Ada" },
      { amount: 250, status: "CONFIRMED", email: "ada@example.org", donorName: "Ada Johnson" },
      { amount: 50, status: "CONFIRMED", email: null, donorName: "Bo" },
    ];
    expect(supporterCount(repeat)).toBe(2);
  });

  it("over-counts rather than under-counts when a gift identifies nobody", () => {
    const anon = [
      { amount: 100, status: "CONFIRMED", email: null, donorName: null },
      { amount: 100, status: "CONFIRMED", email: null, donorName: null },
    ];
    expect(supporterCount(anon)).toBe(2);
  });

  it("omits the supporter count rather than showing zero", () => {
    expect(supporterCount(ledger)).toBe(3);
    expect(supporterCount([{ amount: 100, status: "PENDING" }])).toBeNull();
    expect(supporterCount([])).toBeNull();
  });

  it("omits the referral count rather than showing zero", () => {
    expect(referralCount([{}, {}])).toBe(2);
    expect(referralCount([])).toBeNull();
  });

  it("flags a passed target date without changing anything else", () => {
    expect(targetDatePassed(at("2026-08-01"), now)).toBe(true);
    expect(targetDatePassed(at("2026-12-01"), now)).toBe(false);
    expect(targetDatePassed(null, now)).toBe(false);
    expect(targetDatePassed(undefined, now)).toBe(false);
  });
});

describe("activity feed (§2) — no donor information, ever", () => {
  const activity = buildActivity({
    approvedAt: at("2026-08-01T09:00:00Z"),
    goal: 10000,
    donations: [
      { amount: 5000, status: "CONFIRMED", confirmedAt: at("2026-08-05T10:00:00Z") },
      { amount: 2600, status: "CONFIRMED", confirmedAt: at("2026-08-12T10:00:00Z") },
      { amount: 9999, status: "PENDING", confirmedAt: null },
    ],
    referrals: [{ displayName: "Johnson Family", createdAt: at("2026-08-10T10:00:00Z") }],
  });

  it("is newest first", () => {
    const times = activity.map((a) => a.at.getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("reports one total per reconciliation batch, never per individual gift", () => {
    // A single reconciliation run confirms several gifts with the identical timestamp.
    const sameInstant = at("2026-08-05T10:00:00Z");
    const batch = buildActivity({
      goal: 10000,
      donations: [
        { amount: 3000, status: "CONFIRMED", confirmedAt: sameInstant },
        { amount: 3000, status: "CONFIRMED", confirmedAt: sameInstant },
      ],
    });
    // One $6,000 line, not two $3,000 lines — the individual gift amounts never appear. The
    // batch crosses both 25% and 50% at once, and each of those still gets its own entry.
    expect(batch.map((e) => e.text)).toEqual([
      "You reached 50% of your goal",
      "You reached 25% of your goal",
      "$6,000 added to your verified fundraising progress",
    ]);
    expect(batch.filter((e) => e.kind === "verified_progress")).toHaveLength(1);
    expect(JSON.stringify(batch)).not.toContain("3,000");
  });

  it("cannot be used to infer a single donor's gift from a shared timestamp", () => {
    // Two people gave different amounts, reconciled together. Neither amount is published.
    const together = at("2026-08-09T09:00:00Z");
    const feed = buildActivity({
      goal: 50000,
      donations: [
        { amount: 25, status: "CONFIRMED", confirmedAt: together },
        { amount: 4975, status: "CONFIRMED", confirmedAt: together },
      ],
    });
    const blob = JSON.stringify(feed);
    expect(blob).toContain("$5,000 added");
    expect(blob).not.toContain("$25 ");
    expect(blob).not.toContain("4,975");
  });

  it("opens with the approval entry for a fundraiser with no gifts yet", () => {
    const zero = buildActivity({ approvedAt: at("2026-08-01"), goal: 10000, donations: [] });
    expect(zero).toHaveLength(1);
    expect(zero[0]).toMatchObject({ kind: "approved", text: "Approved and ready to share" });
  });

  it("posts a verified-progress entry per reconciliation and skips pending ones", () => {
    const progress = activity.filter((a) => a.kind === "verified_progress");
    // The two confirmed gifts were reconciled on different days, so they stay separate.
    expect(progress).toHaveLength(2);
    expect(progress.some((p) => p.text.includes("9,999"))).toBe(false);
    expect(progress.some((p) => p.text === "$2,600 added to your verified fundraising progress")).toBe(true);
  });

  it("records each milestone once, in the order it was crossed", () => {
    const milestones = activity.filter((a) => a.kind === "milestone").map((m) => m.text);
    expect(milestones).toContain("You reached 25% of your goal");
    expect(milestones).toContain("You reached 50% of your goal");
    expect(milestones).toContain("You reached 75% of your goal");
    expect(milestones.filter((m) => m.includes("50%"))).toHaveLength(1);
    expect(milestones).not.toContain("You reached your fundraising goal");
  });

  it("names the referring fundraiser's start without exposing anything about donors", () => {
    const referral = activity.find((a) => a.kind === "referral_start");
    expect(referral?.text).toBe("Johnson Family started a fundraiser after visiting your page");
  });

  it("cannot leak donor identity or per-donor amounts through pending gifts", () => {
    const blob = JSON.stringify(
      buildActivity({
        goal: 1000,
        donations: [{ amount: 777, status: "PENDING", confirmedAt: null }, { amount: 888, status: "CANCELLED", confirmedAt: null }],
      }),
    );
    expect(blob).not.toContain("777");
    expect(blob).not.toContain("888");
  });
});

describe("share targets (§2)", () => {
  const t = shareTargets("https://mckinneysda.org/f/team-ada", "Team Ada", "We're building our future home!");

  it("points every channel at the fundraiser's own public page", () => {
    for (const link of [t.copy, t.sms, t.email, t.whatsapp, t.facebook]) {
      expect(decodeURIComponent(link)).toContain("https://mckinneysda.org/f/team-ada");
    }
  });

  it("url-encodes the message rather than injecting it raw", () => {
    expect(t.whatsapp).toContain("We're%20building");
    expect(t.whatsapp).not.toContain(" ");
    // A message containing URL delimiters cannot break out of the query parameter.
    const nasty = shareTargets("https://x/f/a", "T", "a&b=c?d#e");
    expect(nasty.whatsapp).toContain("a%26b%3Dc%3Fd%23e");
  });

  it("falls back to a sensible message when none is chosen", () => {
    const fallback = shareTargets("https://x/f/a", "Team Ada", "   ");
    expect(decodeURIComponent(fallback.sms)).toContain("Help us build our future home — Team Ada");
  });
});

/**
 * The figures the PUBLIC fundraiser page (/f/[slug]) is allowed to compose. That page's query
 * selects amount, status and confirmedAt and NO donor field, which is what these cases pin: the
 * numbers have to stay correct and honest when read from donor-free rows.
 */
describe("public fundraiser page figures (/f/[slug])", () => {
  it("offers no percentage, no bar fill and no remainder when no goal is set", () => {
    const p = fundraiserProgress(3750, 0);
    expect(p).toMatchObject({ raised: 3750, goal: 0, pct: 0, barPct: 0, remaining: 0, goalReached: false });
    // Nothing here can be composed into "$3,750 of $0" or a 0%-complete claim — the page has
    // to fall back to the raised amount alone.
    expect(p.goal).toBe(0);
  });

  it("still reports a true over-goal percentage while the bar fill stops at 100", () => {
    const p = fundraiserProgress(12_500, 10_000);
    expect(p.pct).toBe(125);
    expect(p.pct).toBeGreaterThan(100);
    expect(p.barPct).toBe(100);
    expect(p.remaining).toBe(0);
    expect(p.goalReached).toBe(true);
  });

  it("counts gifts, not people, when the rows carry no donor field", () => {
    // Two gifts from one person are indistinguishable in this shape — which is precisely why
    // the public page labels the figure "gifts" instead of "supporters".
    const publicRows = [
      { amount: 2500, status: "CONFIRMED", confirmedAt: at("2026-08-10T12:00:00Z") },
      { amount: 1250, status: "CONFIRMED", confirmedAt: at("2026-08-10T12:00:00Z") },
    ];
    expect(supporterCount(publicRows)).toBe(2);
    expect(verifiedTotal(publicRows)).toBe(3750);
  });

  it("omits the gift count rather than showing zero when nothing is confirmed", () => {
    expect(supporterCount([{ amount: 4000, status: "PENDING", confirmedAt: null }])).toBeNull();
    expect(supporterCount([{ amount: 4000, status: "CANCELLED", confirmedAt: null }])).toBeNull();
    expect(supporterCount([])).toBeNull();
  });

  it("encodes a story containing & and # into every share channel that carries it", () => {
    const story = "A home of our own — & we would love your help. #PossessTheLand";
    const t = shareTargets("https://mckinneysda.org/f/hope-rising", "Hope Rising", story);
    for (const link of [t.sms, t.email, t.whatsapp]) {
      // Unencoded, "&" would start a new query parameter and "#" would turn the rest of the
      // message into a fragment — the share would arrive truncated.
      expect(link).toContain("%26");
      expect(link).toContain("%23");
      expect(decodeURIComponent(link)).toContain(story);
      expect(decodeURIComponent(link)).toContain("https://mckinneysda.org/f/hope-rising");
    }
    expect(t.facebook).toContain(encodeURIComponent("https://mckinneysda.org/f/hope-rising"));
  });
});
