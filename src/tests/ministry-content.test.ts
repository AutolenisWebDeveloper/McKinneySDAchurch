import { describe, it, expect } from "vitest";
import {
  formatServiceTime,
  resolveMeets,
  getMinistryContent,
  resolveHeadRole,
  initialsFromName,
  DEFAULT_HEAD_ROLE,
  MINISTRY_CATEGORY_STYLE,
  MINISTRY_CATEGORY_BLURB,
  MINISTRY_CATEGORY_ORDER,
  type MinistryContent,
} from "@/lib/ministry-content";

describe("formatServiceTime", () => {
  it("formats a bare 24-hour time to 12-hour with meridiem", () => {
    expect(formatServiceTime("9:30")).toBe("9:30 AM");
    expect(formatServiceTime("11:00")).toBe("11:00 AM");
    expect(formatServiceTime("19:00")).toBe("7:00 PM");
    expect(formatServiceTime("0:15")).toBe("12:15 AM");
    expect(formatServiceTime("12:05")).toBe("12:05 PM");
  });

  it("formats a day + time value", () => {
    expect(formatServiceTime("Wed 19:00")).toBe("Wednesdays at 7:00 PM");
    expect(formatServiceTime("Sat 9:30")).toBe("Sabbath at 9:30 AM");
  });

  it("passes through unparseable values", () => {
    expect(formatServiceTime("By appointment")).toBe("By appointment");
  });
});

describe("resolveMeets", () => {
  const sabbathSchool = getMinistryContent("sabbath-school");
  const prayer = getMinistryContent("prayer-ministry");

  it("derives from the service_times setting when available", () => {
    const times = { sabbathSchool: "9:30", prayerMeeting: "Wed 19:00" };
    expect(resolveMeets(sabbathSchool, times)).toBe("Sabbath mornings, 9:30 AM");
    expect(resolveMeets(prayer, times)).toBe("Wednesdays at 7:00 PM");
  });

  it("reflects an admin-changed time from the setting", () => {
    expect(resolveMeets(sabbathSchool, { sabbathSchool: "10:00" })).toBe("Sabbath mornings, 10:00 AM");
  });

  it("falls back to the static string when the setting is missing", () => {
    expect(resolveMeets(sabbathSchool, null)).toBe(sabbathSchool.meets);
    expect(resolveMeets(prayer, {})).toBe(prayer.meets);
  });

  it("returns null when neither a setting nor a static value exists", () => {
    const bare: MinistryContent = {
      monogram: "XX",
      category: "Care & Church Life",
      tagline: "t",
      about: "a",
      activities: [],
    };
    expect(resolveMeets(bare, { anything: "1:00" })).toBeNull();
  });
});

describe("resolveHeadRole", () => {
  it("returns the curated head title for a known ministry", () => {
    expect(resolveHeadRole("sabbath-school")).toBe("Sabbath School Superintendent");
    expect(resolveHeadRole("deacons")).toBe("Head Deacon");
  });

  it("prefers an explicit headRole on the content over the slug map", () => {
    const content = getMinistryContent("sabbath-school");
    expect(resolveHeadRole("sabbath-school", { ...content, headRole: "Custom Title" })).toBe("Custom Title");
  });

  it("falls back to the default title for an unknown ministry", () => {
    expect(resolveHeadRole("some-new-ministry")).toBe(DEFAULT_HEAD_ROLE);
  });
});

describe("initialsFromName", () => {
  it("uses first and last initials for multi-word names", () => {
    expect(initialsFromName("Marlon Wilson")).toBe("MW");
    expect(initialsFromName("Ada Grace Owusu")).toBe("AO");
  });

  it("uses the first two letters for a single name", () => {
    expect(initialsFromName("Priscilla")).toBe("PR");
  });

  it("tolerates punctuation", () => {
    expect(initialsFromName("O'Brien Smith")).toBe("OS");
  });
});

describe("category presentation maps", () => {
  it("has a style, blurb, and content bucket for every ordered category", () => {
    for (const category of MINISTRY_CATEGORY_ORDER) {
      expect(MINISTRY_CATEGORY_STYLE[category]).toBeDefined();
      expect(MINISTRY_CATEGORY_STYLE[category].cover).toMatch(/from-/);
      expect(MINISTRY_CATEGORY_BLURB[category]).toBeTruthy();
    }
  });
});
