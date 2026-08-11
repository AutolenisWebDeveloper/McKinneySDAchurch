import { describe, it, expect } from "vitest";
import { can, requireCan, ForbiddenError, type Actor, type Action } from "@/lib/rbac";
import type { DocumentVisibility, Role } from "@prisma/client";

const mk = (roles: Role[], over: Partial<Actor> = {}): Actor => ({
  userId: "u",
  role: roles[0]!,
  roles,
  ...over,
});

/**
 * Centralized action policy (§ RBAC consolidation). Each of these actions used to be a role
 * literal scattered at a call site; they now flow through can(). These tests pin the exact
 * role sets so a future refactor can't silently widen authorization.
 */
describe("can() — consolidated action policy", () => {
  const ROLE_ONLY_MATRIX: Array<{ action: Action; allow: Role[]; deny: Role[] }> = [
    { action: "committee.manage", allow: ["ADMIN", "PASTOR", "CLERK"], deny: ["MEMBER", "MINISTRY_HEAD", "ELDER", "TREASURER"] },
    { action: "minutes.approve", allow: ["ADMIN", "PASTOR"], deny: ["MEMBER", "ELDER", "CLERK", "TREASURER", "MINISTRY_HEAD"] },
    { action: "transfer.createOnBehalf", allow: ["ADMIN", "PASTOR", "ELDER", "CLERK"], deny: ["MEMBER", "MINISTRY_HEAD", "TREASURER"] },
    { action: "transfer.overrideDispute", allow: ["ADMIN", "PASTOR", "ELDER"], deny: ["MEMBER", "CLERK", "TREASURER", "MINISTRY_HEAD"] },
    { action: "manual.manage", allow: ["ADMIN", "PASTOR"], deny: ["MEMBER", "ELDER", "CLERK", "TREASURER", "MINISTRY_HEAD"] },
    { action: "emailTemplate.manage", allow: ["ADMIN", "PASTOR"], deny: ["MEMBER", "ELDER", "CLERK", "TREASURER", "MINISTRY_HEAD"] },
    { action: "cms.publish", allow: ["ADMIN", "PASTOR"], deny: ["MEMBER", "ELDER", "CLERK", "TREASURER", "MINISTRY_HEAD"] },
    { action: "accountRequest.review", allow: ["ADMIN", "PASTOR"], deny: ["MEMBER", "ELDER", "CLERK", "TREASURER", "MINISTRY_HEAD"] },
    { action: "document.manage", allow: ["ADMIN", "PASTOR"], deny: ["MEMBER", "ELDER", "CLERK", "TREASURER", "MINISTRY_HEAD"] },
  ];

  for (const { action, allow, deny } of ROLE_ONLY_MATRIX) {
    it(`${action}: exactly ${allow.join("/")} are allowed`, () => {
      for (const r of allow) expect(can(mk([r]), action)).toBe(true);
      for (const r of deny) expect(can(mk([r]), action)).toBe(false);
    });
  }

  it("deny-by-default: an unknown/empty resource action denies", () => {
    // Resource-required actions deny when no resource is supplied.
    expect(can(mk(["ADMIN"]), "document.read")).toBe(false);
    expect(can(mk(["ADMIN"]), "document.download")).toBe(false);
  });

  it("document.read/download is visibility-gated", () => {
    const vis = (v: DocumentVisibility) => ({ visibility: v });
    const member = mk(["MEMBER"]);
    const admin = mk(["ADMIN"]);
    const stranger = mk(["MEMBER"], { userId: "x" });

    // PUBLIC — everyone
    expect(can(member, "document.read", vis("PUBLIC"))).toBe(true);
    expect(can(admin, "document.download", vis("PUBLIC"))).toBe(true);

    // MEMBERS_ONLY — any authenticated member/staff, but ADMIN_ONLY only leadership
    expect(can(member, "document.read", vis("MEMBERS_ONLY"))).toBe(true);
    expect(can(member, "document.read", vis("ADMIN_ONLY"))).toBe(false);
    expect(can(admin, "document.read", vis("ADMIN_ONLY"))).toBe(true);

    // A member with none of the staff roles still counts as MEMBER for MEMBERS_ONLY
    expect(can(stranger, "document.download", vis("MEMBERS_ONLY"))).toBe(true);
    expect(can(stranger, "document.download", vis("ADMIN_ONLY"))).toBe(false);
  });

  it("multi-role actor authorizes from the full role set, not the primary role", () => {
    // A MEMBER who is also an ELDER can override a disputed transfer.
    const memberElder = mk(["MEMBER", "ELDER"]);
    expect(can(memberElder, "transfer.overrideDispute")).toBe(true);
    // Portal/primary role is presentation state, never authorization state.
    expect(can(mk(["MEMBER"], { primaryRole: "ADMIN" }), "manual.manage")).toBe(false);
  });

  it("requireCan throws ForbiddenError when denied and is silent when allowed", () => {
    expect(() => requireCan(mk(["MEMBER"]), "cms.publish")).toThrow(ForbiddenError);
    expect(() => requireCan(mk(["ADMIN"]), "cms.publish")).not.toThrow();
  });
});
