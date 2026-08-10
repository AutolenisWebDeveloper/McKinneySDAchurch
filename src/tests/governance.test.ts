import { describe, it, expect } from "vitest";
import { isCurrentOffice, currentOfficeWhere, officerRank, tallyMotion, canActionItemTransition, isActionItemClosed, committeeSlug } from "@/lib/governance";

const asOf = new Date("2026-08-08T00:00:00Z");

describe("office currency", () => {
  it("is current when active, started, and within term", () => {
    expect(isCurrentOffice({ active: true, termStart: new Date("2026-01-01"), termEnd: null }, asOf)).toBe(true);
    expect(isCurrentOffice({ active: true, termStart: new Date("2026-01-01"), termEnd: new Date("2026-12-31") }, asOf)).toBe(true);
  });
  it("excludes inactive, not-yet-started, and expired offices", () => {
    expect(isCurrentOffice({ active: false, termStart: new Date("2026-01-01") }, asOf)).toBe(false);
    expect(isCurrentOffice({ active: true, termStart: new Date("2026-10-01") }, asOf)).toBe(false);
    expect(isCurrentOffice({ active: true, termStart: new Date("2025-01-01"), termEnd: new Date("2025-12-31") }, asOf)).toBe(false);
  });
  it("where fragment requires active + started", () => {
    const w = currentOfficeWhere(asOf) as { active: boolean; termStart: { lte: Date } };
    expect(w.active).toBe(true);
    expect(w.termStart.lte).toEqual(asOf);
  });
  it("ranks officer roles for display", () => {
    expect(officerRank("ELDER")).toBeLessThan(officerRank("DEACON"));
    expect(officerRank("OTHER")).toBe(7);
  });
});

describe("motions (§31)", () => {
  it("carries on a majority, fails on tie or minority, pending with no votes", () => {
    expect(tallyMotion({ votesFor: 5, votesAgainst: 2, votesAbstain: 1 })).toBe("CARRIED");
    expect(tallyMotion({ votesFor: 2, votesAgainst: 2, votesAbstain: 3 })).toBe("FAILED"); // tie
    expect(tallyMotion({ votesFor: 1, votesAgainst: 4, votesAbstain: 0 })).toBe("FAILED");
    expect(tallyMotion({ votesFor: 0, votesAgainst: 0, votesAbstain: 0 })).toBe("PENDING");
  });
  it("abstentions do not count toward the majority", () => {
    expect(tallyMotion({ votesFor: 3, votesAgainst: 2, votesAbstain: 100 })).toBe("CARRIED");
  });
});

describe("action items (§31)", () => {
  it("allows OPEN → IN_PROGRESS → DONE and reopening", () => {
    expect(canActionItemTransition("OPEN", "IN_PROGRESS")).toBe(true);
    expect(canActionItemTransition("IN_PROGRESS", "DONE")).toBe(true);
    expect(canActionItemTransition("DONE", "OPEN")).toBe(true);
    expect(canActionItemTransition("DONE", "IN_PROGRESS")).toBe(false);
    expect(isActionItemClosed("DONE")).toBe(true);
    expect(isActionItemClosed("OPEN")).toBe(false);
  });
});

describe("committee slug", () => {
  it("slugifies names safely", () => {
    expect(committeeSlug("Finance & Audit")).toBe("finance-audit");
    expect(committeeSlug("   ")).toBe("committee");
  });
});
