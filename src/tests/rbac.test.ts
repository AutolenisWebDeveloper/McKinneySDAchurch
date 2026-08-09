import { describe, it, expect } from "vitest";
import {
  canManageAnnouncement, canReviewContent, canReadPrayerRequest, canManageDependent,
  canScheduleWithMinors, canManageGiving, requireRole, ForbiddenError, type Actor,
} from "@/lib/rbac";

const mk = (over: Partial<Actor>): Actor => ({ userId: "u", role: "MEMBER", ...over });

describe("authorization matrix", () => {
  it("ministry head manages only their own ministry; admin manages any", () => {
    const head = mk({ role: "MINISTRY_HEAD", ministryId: "m1" });
    expect(canManageAnnouncement(head, { ministryId: "m1" })).toBe(true);
    expect(canManageAnnouncement(head, { ministryId: "m2" })).toBe(false);
    expect(canManageAnnouncement(mk({ role: "ADMIN" }), { ministryId: "m2" })).toBe(true);
  });

  it("only admin/pastor review content or read prayer requests", () => {
    expect(canReviewContent(mk({ role: "MINISTRY_HEAD" }))).toBe(false);
    expect(canReviewContent(mk({ role: "PASTOR" }))).toBe(true);
    expect(canReadPrayerRequest(mk({ role: "CLERK" }))).toBe(false);
    expect(canReadPrayerRequest(mk({ role: "ADMIN" }))).toBe(true);
  });

  it("only a same-household guardian manages a minor", () => {
    const guardian = mk({ role: "MEMBER", memberId: "g1", householdId: "h1" });
    const minor = { householdId: "h1", guardianMemberId: "g1" };
    expect(canManageDependent(guardian, minor)).toBe(true);
    expect(canManageDependent(mk({ role: "MEMBER", memberId: "gX", householdId: "h2" }), minor)).toBe(false);
    expect(canManageDependent(mk({ role: "PASTOR" }), minor)).toBe(true);
  });

  it("safeguarding gate blocks unscreened/expired volunteers", () => {
    const a = mk({ role: "MEMBER" });
    const future = new Date(Date.now() + 86400000);
    const past = new Date(Date.now() - 86400000);
    expect(canScheduleWithMinors(a, { status: "CLEARED", expiresAt: future })).toBe(true);
    expect(canScheduleWithMinors(a, { status: "CLEARED", expiresAt: past })).toBe(false);
    expect(canScheduleWithMinors(a, { status: "PENDING", expiresAt: future })).toBe(false);
    expect(canScheduleWithMinors(a, null)).toBe(false);
  });

  it("giving is treasurer/admin only", () => {
    expect(canManageGiving(mk({ role: "TREASURER" }))).toBe(true);
    expect(canManageGiving(mk({ role: "MEMBER" }))).toBe(false);
  });

  it("requireRole throws for wrong role", () => {
    expect(() => requireRole(mk({ role: "MEMBER" }), "ADMIN")).toThrow(ForbiddenError);
  });
});
