import { describe, it, expect } from "vitest";
import { centralWallToUtc, utcToCentralWall } from "@/lib/tz";

describe("centralWallToUtc", () => {
  it("interprets summer wall time as CDT (UTC-5)", () => {
    // 7:00 PM Central on Jul 15 → 00:00 UTC Jul 16
    expect(centralWallToUtc("2026-07-15T19:00")?.toISOString()).toBe("2026-07-16T00:00:00.000Z");
  });

  it("interprets winter wall time as CST (UTC-6)", () => {
    // 7:00 PM Central on Jan 15 → 01:00 UTC Jan 16
    expect(centralWallToUtc("2026-01-15T19:00")?.toISOString()).toBe("2026-01-16T01:00:00.000Z");
  });

  it("returns null for malformed input", () => {
    expect(centralWallToUtc("not-a-date")).toBeNull();
    expect(centralWallToUtc("")).toBeNull();
  });
});

describe("utcToCentralWall", () => {
  it("round-trips a wall-clock value through UTC and back", () => {
    for (const wall of ["2026-07-15T19:00", "2026-01-15T09:30", "2026-11-01T00:15"]) {
      const utc = centralWallToUtc(wall)!;
      expect(utcToCentralWall(utc)).toBe(wall);
    }
  });
});
