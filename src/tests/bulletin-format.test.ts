import { describe, it, expect } from "vitest";
import { eventChip, eventTimeLabel } from "@/lib/bulletin-format";

describe("bulletin event formatting (Central time)", () => {
  it("renders a compact uppercase timing chip", () => {
    // 2026-08-14 18:00 CDT = 2026-08-14T23:00Z
    expect(eventChip(new Date("2026-08-14T23:00:00Z"))).toBe("FRI · AUG 14 · 6 PM");
    // 2026-08-08 14:30 CDT = 2026-08-08T19:30Z
    expect(eventChip(new Date("2026-08-08T19:30:00Z"))).toBe("SAT · AUG 8 · 2:30 PM");
  });
  it("returns null with no start", () => {
    expect(eventChip(null)).toBeNull();
    expect(eventChip(undefined)).toBeNull();
  });
  it("renders a full human time label", () => {
    expect(eventTimeLabel(new Date("2026-08-14T23:00:00Z"))).toMatch(/Friday, August 14 · 6:00 PM/);
  });
});
