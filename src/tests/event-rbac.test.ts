import { describe, it, expect } from "vitest";
import type { Role } from "@prisma/client";
import {
  type Actor,
  canManageEventForMinistry,
  canReviewEvent,
  canPublishEvent,
  eventActorKind,
  eventOwnerScope,
} from "@/lib/rbac";

const mk = (roles: Role[], over: Partial<Actor> = {}): Actor => ({ userId: "u", role: roles[0]!, roles, ...over });

describe("calendar event authorization", () => {
  it("a department head may only manage events for departments they head", () => {
    const head = mk(["MEMBER", "MINISTRY_HEAD"], { ministryIds: ["youth"] });
    expect(canManageEventForMinistry(head, "youth")).toBe(true);
    // Forging another department id must be denied server-side.
    expect(canManageEventForMinistry(head, "music")).toBe(false);
  });

  it("a department head can never review or publish", () => {
    const head = mk(["MEMBER", "MINISTRY_HEAD"], { ministryIds: ["youth"] });
    expect(canReviewEvent(head)).toBe(false);
    expect(canPublishEvent(head)).toBe(false);
  });

  it("admin/pastor may manage any department, review, and publish", () => {
    for (const r of ["ADMIN", "PASTOR"] as Role[]) {
      const a = mk(["MEMBER", r]);
      expect(canManageEventForMinistry(a, "any-department")).toBe(true);
      expect(canReviewEvent(a)).toBe(true);
      expect(canPublishEvent(a)).toBe(true);
    }
  });

  it("a plain member has no event authority", () => {
    const m = mk(["MEMBER"]);
    expect(canManageEventForMinistry(m, "youth")).toBe(false);
    expect(canReviewEvent(m)).toBe(false);
    expect(eventActorKind(m, { ministryId: "youth" })).toBe(null);
  });

  it("eventActorKind: reviewer for admin, owner for the scoped head, null otherwise", () => {
    const admin = mk(["MEMBER", "ADMIN"]);
    const head = mk(["MEMBER", "MINISTRY_HEAD"], { ministryIds: ["youth"] });
    const otherHead = mk(["MEMBER", "MINISTRY_HEAD"], { ministryIds: ["music"] });
    expect(eventActorKind(admin, { ministryId: "youth" })).toBe("reviewer");
    expect(eventActorKind(head, { ministryId: "youth" })).toBe("owner");
    expect(eventActorKind(otherHead, { ministryId: "youth" })).toBe(null);
  });

  it("eventOwnerScope resolves 'all' for admins and the exact department set for heads", () => {
    expect(eventOwnerScope(mk(["ADMIN"]))).toEqual({ all: true, ministryIds: [] });
    expect(eventOwnerScope(mk(["MINISTRY_HEAD"], { ministryIds: ["youth", "music"] }))).toEqual({
      all: false,
      ministryIds: ["youth", "music"],
    });
  });

  it("a head of multiple departments may own each, but only those", () => {
    const multi = mk(["MEMBER", "MINISTRY_HEAD"], { ministryIds: ["youth", "music"] });
    expect(canManageEventForMinistry(multi, "youth")).toBe(true);
    expect(canManageEventForMinistry(multi, "music")).toBe(true);
    expect(canManageEventForMinistry(multi, "health")).toBe(false);
  });
});
