import { describe, it, expect } from "vitest";
import { roleLabel, requiresMinistry, inviteExpiresAt, isInviteAcceptable, INVITABLE_ROLES } from "@/lib/accounts";

describe("account roles", () => {
  it("labels CLERK as the church secretary", () => {
    expect(roleLabel("CLERK")).toBe("Church Clerk (Secretary)");
    expect(roleLabel("MINISTRY_HEAD")).toBe("Ministry Head");
    expect(roleLabel("TREASURER")).toBe("Treasurer");
  });
  it("only ministry heads need a ministry, and clerk is invitable", () => {
    expect(requiresMinistry("MINISTRY_HEAD")).toBe(true);
    expect(requiresMinistry("CLERK")).toBe(false);
    expect(INVITABLE_ROLES).toContain("CLERK");
  });
  it("computes expiry and acceptability", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(inviteExpiresAt(now, 7).toISOString()).toBe("2026-01-08T00:00:00.000Z");
    expect(isInviteAcceptable({ status: "PENDING", revokedAt: null, expiresAt: new Date("2026-01-05") }, now)).toBe(true);
    expect(isInviteAcceptable({ status: "PENDING", revokedAt: null, expiresAt: new Date("2025-12-30") }, now)).toBe(false);
    expect(isInviteAcceptable({ status: "ACCEPTED", revokedAt: null, expiresAt: new Date("2026-01-05") }, now)).toBe(false);
  });
});
