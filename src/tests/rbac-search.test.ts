import { describe, it, expect } from "vitest";
import { searchScopesForRoles, canSearchScope } from "@/lib/rbac-search";

describe("RBAC-aware search scoping (§45)", () => {
  it("a plain member searches only public/shared content — never care/prayer/members", () => {
    const s = searchScopesForRoles(["MEMBER"]);
    expect(s.sort()).toEqual(["announcements", "bulletins", "events", "manual"]);
    expect(canSearchScope(["MEMBER"], "care")).toBe(false);
    expect(canSearchScope(["MEMBER"], "prayer")).toBe(false);
    expect(canSearchScope(["MEMBER"], "members")).toBe(false);
    expect(canSearchScope(["MEMBER"], "transfers")).toBe(false);
  });

  it("leadership can search care, prayer, and members", () => {
    for (const r of ["PASTOR", "ELDER", "ADMIN"] as const) {
      expect(canSearchScope([r], "care")).toBe(true);
      expect(canSearchScope([r], "prayer")).toBe(true);
      expect(canSearchScope([r], "members")).toBe(true);
    }
  });

  it("elders do NOT get secretary governance scopes (transfers/committees)", () => {
    expect(canSearchScope(["ELDER"], "transfers")).toBe(false);
    expect(canSearchScope(["ELDER"], "committees")).toBe(false);
  });

  it("the church secretary searches members, transfers, committees — but not prayer/care", () => {
    const s = searchScopesForRoles(["CLERK"]);
    expect(s).toContain("members");
    expect(s).toContain("transfers");
    expect(s).toContain("committees");
    expect(s).not.toContain("care");
    expect(s).not.toContain("prayer");
  });

  it("multi-role unions scopes (member+elder+clerk sees everything permitted)", () => {
    const s = searchScopesForRoles(["MEMBER", "ELDER", "CLERK"]);
    for (const scope of ["care", "prayer", "members", "transfers", "committees", "announcements"] as const) {
      expect(s).toContain(scope);
    }
  });
});
