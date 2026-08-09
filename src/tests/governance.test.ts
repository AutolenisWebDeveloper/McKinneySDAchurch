import { describe, it, expect } from "vitest";
import { isCurrentOffice, currentOfficeWhere, officerRank } from "@/lib/governance";

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
