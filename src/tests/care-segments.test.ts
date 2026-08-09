import { describe, it, expect } from "vitest";
import { careCutoff, isMissing, careDedupeKey } from "@/lib/care";
import { segmentWhere, buildRecipientList } from "@/lib/segments";

const asOf = new Date("2026-08-08T00:00:00Z");

describe("care detection", () => {
  it("flags missing only when a signal exists and is older than the cutoff", () => {
    expect(isMissing(new Date("2026-06-01"), asOf, 6)).toBe(true);   // >6 weeks ago
    expect(isMissing(new Date("2026-08-01"), asOf, 6)).toBe(false);  // last week
    expect(isMissing(null, asOf, 6)).toBe(false);                    // no signal
  });
  it("cutoff is weeks before asOf", () => {
    expect(careCutoff(asOf, 1).toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });
  it("dedupe key is stable within a week, distinct across weeks", () => {
    expect(careDedupeKey("m1", new Date("2026-08-08"))).toBe(careDedupeKey("m1", new Date("2026-08-09")));
    expect(careDedupeKey("m1", new Date("2026-08-08"))).not.toBe(careDedupeKey("m1", new Date("2026-08-20")));
  });
});

describe("email segments", () => {
  it("every segment excludes minors (adultWhere nested)", () => {
    for (const seg of ["ALL_MEMBERS", "ACTIVE_MEMBERS", "DIRECTORY"] as const) {
      const w = JSON.stringify(segmentWhere(seg, asOf));
      expect(w).toContain('"isMinor":false');
    }
  });
  it("recipient list drops minors + empty emails, normalizes and dedupes", () => {
    const out = buildRecipientList([
      { isMinor: false, email: "A@B.com" },
      { isMinor: false, email: "a@b.com" },        // dupe after normalize
      { isMinor: true, email: "kid@b.com" },       // minor -> excluded
      { isMinor: false, email: null },             // no email
      { isMinor: false, dateOfBirth: new Date("2015-01-01"), email: "young@b.com" }, // computed minor
    ], asOf);
    expect(out).toEqual(["a@b.com"]);
  });
});
