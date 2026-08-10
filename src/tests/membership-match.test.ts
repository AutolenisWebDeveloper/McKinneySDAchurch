import { describe, it, expect } from "vitest";
import { matchMembership, type MatchMember, type MatchRequest } from "@/lib/membership-match";

const member = (over: Partial<MatchMember> & { id: string }): MatchMember => ({
  firstName: "Jane",
  lastName: "Doe",
  emailNormalized: "jane@doe.com",
  phone: "9725551234",
  dateOfBirth: new Date(Date.UTC(1980, 0, 1)),
  isMinor: false,
  hasUser: false,
  ...over,
});

const req = (over: Partial<MatchRequest> = {}): MatchRequest => ({
  firstName: "Jane",
  lastName: "Doe",
  emailNormalized: "jane@doe.com",
  phone: "972-555-1234",
  ...over,
});

describe("matchMembership", () => {
  it("EXACT: email + full name (+phone) → auto-approvable, binds the member", () => {
    const r = matchMembership(req(), [member({ id: "m1" })]);
    expect(r.band).toBe("EXACT");
    expect(r.autoApprovable).toBe(true);
    expect(r.memberId).toBe("m1");
  });

  it("name + phone, different email (55/MEDIUM) → not auto-approvable", () => {
    const r = matchMembership(
      req({ emailNormalized: "new@address.com" }),
      [member({ id: "m1", emailNormalized: "old@doe.com" })],
    );
    expect(["HIGH", "MEDIUM"]).toContain(r.band);
    // name(35) + phone(20) = 55 → MEDIUM, not auto-approvable (conservative)
    expect(r.autoApprovable).toBe(false);
  });

  it("email + last name but first-name mismatch (shared household email) → not auto", () => {
    const r = matchMembership(
      req({ firstName: "Janet", phone: null }),
      [member({ id: "m1", firstName: "Jane" })],
    );
    expect(r.confidence).toBeLessThan(95);
    expect(r.autoApprovable).toBe(false);
  });

  it("LOW: name matches but no email/phone → weak candidate (35), never auto", () => {
    const r = matchMembership(
      req({ emailNormalized: "different@x.com", phone: null }),
      [member({ id: "m1", emailNormalized: "jane@doe.com", phone: "0000000000" })],
    );
    expect(r.band).toBe("LOW"); // first(15)+last(20) = 35
    expect(r.confidence).toBe(35);
    expect(r.autoApprovable).toBe(false);
  });

  it("AMBIGUOUS: two equally strong matches → admin review, no bind", () => {
    const r = matchMembership(req(), [
      member({ id: "m1" }),
      member({ id: "m2" }),
    ]);
    expect(r.autoApprovable).toBe(false);
    expect(r.memberId).toBeUndefined();
    expect(r.candidates.length).toBe(2);
  });

  it("DUPLICATE: same email on two member rows → ambiguous, admin review", () => {
    const r = matchMembership(req(), [
      member({ id: "m1", phone: null }),
      member({ id: "m2", phone: null }),
    ]);
    expect(r.autoApprovable).toBe(false);
  });

  it("NO MATCH: nobody scores → empty, not auto-approvable", () => {
    const r = matchMembership(
      req({ firstName: "Zoe", lastName: "Nobody", emailNormalized: "zoe@no.com", phone: "5550000000" }),
      [member({ id: "m1" })],
    );
    expect(r.band).toBe("NONE");
    expect(r.candidates).toHaveLength(0);
    expect(r.autoApprovable).toBe(false);
  });

  it("SAFEGUARDING: a minor best-match is never auto-approvable", () => {
    const r = matchMembership(req(), [member({ id: "m1", isMinor: true })]);
    expect(r.band).toBe("EXACT");
    expect(r.autoApprovable).toBe(false); // minors get no login
    expect(r.candidates[0]!.eligible).toBe(false);
  });

  it("ALREADY LINKED: a member with an existing login is not auto-bound", () => {
    const r = matchMembership(req(), [member({ id: "m1", hasUser: true })]);
    expect(r.autoApprovable).toBe(false);
    expect(r.candidates[0]!.eligible).toBe(false);
  });

  it("CLEAR WINNER: strong top with weak runner-up → auto-approvable", () => {
    const r = matchMembership(req(), [
      member({ id: "m1" }),
      member({ id: "m2", firstName: "Other", emailNormalized: "other@x.com", phone: null }),
    ]);
    expect(r.autoApprovable).toBe(true);
    expect(r.memberId).toBe("m1");
  });

  it("verification birth year adds confidence", () => {
    const withYear = matchMembership(
      req({ emailNormalized: "new@x.com", verificationData: "joined around 1980" }),
      [member({ id: "m1", emailNormalized: "old@x.com" })],
    );
    const withoutYear = matchMembership(
      req({ emailNormalized: "new@x.com" }),
      [member({ id: "m1", emailNormalized: "old@x.com" })],
    );
    expect(withYear.confidence).toBeGreaterThan(withoutYear.confidence);
  });
});
