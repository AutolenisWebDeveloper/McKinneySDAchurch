import { describe, it, expect } from "vitest";
import { ageInYears, isMinorMember, adultWhere, toMemberCsv } from "@/lib/minors";

const asOf = new Date("2026-08-08T00:00:00Z");

describe("age + minor detection", () => {
  it("computes age with birthday boundary", () => {
    expect(ageInYears(new Date("2008-08-08"), asOf)).toBe(18);
    expect(ageInYears(new Date("2008-08-09"), asOf)).toBe(17); // day before 18th birthday
  });
  it("flags minors by flag or by sub-18 dob", () => {
    expect(isMinorMember({ isMinor: true }, asOf)).toBe(true);
    expect(isMinorMember({ isMinor: false, dateOfBirth: new Date("2010-01-01") }, asOf)).toBe(true);
    expect(isMinorMember({ isMinor: false, dateOfBirth: new Date("2000-01-01") }, asOf)).toBe(false);
    expect(isMinorMember({ isMinor: false, dateOfBirth: null }, asOf)).toBe(false);
  });
});

describe("adultWhere fragment", () => {
  it("excludes flagged minors and requires adult or unknown dob", () => {
    const w = adultWhere(asOf) as { isMinor: boolean; OR: Array<Record<string, unknown>> };
    expect(w.isMinor).toBe(false);
    const cutoff = (w.OR[1].dateOfBirth as { lte: Date }).lte;
    expect(cutoff.getFullYear()).toBe(2008); // 2026 - 18
  });
});


describe("CSV export safeguard", () => {
  it("refuses to emit a minor", () => {
    expect(() => toMemberCsv([{ isMinor: true, firstName: "K", lastName: "id", membershipStatus: "ACTIVE" }])).toThrowError(/MINOR_IN_EXPORT/);
  });
  it("escapes fields and adds the disclaimer", () => {
    const csv = toMemberCsv([{ isMinor: false, firstName: 'Ann "A"', lastName: "Lee", email: "a@b.com", phone: null, membershipStatus: "ACTIVE" }]);
    expect(csv).toContain("NOT the official membership list");
    expect(csv).toContain('"Ann ""A"""');
  });
});
