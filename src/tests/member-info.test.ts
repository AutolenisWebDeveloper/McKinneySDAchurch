import { describe, it, expect } from "vitest";
import {
  memberInfoSchema,
  encodeMemberInfo,
  decodeMemberInfo,
  pickContactEmail,
  blankToUndef,
} from "@/lib/member-info";

const full = {
  householdName: "The Johnson Family",
  address: "123 Main St, McKinney TX 75070",
  anniversary: "2005-06-18",
  husband: {
    fullName: "John Johnson",
    birthDate: "1980-05-04",
    phone: "214-555-0100",
    email: "john@example.com",
    baptismYear: "2001",
    joinedYear: "2010",
    ministriesCurrent: "Deacon",
    ministriesInterested: "Media",
    employment: { occupation: "Engineer", employer: "Acme", status: "EMPLOYED" as const, skills: "IT" },
  },
  wife: { fullName: "Jane Johnson", email: "jane@example.com" },
  children: [{ fullName: "Amy Johnson", birthDate: "2014-03-02", baptismYear: "2024" }],
  consent: true as const,
};

describe("memberInfoSchema", () => {
  it("accepts a complete payload", () => {
    expect(memberInfoSchema.safeParse(full).success).toBe(true);
  });

  it("requires a household name and consent", () => {
    expect(memberInfoSchema.safeParse({ ...full, householdName: "" }).success).toBe(false);
    expect(memberInfoSchema.safeParse({ ...full, consent: false }).success).toBe(false);
  });

  it("allows a minimal single-adult household with no employment", () => {
    const res = memberInfoSchema.safeParse({
      householdName: "Smith",
      husband: { fullName: "Pat Smith" },
      wife: {},
      children: [],
      consent: true,
    });
    expect(res.success).toBe(true);
  });

  it("rejects an unknown employment status", () => {
    const bad = { ...full, husband: { ...full.husband, employment: { status: "FREELANCE" } } };
    expect(memberInfoSchema.safeParse(bad).success).toBe(false);
  });
});

describe("encode/decode", () => {
  it("encrypts to opaque text and round-trips", () => {
    const payload = memberInfoSchema.parse(full);
    const enc = encodeMemberInfo(payload);
    expect(enc).not.toContain("Johnson");
    expect(decodeMemberInfo(enc)).toEqual(payload);
  });
});

describe("helpers", () => {
  it("pickContactEmail prefers the husband", () => {
    expect(pickContactEmail(memberInfoSchema.parse(full))).toBe("john@example.com");
  });

  it("blankToUndef trims and nullifies empty", () => {
    expect(blankToUndef("  ")).toBeUndefined();
    expect(blankToUndef("x")).toBe("x");
    expect(blankToUndef(null)).toBeUndefined();
  });
});
