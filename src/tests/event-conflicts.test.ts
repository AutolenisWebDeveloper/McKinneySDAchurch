import { describe, it, expect } from "vitest";
import { intervalsOverlap, resolveCategoryKey, categoryForSlug } from "@/lib/calendar";

const at = (h: number, m = 0) => new Date(Date.UTC(2026, 7, 15, h, m));

describe("scheduling conflict math (intervalsOverlap)", () => {
  it("detects a genuine time overlap", () => {
    expect(intervalsOverlap(at(10), at(12), at(11), at(13))).toBe(true);
  });
  it("treats back-to-back events (touching edges) as non-conflicting", () => {
    // [10,11) and [11,12) share only the boundary instant → no overlap.
    expect(intervalsOverlap(at(10), at(11), at(11), at(12))).toBe(false);
  });
  it("non-overlapping windows do not conflict", () => {
    expect(intervalsOverlap(at(9), at(10), at(14), at(15))).toBe(false);
  });
  it("a fully-contained event conflicts with its container", () => {
    expect(intervalsOverlap(at(9), at(17), at(11), at(12))).toBe(true);
  });
  it("is symmetric", () => {
    expect(intervalsOverlap(at(11), at(13), at(10), at(12))).toBe(intervalsOverlap(at(10), at(12), at(11), at(13)));
  });
});

describe("public category resolution", () => {
  it("prefers the explicit event category", () => {
    expect(resolveCategoryKey("YOUTH", "church-calendar")).toBe("youth");
    expect(resolveCategoryKey("HEALTH", null)).toBe("outreach");
    expect(resolveCategoryKey("FELLOWSHIP", null)).toBe("family");
  });
  it("falls back to the ministry slug when no category is set", () => {
    expect(resolveCategoryKey(null, "youth-ministries")).toBe("youth");
    expect(resolveCategoryKey(undefined, "childrens-ministries")).toBe("children");
    expect(resolveCategoryKey(null, "unknown-slug")).toBe(categoryForSlug("unknown-slug"));
  });
});
