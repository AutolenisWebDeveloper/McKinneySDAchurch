import { describe, it, expect } from "vitest";
import type { WorkItemStatus } from "@prisma/client";
import {
  canTransition,
  evaluateTransition,
  assertTransition,
  isTerminal,
  WorkflowError,
} from "@/lib/workflow";

const ALL: WorkItemStatus[] = [
  "NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "FOLLOW_UP", "NEEDS_INFO", "RESOLVED", "CLOSED",
];

describe("WorkItem transition graph", () => {
  it("CLOSED is terminal", () => {
    expect(isTerminal("CLOSED")).toBe(true);
    for (const to of ALL) expect(canTransition("CLOSED", to)).toBe(false);
  });

  it("allows the documented forward path and rejects illegal jumps", () => {
    expect(canTransition("NEW", "TRIAGED")).toBe(true);
    expect(canTransition("TRIAGED", "ASSIGNED")).toBe(true);
    expect(canTransition("ASSIGNED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
    expect(canTransition("RESOLVED", "CLOSED")).toBe(true);
    // illegal
    expect(canTransition("NEW", "RESOLVED")).toBe(false);
    expect(canTransition("NEW", "IN_PROGRESS")).toBe(false);
    expect(canTransition("RESOLVED", "NEW")).toBe(false);
  });

  it("permits reopening RESOLVED to FOLLOW_UP", () => {
    expect(canTransition("RESOLVED", "FOLLOW_UP")).toBe(true);
  });

  it("a status never transitions to itself", () => {
    for (const s of ALL) {
      const res = evaluateTransition(s, s);
      expect(res.ok).toBe(false);
    }
  });
});

describe("transition guards", () => {
  it("ASSIGNED requires an assignee", () => {
    expect(evaluateTransition("NEW", "ASSIGNED")).toEqual({ ok: false, code: "ASSIGNEE_REQUIRED" });
    const ok = evaluateTransition("NEW", "ASSIGNED", { assigneeUserId: "u1" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.patch.assigneeUserId).toBe("u1");
  });

  it("FOLLOW_UP requires a follow-up date", () => {
    expect(evaluateTransition("ASSIGNED", "FOLLOW_UP")).toEqual({
      ok: false, code: "FOLLOW_UP_DATE_REQUIRED",
    });
    const d = new Date("2026-09-01T00:00:00Z");
    const ok = evaluateTransition("ASSIGNED", "FOLLOW_UP", { followUpAt: d });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.patch.followUpAt).toBe(d);
  });

  it("NEEDS_INFO requires a reason", () => {
    expect(evaluateTransition("TRIAGED", "NEEDS_INFO")).toEqual({ ok: false, code: "REASON_REQUIRED" });
    expect(evaluateTransition("TRIAGED", "NEEDS_INFO", { reason: "  " })).toEqual({
      ok: false, code: "REASON_REQUIRED",
    });
    expect(evaluateTransition("TRIAGED", "NEEDS_INFO", { reason: "need phone #" }).ok).toBe(true);
  });

  it("RESOLVED and CLOSED require a closing reason and stamp closedAt on CLOSED only", () => {
    expect(evaluateTransition("IN_PROGRESS", "RESOLVED")).toEqual({
      ok: false, code: "CLOSE_REASON_REQUIRED",
    });
    const now = new Date("2026-08-10T12:00:00Z");
    const resolved = evaluateTransition("IN_PROGRESS", "RESOLVED", { reason: "visited" }, now);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.patch.closeReason).toBe("visited");
      expect(resolved.patch.closedAt).toBeNull();
    }
    const closed = evaluateTransition("RESOLVED", "CLOSED", { reason: "done" }, now);
    expect(closed.ok).toBe(true);
    if (closed.ok) expect(closed.patch.closedAt).toBe(now);
  });

  it("illegal transitions are reported before guard checks", () => {
    expect(evaluateTransition("NEW", "RESOLVED", { reason: "x" })).toEqual({
      ok: false, code: "ILLEGAL_TRANSITION",
    });
  });
});

describe("assertTransition", () => {
  it("throws WorkflowError with the code on failure", () => {
    expect(() => assertTransition("NEW", "ASSIGNED")).toThrow(WorkflowError);
    try {
      assertTransition("NEW", "RESOLVED", { reason: "x" });
    } catch (e) {
      expect((e as WorkflowError).code).toBe("ILLEGAL_TRANSITION");
    }
  });
  it("returns the patch on success", () => {
    const patch = assertTransition("NEW", "TRIAGED");
    expect(patch.status).toBe("TRIAGED");
  });
});
