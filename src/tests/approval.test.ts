import { describe, it, expect } from "vitest";
import { canTransition, reviewDecision, InvalidTransitionError, ReviewValidationError } from "@/lib/approval";
import type { Actor } from "@/lib/rbac";

const admin: Actor = { userId: "admin1", role: "ADMIN" };
const head: Actor = { userId: "head1", role: "MINISTRY_HEAD", ministryId: "m1" };
const item = (over = {}) => ({ status: "PENDING" as const, createdById: "head1", version: 3, ...over });

describe("approval state machine", () => {
  it("allows only defined transitions", () => {
    expect(canTransition("PENDING", "APPROVED")).toBe(true);
    expect(canTransition("PENDING", "REJECTED")).toBe(true);
    expect(canTransition("APPROVED", "WITHDRAWN")).toBe(true);
    expect(canTransition("APPROVED", "PENDING")).toBe(false);
    expect(canTransition("REJECTED", "APPROVED")).toBe(false);
  });

  it("approves and bumps version", () => {
    const patch = reviewDecision(admin, item(), { action: "approve" }, { expectedVersion: 3 });
    expect(patch.status).toBe("APPROVED");
    expect(patch.version).toBe(4);
    expect(patch.reviewedById).toBe("admin1");
  });

  it("blocks self-approval by default", () => {
    expect(() => reviewDecision(head, item({ createdById: "head1" }), { action: "approve" }, { expectedVersion: 3 }))
      .toThrow(ReviewValidationError); // but head can't review anyway -> NOT_A_REVIEWER first
    // a reviewer who is also the creator is blocked:
    expect(() => reviewDecision({ userId: "head1", role: "ADMIN" }, item({ createdById: "head1" }), { action: "approve" }, { expectedVersion: 3 }))
      .toThrowError(/SELF_APPROVAL_FORBIDDEN/);
  });

  it("requires a reason to reject", () => {
    expect(() => reviewDecision(admin, item(), { action: "reject", reason: "  " }, { expectedVersion: 3 }))
      .toThrowError(/REASON_REQUIRED/);
    const ok = reviewDecision(admin, item(), { action: "reject", reason: "off-topic" }, { expectedVersion: 3 });
    expect(ok.status).toBe("REJECTED");
    expect(ok.rejectReason).toBe("off-topic");
  });

  it("rejects illegal transitions", () => {
    expect(() => reviewDecision(admin, item({ status: "REJECTED" }), { action: "approve" }, { expectedVersion: 3 }))
      .toThrow(InvalidTransitionError);
  });

  it("enforces reviewer role and optimistic concurrency", () => {
    expect(() => reviewDecision(head, item(), { action: "approve" }, { expectedVersion: 3 }))
      .toThrowError(/NOT_A_REVIEWER/);
    expect(() => reviewDecision(admin, item({ version: 5 }), { action: "approve" }, { expectedVersion: 3 }))
      .toThrowError(/STALE_VERSION/);
  });

  it("withdraws an approved item", () => {
    const patch = reviewDecision(admin, item({ status: "APPROVED", createdById: "someoneElse" }), { action: "withdraw" }, { expectedVersion: 3 });
    expect(patch.status).toBe("WITHDRAWN");
    expect(() => reviewDecision(admin, item({ status: "PENDING" }), { action: "withdraw" }, { expectedVersion: 3 })).toThrow();
  });
});
