import { describe, it, expect } from "vitest";
import {
  canIssueTransition,
  canSubmissionTransition,
  isSubmissionOpen,
  isSubmissionUsable,
  computeNewsletterReadiness,
  validateNewsletterForPublish,
  normalizeContentType,
  contentTypeLabel,
  monthStartOf,
  upcomingIssueMonth,
  monthSlug,
  monthLabel,
  defaultCadence,
  requiredSectionTypes,
  type ReadinessSubmissionView,
  type ReadinessSectionView,
} from "@/lib/newsletter";

describe("newsletter issue status machine", () => {
  it("follows DRAFT → COLLECTING → IN_REVIEW → READY → APPROVED → SCHEDULED → PUBLISHED → ARCHIVED", () => {
    expect(canIssueTransition("DRAFT", "COLLECTING")).toBe(true);
    expect(canIssueTransition("COLLECTING", "IN_REVIEW")).toBe(true);
    expect(canIssueTransition("IN_REVIEW", "READY")).toBe(true);
    expect(canIssueTransition("READY", "APPROVED")).toBe(true);
    expect(canIssueTransition("APPROVED", "SCHEDULED")).toBe(true);
    expect(canIssueTransition("SCHEDULED", "PUBLISHED")).toBe(true);
    expect(canIssueTransition("APPROVED", "PUBLISHED")).toBe(true); // send now
    expect(canIssueTransition("PUBLISHED", "ARCHIVED")).toBe(true);
  });

  it("allows sensible step-backs but rejects illegal jumps", () => {
    expect(canIssueTransition("IN_REVIEW", "COLLECTING")).toBe(true);
    expect(canIssueTransition("READY", "IN_REVIEW")).toBe(true);
    expect(canIssueTransition("SCHEDULED", "APPROVED")).toBe(true); // cancel schedule
    expect(canIssueTransition("DRAFT", "PUBLISHED")).toBe(false);
    expect(canIssueTransition("COLLECTING", "PUBLISHED")).toBe(false);
    expect(canIssueTransition("PUBLISHED", "COLLECTING")).toBe(false);
    expect(canIssueTransition("ARCHIVED", "PUBLISHED")).toBe(false);
  });
});

describe("newsletter submission status machine", () => {
  it("follows the canonical department flow", () => {
    expect(canSubmissionTransition("DRAFT", "SUBMITTED")).toBe(true);
    expect(canSubmissionTransition("SUBMITTED", "UNDER_REVIEW")).toBe(true);
    expect(canSubmissionTransition("UNDER_REVIEW", "APPROVED")).toBe(true);
    expect(canSubmissionTransition("APPROVED", "ADDED_TO_ISSUE")).toBe(true);
  });

  it("supports change requests and resubmission", () => {
    expect(canSubmissionTransition("SUBMITTED", "CHANGES_REQUESTED")).toBe(true);
    expect(canSubmissionTransition("CHANGES_REQUESTED", "SUBMITTED")).toBe(true);
    // cannot approve directly out of CHANGES_REQUESTED without a resubmit
    expect(canSubmissionTransition("CHANGES_REQUESTED", "APPROVED")).toBe(false);
  });

  it("treats DECLINED as terminal and rejects illegal jumps", () => {
    expect(canSubmissionTransition("DECLINED", "SUBMITTED")).toBe(false);
    expect(canSubmissionTransition("DRAFT", "APPROVED")).toBe(false);
    expect(canSubmissionTransition("ADDED_TO_ISSUE", "APPROVED")).toBe(true); // may remove from issue
  });

  it("classifies open vs usable states", () => {
    expect(isSubmissionOpen("SUBMITTED")).toBe(true);
    expect(isSubmissionOpen("CHANGES_REQUESTED")).toBe(true);
    expect(isSubmissionOpen("APPROVED")).toBe(false);
    expect(isSubmissionUsable("APPROVED")).toBe(true);
    expect(isSubmissionUsable("ADDED_TO_ISSUE")).toBe(true);
    expect(isSubmissionUsable("DECLINED")).toBe(false);
  });

  // Contract behind the review-gate: a non-admin department head may only edit an OPEN submission.
  // Once reviewed (APPROVED/ADDED_TO_ISSUE) or terminal (DECLINED), the content is locked so it
  // cannot be swapped after approval and reach the published edition unreviewed.
  it("only treats DRAFT and CHANGES_REQUESTED as editable-by-owner", () => {
    expect(isSubmissionOpen("DRAFT")).toBe(true);
    expect(isSubmissionOpen("CHANGES_REQUESTED")).toBe(true);
    expect(isSubmissionOpen("UNDER_REVIEW")).toBe(true);
    expect(isSubmissionOpen("APPROVED")).toBe(false);
    expect(isSubmissionOpen("ADDED_TO_ISSUE")).toBe(false);
    expect(isSubmissionOpen("DECLINED")).toBe(false);
  });
});

describe("content types", () => {
  it("normalizes free-text and unknowns", () => {
    expect(normalizeContentType("event")).toBe("EVENT");
    expect(normalizeContentType("Ministry_Story")).toBe("MINISTRY_STORY");
    expect(normalizeContentType("nonsense")).toBe("OTHER");
    expect(normalizeContentType(null)).toBe("NEWS");
    expect(contentTypeLabel("VOLUNTEER")).toBe("Volunteer Opportunity");
  });
});

describe("month keying", () => {
  it("computes month starts, upcoming month, slug and label", () => {
    const now = new Date(Date.UTC(2026, 7, 18, 10, 0, 0)); // Aug 18 2026
    expect(monthStartOf(now).toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(upcomingIssueMonth(now).toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(monthSlug(upcomingIssueMonth(now))).toBe("2026-09");
    expect(monthLabel(upcomingIssueMonth(now))).toBe("September 2026");
  });

  it("rolls the year over in December", () => {
    const dec = new Date(Date.UTC(2026, 11, 5, 0, 0, 0));
    expect(upcomingIssueMonth(dec).toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(monthSlug(upcomingIssueMonth(dec))).toBe("2027-01");
  });

  it("defaults the cadence to the 15th/20th/22nd of the prep month (the month before the issue)", () => {
    const sep = new Date(Date.UTC(2026, 8, 1)); // Sept issue
    const c = defaultCadence(sep);
    expect(c.requestAt.getUTCMonth()).toBe(7); // August
    expect(c.requestAt.getUTCDate()).toBe(15);
    expect(c.reminderAt.getUTCDate()).toBe(20);
    expect(c.submissionDeadlineAt.getUTCDate()).toBe(22);
    expect(c.requestAt < c.reminderAt && c.reminderAt < c.submissionDeadlineAt).toBe(true);
  });
});

describe("computeNewsletterReadiness", () => {
  const sub = (ministryId: string | null, status: ReadinessSubmissionView["status"]): ReadinessSubmissionView => ({ ministryId, status });
  const sec = (type: ReadinessSectionView["type"], hasContent: boolean, hidden = false): ReadinessSectionView => ({ type, hidden, hasContent });

  it("scores only required items and reports department response", () => {
    const r = computeNewsletterReadiness({
      departmentIds: ["a", "b", "c", "d"],
      submissions: [sub("a", "APPROVED"), sub("b", "SUBMITTED"), sub("c", "DECLINED")],
      sections: [
        sec("FEATURED_STORY", true),
        sec("UPCOMING_EVENTS", true),
        sec("STAY_CONNECTED", true),
      ],
      hasCoverImage: true,
      hasPastorMessage: true,
    });
    // required = hero-image, pastor-message, featured, events, stay-connected → all done → 100
    expect(r.score).toBe(100);
    // responded = a (approved) + b (submitted); c declined does NOT count; d silent
    expect(r.respondedDepartments).toBe(2);
    expect(r.missingDepartmentIds.sort()).toEqual(["c", "d"]);
    expect(r.approvedCount).toBe(1);
  });

  it("drops score when required components are missing or hidden", () => {
    const r = computeNewsletterReadiness({
      departmentIds: [],
      submissions: [],
      sections: [
        sec("FEATURED_STORY", true),
        sec("UPCOMING_EVENTS", true, /*hidden*/ true), // hidden required section → not done
        sec("STAY_CONNECTED", true),
      ],
      hasCoverImage: false, // required missing
      hasPastorMessage: false, // required missing
    });
    // required done: featured + stay-connected = 2 of 5 → 40
    expect(r.score).toBe(40);
    expect(requiredSectionTypes()).toContain("UPCOMING_EVENTS");
  });
});

describe("validateNewsletterForPublish", () => {
  const base = {
    status: "APPROVED" as const,
    readinessScore: 100,
    hasCoverImage: true,
    hasPastorMessage: true,
    approvedCount: 3,
    pendingReviewCount: 0,
    audienceSize: 120,
  };

  it("permits publishing an approved, complete issue", () => {
    const v = validateNewsletterForPublish(base);
    expect(v.canPublish).toBe(true);
    expect(v.errors).toHaveLength(0);
  });

  it("blocks when not approved, no cover image, empty audience, or invalid links", () => {
    expect(validateNewsletterForPublish({ ...base, status: "IN_REVIEW" }).canPublish).toBe(false);
    expect(validateNewsletterForPublish({ ...base, hasCoverImage: false }).canPublish).toBe(false);
    expect(validateNewsletterForPublish({ ...base, audienceSize: 0 }).canPublish).toBe(false);
    expect(validateNewsletterForPublish({ ...base, invalidUrls: ["javascript:alert(1)"] }).canPublish).toBe(false);
  });

  it("warns (but does not block) on pending review, empty pastor message, and partial readiness", () => {
    const v = validateNewsletterForPublish({ ...base, pendingReviewCount: 2, hasPastorMessage: false, readinessScore: 80 });
    expect(v.canPublish).toBe(true);
    expect(v.warnings.length).toBeGreaterThanOrEqual(3);
  });
});
