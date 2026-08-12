import { describe, it, expect } from "vitest";
import { parseYear, parseDate, splitName, adultHasData, provisionHousehold } from "@/lib/member-provision";
import { memberInfoSchema } from "@/lib/member-info";

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
    expect(adultHasData({ birthDate: "1980-05-04" })).toBe(true);
    expect(adultHasData({ employment: { occupation: "Nurse" } })).toBe(true);
  });
  it("is false for empty/undefined", () => {
    expect(adultHasData(undefined)).toBe(false);
    expect(adultHasData({})).toBe(false);
    expect(adultHasData({ employment: {} })).toBe(false);
  });
});

describe("provisionHousehold — adult birthday lands on the member profile", () => {
  it("writes each adult's birthday to Member.dateOfBirth on approval", async () => {
    const payload = memberInfoSchema.parse({
      householdName: "The Test Family",
      husband: { fullName: "John Test", email: "john@example.com", birthDate: "1980-05-04" },
      wife: { fullName: "Jane Test", birthDate: "1982-11-20" }, // no email → create path, no lookup
      children: [],
      consent: true,
    });

    // Fake transaction client capturing what would be written to the DB.
    const memberWrites: Array<Record<string, unknown>> = [];
    const tx = {
      household: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "hh1", ...data }),
        update: async () => ({}),
      },
      member: {
        findUnique: async () => null, // no existing member matches → create
        create: async ({ data }: { data: Record<string, unknown> }) => {
          memberWrites.push(data);
          return { id: `m${memberWrites.length}` };
        },
        update: async ({ data }: { data: Record<string, unknown> }) => {
          memberWrites.push(data);
          return { id: "existing" };
        },
      },
    } as unknown as Parameters<typeof provisionHousehold>[0];

    await provisionHousehold(tx, payload);

    const adults = memberWrites.filter((m) => m.isMinor === false);
    const john = adults.find((m) => m.firstName === "John");
    const jane = adults.find((m) => m.firstName === "Jane");

    // The birthday from the form is stored as Member.dateOfBirth.
    expect((john?.dateOfBirth as Date | null)?.toISOString()).toBe("1980-05-04T00:00:00.000Z");
    expect((jane?.dateOfBirth as Date | null)?.toISOString()).toBe("1982-11-20T00:00:00.000Z");
  });
});
