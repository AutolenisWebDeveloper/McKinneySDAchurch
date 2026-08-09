import { describe, it, expect } from "vitest";
import { canTransferTransition } from "@/lib/transfers";
import { reconcile, parseMemberCsv } from "@/lib/reconcile";
import { toMemberCsv } from "@/lib/minors";

describe("transfer pipeline", () => {
  it("follows intake -> review -> eAdventist -> completed", () => {
    expect(canTransferTransition("SUBMITTED", "IN_REVIEW")).toBe(true);
    expect(canTransferTransition("IN_REVIEW", "HANDED_TO_EADVENTIST")).toBe(true);
    expect(canTransferTransition("HANDED_TO_EADVENTIST", "COMPLETED")).toBe(true);
    expect(canTransferTransition("SUBMITTED", "COMPLETED")).toBe(false);
    expect(canTransferTransition("COMPLETED", "IN_REVIEW")).toBe(false);
  });
});

describe("reconciliation", () => {
  const local = [
    { firstName: "Ada", lastName: "Lee", email: "ada@x.com", membershipStatus: "ACTIVE" },
    { firstName: "Bo", lastName: "Ng", email: "bo@x.com", membershipStatus: "ACTIVE" },
  ];
  it("round-trips: export -> parse -> reconcile has zero differences", () => {
    const csv = toMemberCsv(local.map((m) => ({ isMinor: false, ...m })));
    const parsed = parseMemberCsv(csv);
    const r = reconcile(local, parsed);
    expect(r.matched).toBe(2);
    expect(r.onlyLocal).toEqual([]);
    expect(r.onlyEAdventist).toEqual([]);
    expect(r.statusMismatch).toEqual([]);
  });
  it("detects only-local, only-eAdventist, and status mismatches", () => {
    const official = [
      { firstName: "Ada", lastName: "Lee", email: "ada@x.com", membershipStatus: "MISSING" }, // mismatch
      { firstName: "Cy", lastName: "Poe", email: "cy@x.com", membershipStatus: "ACTIVE" },     // only eAdventist
    ];
    const r = reconcile(local, official);
    expect(r.onlyLocal.map((x) => x.name)).toContain("Bo Ng");
    expect(r.onlyEAdventist.map((x) => x.name)).toContain("Cy Poe");
    expect(r.statusMismatch[0]).toMatchObject({ name: "Ada Lee", local: "ACTIVE", official: "MISSING" });
  });
  it("matches by name when email is absent", () => {
    const r = reconcile(
      [{ firstName: "Di", lastName: "Fox", email: null, membershipStatus: "ACTIVE" }],
      [{ firstName: "Di", lastName: "Fox", email: null, membershipStatus: "ACTIVE" }],
    );
    expect(r.matched).toBe(1);
  });
});
