import { describe, it, expect } from "vitest";
import {
  canPacketTransition, computeReadiness, upcomingSabbath, type ReadinessSubmission,
  canSubmissionTransition, normalizeSubmissionState, isSubmissionOpen, isSubmissionPublic,
  normalizeCategory, categoryRank, slugify, uniqueSlug, isSafeUrl, validateBulletinForPublish,
} from "@/lib/weekly-packet";

describe("weekly packet status machine", () => {
  it("follows COLLECTING → IN_REVIEW → READY → PUBLISHED → ARCHIVED", () => {
    expect(canPacketTransition("COLLECTING", "IN_REVIEW")).toBe(true);
    expect(canPacketTransition("IN_REVIEW", "READY")).toBe(true);
    expect(canPacketTransition("READY", "PUBLISHED")).toBe(true);
    expect(canPacketTransition("PUBLISHED", "ARCHIVED")).toBe(true);
  });
  it("allows sending back for more work but not illegal jumps", () => {
    expect(canPacketTransition("IN_REVIEW", "COLLECTING")).toBe(true);
    expect(canPacketTransition("READY", "IN_REVIEW")).toBe(true);
    expect(canPacketTransition("COLLECTING", "PUBLISHED")).toBe(false);
    expect(canPacketTransition("ARCHIVED", "PUBLISHED")).toBe(false);
    expect(canPacketTransition("PUBLISHED", "COLLECTING")).toBe(false);
  });
});

describe("computeReadiness", () => {
  const sub = (ministryId: string | null, over: Partial<ReadinessSubmission> = {}): ReadinessSubmission => ({
    ministryId, kind: "ANNOUNCEMENT", status: "SUBMITTED", ...over,
  });

  it("scores 100 when every department responded and an order of service exists", () => {
    const r = computeReadiness({
      departmentIds: ["a", "b"],
      submissions: [sub("a"), sub("b")],
      hasOrderOfService: true,
    });
    expect(r.score).toBe(100);
    expect(r.respondedDepartments).toBe(2);
    expect(r.missingDepartmentIds).toEqual([]);
  });

  it("counts an explicit NOTHING_THIS_WEEK as a response", () => {
    const r = computeReadiness({
      departmentIds: ["a", "b"],
      submissions: [sub("a", { kind: "NOTHING_THIS_WEEK" })],
      hasOrderOfService: false,
    });
    expect(r.respondedDepartments).toBe(1);
    expect(r.missingDepartmentIds).toEqual(["b"]);
    // 1/2 responded * 80 + 0 = 40
    expect(r.score).toBe(40);
  });

  it("ignores REJECTED submissions when computing response", () => {
    const r = computeReadiness({
      departmentIds: ["a"],
      submissions: [sub("a", { status: "REJECTED" })],
      hasOrderOfService: true,
    });
    expect(r.respondedDepartments).toBe(0);
    expect(r.missingDepartmentIds).toEqual(["a"]);
    // 0 dept * 80 + 20 (oos) = 20
    expect(r.score).toBe(20);
  });

  it("de-duplicates departments and multiple submissions from one ministry", () => {
    const r = computeReadiness({
      departmentIds: ["a", "a", "b"],
      submissions: [sub("a"), sub("a", { kind: "EVENT" })],
      hasOrderOfService: false,
    });
    expect(r.totalDepartments).toBe(2);
    expect(r.respondedDepartments).toBe(1);
  });

  it("with no departments, readiness rides entirely on the order of service", () => {
    expect(computeReadiness({ departmentIds: [], submissions: [], hasOrderOfService: true }).score).toBe(100);
    expect(computeReadiness({ departmentIds: [], submissions: [], hasOrderOfService: false }).score).toBe(80);
  });
});

describe("submission status machine (§6)", () => {
  it("follows DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → PUBLISHED → ARCHIVED", () => {
    expect(canSubmissionTransition("DRAFT", "SUBMITTED")).toBe(true);
    expect(canSubmissionTransition("SUBMITTED", "UNDER_REVIEW")).toBe(true);
    expect(canSubmissionTransition("UNDER_REVIEW", "APPROVED")).toBe(true);
    expect(canSubmissionTransition("APPROVED", "PUBLISHED")).toBe(true);
    expect(canSubmissionTransition("PUBLISHED", "ARCHIVED")).toBe(true);
  });
  it("allows request-changes then resubmission, and direct approval from submitted", () => {
    expect(canSubmissionTransition("SUBMITTED", "CHANGES_REQUESTED")).toBe(true);
    expect(canSubmissionTransition("CHANGES_REQUESTED", "SUBMITTED")).toBe(true);
    expect(canSubmissionTransition("SUBMITTED", "APPROVED")).toBe(true);
  });
  it("rejects illegal jumps", () => {
    expect(canSubmissionTransition("DRAFT", "APPROVED")).toBe(false);
    expect(canSubmissionTransition("DRAFT", "PUBLISHED")).toBe(false);
    expect(canSubmissionTransition("REJECTED", "SUBMITTED")).toBe(false);
    expect(canSubmissionTransition("ARCHIVED", "PUBLISHED")).toBe(false);
    expect(canSubmissionTransition("PUBLISHED", "APPROVED")).toBe(false);
  });
  it("normalizes legacy statuses (ACCEPTED→APPROVED, NEEDS_INFO→CHANGES_REQUESTED)", () => {
    expect(normalizeSubmissionState("ACCEPTED")).toBe("APPROVED");
    expect(normalizeSubmissionState("NEEDS_INFO")).toBe("CHANGES_REQUESTED");
    // legacy ACCEPTED behaves like APPROVED in the machine + public gate
    expect(canSubmissionTransition("ACCEPTED", "PUBLISHED")).toBe(true);
    expect(isSubmissionPublic("ACCEPTED")).toBe(true);
    expect(isSubmissionOpen("NEEDS_INFO")).toBe(true);
  });
  it("classifies open vs. public states", () => {
    expect(isSubmissionOpen("DRAFT")).toBe(true);
    expect(isSubmissionOpen("SUBMITTED")).toBe(true);
    expect(isSubmissionOpen("APPROVED")).toBe(false);
    expect(isSubmissionPublic("APPROVED")).toBe(true);
    expect(isSubmissionPublic("PUBLISHED")).toBe(true);
    expect(isSubmissionPublic("SUBMITTED")).toBe(false);
    expect(isSubmissionPublic("REJECTED")).toBe(false);
  });
});

describe("announcement categories, slugs, url validation (§4/§16)", () => {
  it("snaps categories case-insensitively and defaults unknowns", () => {
    expect(normalizeCategory("this weekend")).toBe("This Weekend");
    expect(normalizeCategory("  Ministries ")).toBe("Ministries");
    expect(normalizeCategory("nonsense")).toBe("Coming Up");
    expect(normalizeCategory(null)).toBe("Coming Up");
    expect(categoryRank("This Weekend")).toBeLessThan(categoryRank("Ministries"));
  });
  it("produces stable, unique, anchor-safe slugs", () => {
    expect(slugify("Rise! Camporee 2026")).toBe("rise-camporee-2026");
    expect(slugify("  Health & Wellness  ")).toBe("health-wellness");
    expect(slugify("!!!")).toBe("item");
    const taken = new Set(["potluck"]);
    expect(uniqueSlug("potluck", taken)).toBe("potluck-2");
    expect(uniqueSlug("new", taken)).toBe("new");
  });
  it("accepts only safe URLs", () => {
    expect(isSafeUrl("https://example.org/register")).toBe(true);
    expect(isSafeUrl("http://example.org")).toBe(true);
    expect(isSafeUrl("mailto:info@church.org")).toBe(true);
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("ftp://x")).toBe(false);
    expect(isSafeUrl("not a url")).toBe(false);
    expect(isSafeUrl("")).toBe(false);
  });
});

describe("validateBulletinForPublish (§14)", () => {
  const ok = {
    orderOfServiceItemCount: 5, approvedAnnouncementCount: 3, pendingReviewCount: 0,
    changesRequestedCount: 0, sermonTitle: "Grace", speaker: "Pastor", scripture: "John 3:16",
    sabbathSchoolTime: "9:30 AM", divineWorshipTime: "11:00 AM",
  };
  it("passes a complete bulletin with no hard errors", () => {
    const r = validateBulletinForPublish(ok);
    expect(r.canPublish).toBe(true);
    expect(r.errors).toEqual([]);
  });
  it("blocks publish when the order of service is empty", () => {
    const r = validateBulletinForPublish({ ...ok, orderOfServiceItemCount: 0 });
    expect(r.canPublish).toBe(false);
    expect(r.errors.join(" ")).toMatch(/order of service/i);
  });
  it("blocks publish when submissions are unreviewed", () => {
    const r = validateBulletinForPublish({ ...ok, pendingReviewCount: 2 });
    expect(r.canPublish).toBe(false);
    expect(r.errors.join(" ")).toMatch(/awaiting review/i);
  });
  it("blocks publish on invalid links", () => {
    const r = validateBulletinForPublish({ ...ok, invalidUrls: ["javascript:x"] });
    expect(r.canPublish).toBe(false);
  });
  it("warns (not blocks) on missing optional worship fields", () => {
    const r = validateBulletinForPublish({ ...ok, sermonTitle: "", speaker: "", scripture: "" });
    expect(r.canPublish).toBe(true);
    expect(r.warnings.length).toBeGreaterThanOrEqual(3);
  });
});

describe("upcomingSabbath", () => {
  it("returns the coming Saturday at UTC midnight", () => {
    // 2026-08-12 is a Wednesday → next Saturday is 2026-08-15
    const s = upcomingSabbath(new Date("2026-08-12T18:00:00Z"));
    expect(s.toISOString().slice(0, 10)).toBe("2026-08-15");
    expect(s.getUTCHours()).toBe(0);
  });
  it("returns the same day when today is Saturday", () => {
    const s = upcomingSabbath(new Date("2026-08-15T09:00:00Z"));
    expect(s.toISOString().slice(0, 10)).toBe("2026-08-15");
  });
});
