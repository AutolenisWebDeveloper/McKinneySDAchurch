import { describe, it, expect } from "vitest";
import {
  hasRole,
  actorRoles,
  ministryScope,
  canManageAnnouncement,
  canReadWorkItem,
  canManageWorkItem,
  canMessageWorkItem,
  can,
  type Actor,
} from "@/lib/rbac";

const mk = (over: Partial<Actor>): Actor => ({ userId: "u", role: "MEMBER", ...over });

describe("multi-role actor", () => {
  it("hasRole checks the full active role set, not just the legacy role", () => {
    const a = mk({ role: "MEMBER", roles: ["MEMBER", "ELDER", "MINISTRY_HEAD"] });
    expect(hasRole(a, "ELDER")).toBe(true);
    expect(hasRole(a, "ADMIN")).toBe(false);
    expect(hasRole(a, "ADMIN", "MINISTRY_HEAD")).toBe(true);
  });

  it("falls back to [role] for legacy single-role actors", () => {
    const a = mk({ role: "CLERK" });
    expect(actorRoles(a)).toEqual(["CLERK"]);
    expect(hasRole(a, "CLERK")).toBe(true);
  });

  it("ministryScope covers every ministry-scoped assignment", () => {
    const a = mk({ role: "MINISTRY_HEAD", roles: ["MINISTRY_HEAD"], ministryIds: ["m1", "m2"] });
    expect(ministryScope(a)).toEqual(["m1", "m2"]);
    expect(canManageAnnouncement(a, { ministryId: "m2" })).toBe(true);
    expect(canManageAnnouncement(a, { ministryId: "m3" })).toBe(false);
  });

  it("legacy single ministryId still scopes correctly", () => {
    const a = mk({ role: "MINISTRY_HEAD", ministryId: "m1" });
    expect(canManageAnnouncement(a, { ministryId: "m1" })).toBe(true);
    expect(canManageAnnouncement(a, { ministryId: "m2" })).toBe(false);
  });
});

describe("WorkItem authorization", () => {
  const pastor = mk({ userId: "p", role: "PASTOR", roles: ["PASTOR"] });
  const elder = mk({ userId: "e", role: "ELDER", roles: ["ELDER"] });
  const admin = mk({ userId: "a", role: "ADMIN", roles: ["ADMIN"] });
  const member = mk({ userId: "m", role: "MEMBER", roles: ["MEMBER"] });

  it("requester always reads and messages their own item", () => {
    const item = { type: "CARE" as const, requesterUserId: "m" };
    expect(canReadWorkItem(member, item)).toBe(true);
    expect(canMessageWorkItem(member, item)).toBe(true);
    // but a bare member cannot manage (triage/assign) it
    expect(canManageWorkItem(member, item)).toBe(false);
  });

  it("care/prayer route to pastor + elder, not to a random member", () => {
    const care = { type: "CARE" as const, requesterUserId: "someone-else" };
    expect(canManageWorkItem(pastor, care)).toBe(true);
    expect(canManageWorkItem(elder, care)).toBe(true);
    expect(canManageWorkItem(member, care)).toBe(false);
    // admin is NOT a care routing role
    expect(canManageWorkItem(admin, care)).toBe(false);
  });

  it("LEADERSHIP_ONLY confidentiality keeps out non-leadership routing roles", () => {
    const support = { type: "SUPPORT" as const, confidentiality: "LEADERSHIP_ONLY" as const };
    // SUPPORT normally routes to ADMIN; admin is leadership so still allowed
    expect(canManageWorkItem(admin, support)).toBe(true);
    // A contact item marked leadership-only excludes a plain admin? admin IS leadership -> allowed.
    const leadMsg = { type: "LEADERSHIP_MESSAGE" as const, confidentiality: "LEADERSHIP_ONLY" as const };
    expect(canManageWorkItem(elder, leadMsg)).toBe(true);
    expect(canManageWorkItem(member, leadMsg)).toBe(false);
  });

  it("ministry-scoped volunteer app is visible only to the owning ministry head", () => {
    const headM1 = mk({ userId: "h1", role: "MINISTRY_HEAD", roles: ["MINISTRY_HEAD"], ministryIds: ["m1"] });
    const headM2 = mk({ userId: "h2", role: "MINISTRY_HEAD", roles: ["MINISTRY_HEAD"], ministryIds: ["m2"] });
    const vol = { type: "VOLUNTEER" as const, ministryId: "m1" };
    expect(canManageWorkItem(headM1, vol)).toBe(true);
    expect(canManageWorkItem(headM2, vol)).toBe(false);
    // admin (a VOLUNTEER routing role, non-ministry-scoped) still manages it
    expect(canManageWorkItem(admin, vol)).toBe(true);
  });

  it("assignee can read even without a routing role", () => {
    const assignedElder = { type: "CARE" as const, assigneeUserId: "e" };
    expect(canReadWorkItem(elder, assignedElder)).toBe(true);
  });

  it("can() dispatches to the WorkItem policies and denies by default", () => {
    const care = { type: "CARE" as const, requesterUserId: "x" };
    expect(can(pastor, "care.manage", care)).toBe(true);
    expect(can(member, "care.manage", care)).toBe(false);
    expect(can(admin, "role.manage")).toBe(true);
    expect(can(member, "role.manage")).toBe(false);
    // unknown/omitted resource for a resource action denies
    expect(can(pastor, "workitem.read")).toBe(false);
  });
});
