import { describe, it, expect } from "vitest";
import {
  canPacketTransition, computeReadiness, upcomingSabbath, type ReadinessSubmission,
} from "@/lib/weekly-packet";

describe("weekly packet status machine", () => {
  it("follows COLLECTING → IN_REVIEW → READY → PUBLISHED → ARCHIVED", () => {
    expect(canPacketTransition("COLLECTING", "IN_REVIEW")).toBe(true);
    expect(canPacketTransition("IN_REVIEW", "READY")).toBe(true);
    expect(canPacketTransition("READY", "PUBLISHED")).toBe(true);
    expect(canPacketTransition("PUBLISHED", "ARCHIVED")).toBe(true);
  });
  it("allows sending back for more work but not illegal jumps", () => {
    expect(canPacketTransition("IN_REVIEW", "COLLECTING")).toBe(true);
    expect(canPacketTransition("READY", "IN_REVIEW")).toBe(true);
    expect(canPacketTransition("COLLECTING", "PUBLISHED")).toBe(false);
    expect(canPacketTransition("ARCHIVED", "PUBLISHED")).toBe(false);
    expect(canPacketTransition("PUBLISHED", "COLLECTING")).toBe(false);
  });
});

describe("computeReadiness", () => {
  const sub = (ministryId: string | null, over: Partial<ReadinessSubmission> = {}): ReadinessSubmission => ({
    ministryId, kind: "ANNOUNCEMENT", status: "SUBMITTED", ...over,
  });

  it("scores 100 when every department responded and an order of service exists", () => {
    const r = computeReadiness({
      departmentIds: ["a", "b"],
      submissions: [sub("a"), sub("b")],
      hasOrderOfService: true,
    });
    expect(r.score).toBe(100);
    expect(r.respondedDepartments).toBe(2);
    expect(r.missingDepartmentIds).toEqual([]);
  });

  it("counts an explicit NOTHING_THIS_WEEK as a response", () => {
    const r = computeReadiness({
      departmentIds: ["a", "b"],
      submissions: [sub("a", { kind: "NOTHING_THIS_WEEK" })],
      hasOrderOfService: false,
    });
    expect(r.respondedDepartments).toBe(1);
    expect(r.missingDepartmentIds).toEqual(["b"]);
    // 1/2 responded * 80 + 0 = 40
    expect(r.score).toBe(40);
  });

  it("ignores REJECTED submissions when computing response", () => {
    const r = computeReadiness({
      departmentIds: ["a"],
      submissions: [sub("a", { status: "REJECTED" })],
      hasOrderOfService: true,
    });
    expect(r.respondedDepartments).toBe(0);
    expect(r.missingDepartmentIds).toEqual(["a"]);
    // 0 dept * 80 + 20 (oos) = 20
    expect(r.score).toBe(20);
  });

  it("de-duplicates departments and multiple submissions from one ministry", () => {
    const r = computeReadiness({
      departmentIds: ["a", "a", "b"],
      submissions: [sub("a"), sub("a", { kind: "EVENT" })],
      hasOrderOfService: false,
    });
    expect(r.totalDepartments).toBe(2);
    expect(r.respondedDepartments).toBe(1);
  });

  it("with no departments, readiness rides entirely on the order of service", () => {
    expect(computeReadiness({ departmentIds: [], submissions: [], hasOrderOfService: true }).score).toBe(100);
    expect(computeReadiness({ departmentIds: [], submissions: [], hasOrderOfService: false }).score).toBe(80);
  });
});

describe("upcomingSabbath", () => {
  it("returns the coming Saturday at UTC midnight", () => {
    // 2026-08-12 is a Wednesday → next Saturday is 2026-08-15
    const s = upcomingSabbath(new Date("2026-08-12T18:00:00Z"));
    expect(s.toISOString().slice(0, 10)).toBe("2026-08-15");
    expect(s.getUTCHours()).toBe(0);
  });
  it("returns the same day when today is Saturday", () => {
    const s = upcomingSabbath(new Date("2026-08-15T09:00:00Z"));
    expect(s.toISOString().slice(0, 10)).toBe("2026-08-15");
  });
});
