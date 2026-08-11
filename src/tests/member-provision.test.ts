import { describe, it, expect } from "vitest";
import { parseYear, parseDate, splitName, adultHasData } from "@/lib/member-provision";

describe("parseYear", () => {
  it("extracts a plausible 4-digit year", () => {
    expect(parseYear("2009")).toBe(2009);
    expect(parseYear("baptized 1998")).toBe(1998);
  });
  it("rejects junk and out-of-range values", () => {
    expect(parseYear("nope")).toBeNull();
    expect(parseYear("")).toBeNull();
    expect(parseYear(undefined)).toBeNull();
    expect(parseYear("3200")).toBeNull();
  });
});

describe("parseDate", () => {
  it("parses a YYYY-MM-DD as a UTC date", () => {
    expect(parseDate("2014-03-02")?.toISOString()).toBe("2014-03-02T00:00:00.000Z");
  });
  it("returns null for empty or invalid", () => {
    expect(parseDate("")).toBeNull();
    expect(parseDate("not-a-date")).toBeNull();
    expect(parseDate(null)).toBeNull();
  });
});

describe("splitName", () => {
  it("splits first + last, folding middle names into last", () => {
    expect(splitName("John Johnson")).toEqual({ firstName: "John", lastName: "Johnson" });
    expect(splitName("Mary Jane Watson")).toEqual({ firstName: "Mary", lastName: "Jane Watson" });
  });
  it("handles single and empty names", () => {
    expect(splitName("Prince")).toEqual({ firstName: "Prince", lastName: "" });
    expect(splitName("")).toEqual({ firstName: "", lastName: "" });
    expect(splitName(undefined)).toEqual({ firstName: "", lastName: "" });
  });
});

describe("adultHasData", () => {
  it("is true when any field (including nested employment) is set", () => {
    expect(adultHasData({ fullName: "A B" })).toBe(true);
    expect(adultHasData({ employment: { occupation: "Nurse" } })).toBe(true);
  });
  it("is false for empty/undefined", () => {
    expect(adultHasData(undefined)).toBe(false);
    expect(adultHasData({})).toBe(false);
    expect(adultHasData({ employment: {} })).toBe(false);
  });
});
