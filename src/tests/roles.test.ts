import { describe, it, expect } from "vitest";
import type { Role } from "@prisma/client";
import {
  canAccessPortal,
  portalsForRoles,
  primaryPortal,
  roleHomePortal,
  highestRole,
  type PortalKey,
} from "@/lib/roles";

describe("role -> portal mapping", () => {
  const cases: [Role, PortalKey][] = [
    ["MEMBER", "member"],
    ["MINISTRY_HEAD", "ministry"],
    ["ELDER", "leadership"],
    ["PASTOR", "leadership"],
    ["CLERK", "clerk"],
    ["TREASURER", "treasurer"],
    ["ADMIN", "admin"],
  ];
  it.each(cases)("%s home portal is %s", (role, portal) => {
    expect(roleHomePortal(role)).toBe(portal);
  });
});

describe("portal eligibility", () => {
  it("every authenticated user can access the member portal", () => {
    expect(canAccessPortal(["MEMBER"], "member")).toBe(true);
    expect(canAccessPortal(["TREASURER"], "member")).toBe(true);
  });
  it("leadership portal is only PASTOR/ELDER/ADMIN", () => {
    expect(canAccessPortal(["ELDER"], "leadership")).toBe(true);
    expect(canAccessPortal(["PASTOR"], "leadership")).toBe(true);
    expect(canAccessPortal(["ADMIN"], "leadership")).toBe(true);
    expect(canAccessPortal(["CLERK"], "leadership")).toBe(false);
    expect(canAccessPortal(["MEMBER"], "leadership")).toBe(false);
  });
  it("clerk/treasurer portals are scoped to their role", () => {
    expect(canAccessPortal(["CLERK"], "clerk")).toBe(true);
    expect(canAccessPortal(["TREASURER"], "clerk")).toBe(false);
    expect(canAccessPortal(["TREASURER"], "treasurer")).toBe(true);
    expect(canAccessPortal(["ADMIN"], "treasurer")).toBe(false);
  });
  it("admin portal is ADMIN or PASTOR only", () => {
    expect(canAccessPortal(["ADMIN"], "admin")).toBe(true);
    expect(canAccessPortal(["PASTOR"], "admin")).toBe(true);
    expect(canAccessPortal(["ELDER"], "admin")).toBe(false);
  });
});

describe("portalsForRoles is ordered, de-duped, and member-inclusive", () => {
  it("a multi-role user gets every eligible portal in canonical order", () => {
    const roles: Role[] = ["MEMBER", "MINISTRY_HEAD", "ELDER"];
    expect(portalsForRoles(roles)).toEqual(["member", "ministry", "leadership"]);
  });
  it("a plain member gets only the member portal", () => {
    expect(portalsForRoles(["MEMBER"])).toEqual(["member"]);
  });
  it("an admin+pastor does not get clerk/treasurer portals (portal != authorization)", () => {
    expect(portalsForRoles(["ADMIN", "PASTOR"])).toEqual(["member", "leadership", "admin"]);
  });
});

describe("primaryPortal", () => {
  it("defaults to the highest-ranked role's home portal", () => {
    expect(primaryPortal(["MEMBER", "ELDER", "MINISTRY_HEAD"])).toBe("leadership");
    expect(primaryPortal(["MEMBER", "MINISTRY_HEAD"])).toBe("ministry");
    expect(primaryPortal(["MEMBER"])).toBe("member");
  });
  it("honors an explicit primaryRole preference when the role is held", () => {
    expect(primaryPortal(["MEMBER", "ELDER", "ADMIN"], "MEMBER")).toBe("member");
    expect(primaryPortal(["MEMBER", "ELDER", "ADMIN"], "ELDER")).toBe("leadership");
  });
  it("ignores a primaryRole the user no longer holds", () => {
    expect(primaryPortal(["MEMBER"], "ADMIN")).toBe("member");
  });
  it("empty role set falls back to member", () => {
    expect(primaryPortal([])).toBe("member");
  });
});

describe("highestRole", () => {
  it("returns the most authoritative role for display", () => {
    expect(highestRole(["MEMBER", "MINISTRY_HEAD", "PASTOR"])).toBe("PASTOR");
    expect(highestRole(["MEMBER", "TREASURER"])).toBe("TREASURER");
    expect(highestRole([])).toBe("MEMBER");
  });
});
