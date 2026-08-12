import { describe, it, expect } from "vitest";
import {
  buildMonthGrid,
  addMonths,
  monthLabel,
  monthKeyOf,
  centralYmd,
  centralMinutes,
  centralTimeLabel,
  expandEventDays,
  categoryForSlug,
  CATEGORY_ORDER,
} from "@/lib/calendar";

describe("buildMonthGrid", () => {
  it("always returns a fixed 42-cell (6-row) grid to prevent layout shift", () => {
    expect(buildMonthGrid({ year: 2026, month: 7 }, "2026-08-12")).toHaveLength(42); // Aug
    expect(buildMonthGrid({ year: 2026, month: 1 }, "2026-08-12")).toHaveLength(42); // Feb (short)
  });

  it("starts on Sunday and ends on Saturday", () => {
    const cells = buildMonthGrid({ year: 2026, month: 7 }, "2026-08-12");
    expect(cells[0]!.weekday).toBe(0);
    expect(cells[41]!.weekday).toBe(6);
  });

  it("marks leading/trailing filler days as outside the month", () => {
    // Aug 2026: the 1st is a Saturday, so the first cell is Jul 26 (filler).
    const cells = buildMonthGrid({ year: 2026, month: 7 }, "2026-08-12");
    expect(cells[0]).toMatchObject({ ymd: "2026-07-26", inMonth: false });
    const firstOfMonth = cells.find((c) => c.ymd === "2026-08-01")!;
    expect(firstOfMonth.inMonth).toBe(true);
    expect(firstOfMonth.day).toBe(1);
  });

  it("flags exactly the matching today cell", () => {
    const cells = buildMonthGrid({ year: 2026, month: 7 }, "2026-08-12");
    expect(cells.filter((c) => c.isToday)).toHaveLength(1);
    expect(cells.find((c) => c.isToday)!.ymd).toBe("2026-08-12");
  });

  it("handles a leap February", () => {
    const cells = buildMonthGrid({ year: 2024, month: 1 }, "2024-01-01");
    expect(cells.some((c) => c.ymd === "2024-02-29" && c.inMonth)).toBe(true);
  });
});

describe("addMonths / monthLabel", () => {
  it("wraps year boundaries in both directions", () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });
  it("labels the month and year", () => {
    expect(monthLabel({ year: 2026, month: 7 })).toBe("August 2026");
  });
});

describe("timezone bucketing (America/Chicago)", () => {
  it("keeps an 11:15 AM Central Sabbath on its own day", () => {
    // Stored UTC for 11:15 AM CDT on Aug 15, 2026.
    expect(centralYmd("2026-08-15T16:15:00.000Z")).toBe("2026-08-15");
  });

  it("puts a 6:00 PM Central event on the correct day even when UTC has rolled over", () => {
    // Board meeting: 6:00 PM CST Feb 21 is 00:00 UTC Feb 22 — must land on the 21st.
    expect(centralYmd("2026-02-22T00:00:00.000Z")).toBe("2026-02-21");
    expect(monthKeyOf("2026-02-22T00:00:00.000Z")).toEqual({ year: 2026, month: 1 });
  });

  it("derives Central minutes-of-day and a readable time label", () => {
    expect(centralMinutes("2026-08-15T16:15:00.000Z")).toBe(11 * 60 + 15);
    expect(centralTimeLabel("2026-08-15T16:15:00.000Z")).toBe("11:15 AM");
  });
});

describe("expandEventDays", () => {
  it("returns each civil day a multi-day event spans, inclusive", () => {
    expect(expandEventDays("2026-06-01", "2026-06-05")).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
    ]);
  });
  it("returns a single day for a same-day event", () => {
    expect(expandEventDays("2026-08-15", "2026-08-15")).toEqual(["2026-08-15"]);
  });
  it("spans across a month boundary", () => {
    expect(expandEventDays("2026-10-30", "2026-11-01")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });
  it("never loops away on an inverted range", () => {
    expect(expandEventDays("2026-06-05", "2026-06-01")).toEqual(["2026-06-05"]);
  });
});

describe("categoryForSlug", () => {
  it("maps known ministries to their semantic category", () => {
    expect(categoryForSlug("youth-ministries")).toBe("youth");
    expect(categoryForSlug("childrens-ministries")).toBe("children");
    expect(categoryForSlug("family-ministries")).toBe("family");
    expect(categoryForSlug("womens-ministries")).toBe("family");
    expect(categoryForSlug("personal-ministries")).toBe("outreach");
    expect(categoryForSlug("community-services")).toBe("outreach");
    expect(categoryForSlug("church-calendar")).toBe("worship");
    expect(categoryForSlug("prayer-ministry")).toBe("worship");
  });
  it("falls back to worship for unknown/empty slugs", () => {
    expect(categoryForSlug(undefined)).toBe("worship");
    expect(categoryForSlug("something-new")).toBe("worship");
  });
  it("every category has an order slot", () => {
    expect(new Set(CATEGORY_ORDER).size).toBe(CATEGORY_ORDER.length);
  });
});
