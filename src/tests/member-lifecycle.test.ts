import { describe, it, expect } from "vitest";
import {
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_STATUS_LABEL,
  memberAccessState,
  ACCESS_STATE_LABEL,
  isDeactivated,
  canHardDelete,
} from "@/lib/member-lifecycle";

const now = new Date("2026-08-13T00:00:00Z");

describe("member lifecycle helpers", () => {
  it("labels every membership status", () => {
    for (const s of MEMBERSHIP_STATUSES) expect(MEMBERSHIP_STATUS_LABEL[s]).toBeTruthy();
    expect(MEMBERSHIP_STATUS_LABEL.TRANSFERRED_OUT).toBe("Transferred out");
  });

  it("derives account access state from the linked login", () => {
    expect(memberAccessState({ user: null })).toBe("no-login");
    expect(memberAccessState({ user: { activatedAt: null, disabledAt: null } })).toBe("pending");
    expect(memberAccessState({ user: { activatedAt: now, disabledAt: null } })).toBe("active");
    expect(memberAccessState({ user: { activatedAt: now, disabledAt: now } })).toBe("disabled");
    // Disabled wins even if never formally activated.
    expect(memberAccessState({ user: { activatedAt: null, disabledAt: now } })).toBe("disabled");
    for (const k of Object.keys(ACCESS_STATE_LABEL)) expect(ACCESS_STATE_LABEL[k as keyof typeof ACCESS_STATE_LABEL]).toBeTruthy();
  });

  it("treats a set deactivatedAt as deactivated", () => {
    expect(isDeactivated({ deactivatedAt: null })).toBe(false);
    expect(isDeactivated({ deactivatedAt: now })).toBe(true);
  });

  it("only allows hard delete after deactivation (two-step safety gate)", () => {
    expect(canHardDelete({ deactivatedAt: null })).toBe(false);
    expect(canHardDelete({ deactivatedAt: now })).toBe(true);
  });
});
