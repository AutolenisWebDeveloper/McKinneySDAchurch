import { describe, it, expect } from "vitest";
import {
  formatServiceTime,
  resolveMeets,
  getMinistryContent,
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
