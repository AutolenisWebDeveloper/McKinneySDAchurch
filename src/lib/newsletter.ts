import type {
  NewsletterIssueStatus,
  NewsletterSubmissionStatus,
  NewsletterSectionType,
  NewsletterContentType,
} from "@prisma/client";

/**
 * Pure Monthly-Newsletter logic (§5/§9/§13/§24) — no I/O. Issue + submission status machines,
 * readiness scoring, month keying, and publish validation live here so they are deterministic and
 * fully unit-tested; the DB/server layer (`newsletters.ts`) calls into them. Generic helpers
 * (`slugify`, `uniqueSlug`, `isSafeUrl`) are shared from `weekly-packet.ts` rather than re-declared.
 */

/* ---- Issue status machine (§5) ---- */
const ISSUE_ALLOWED: Record<NewsletterIssueStatus, NewsletterIssueStatus[]> = {
  DRAFT: ["COLLECTING"],
  COLLECTING: ["IN_REVIEW"],
  IN_REVIEW: ["READY", "COLLECTING"],
  READY: ["APPROVED", "IN_REVIEW"],
  APPROVED: ["SCHEDULED", "PUBLISHED", "READY"],
  SCHEDULED: ["PUBLISHED", "APPROVED"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canIssueTransition(from: NewsletterIssueStatus, to: NewsletterIssueStatus): boolean {
  return ISSUE_ALLOWED[from]?.includes(to) ?? false;
}

/* ---- Submission status machine (§9) ---- */
const SUBMISSION_ALLOWED: Record<NewsletterSubmissionStatus, NewsletterSubmissionStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "APPROVED", "CHANGES_REQUESTED", "DECLINED"],
  UNDER_REVIEW: ["APPROVED", "CHANGES_REQUESTED", "DECLINED"],
  CHANGES_REQUESTED: ["SUBMITTED"],
  APPROVED: ["ADDED_TO_ISSUE", "UNDER_REVIEW"],
  ADDED_TO_ISSUE: ["APPROVED"],
  DECLINED: [],
};

export function canSubmissionTransition(
  from: NewsletterSubmissionStatus,
  to: NewsletterSubmissionStatus,
): boolean {
  return SUBMISSION_ALLOWED[from]?.includes(to) ?? false;
}

/** A submission still needs someone's action until it is approved/added/declined. */
export function isSubmissionOpen(status: NewsletterSubmissionStatus): boolean {
  return status === "DRAFT" || status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "CHANGES_REQUESTED";
}

/** Approved or added-to-issue submissions are the ones eligible to render. */
export function isSubmissionUsable(status: NewsletterSubmissionStatus): boolean {
  return status === "APPROVED" || status === "ADDED_TO_ISSUE";
}

/** A department has "responded" once it has a submission that is not DECLINED (or a draft). */
export function isSubmissionResponse(status: NewsletterSubmissionStatus): boolean {
  return status !== "DECLINED";
}

/* ---- Content types (§8) ---- */
export const CONTENT_TYPES: NewsletterContentType[] = [
  "NEWS", "EVENT", "ANNOUNCEMENT", "MINISTRY_STORY", "ACCOMPLISHMENT",
  "VOLUNTEER", "TESTIMONY", "OUTREACH", "OTHER",
];

const CONTENT_TYPE_LABELS: Record<NewsletterContentType, string> = {
  NEWS: "News",
  EVENT: "Event",
  ANNOUNCEMENT: "Announcement",
  MINISTRY_STORY: "Ministry Story",
  ACCOMPLISHMENT: "Accomplishment",
  VOLUNTEER: "Volunteer Opportunity",
  TESTIMONY: "Testimony",
  OUTREACH: "Outreach",
  OTHER: "Other",
};

export function contentTypeLabel(t: NewsletterContentType): string {
  return CONTENT_TYPE_LABELS[t] ?? "Other";
}

export function normalizeContentType(value?: string | null): NewsletterContentType {
  if (!value) return "NEWS";
  const up = value.trim().toUpperCase();
  return (CONTENT_TYPES as string[]).includes(up) ? (up as NewsletterContentType) : "OTHER";
}

/* ---- Section types (§13/§14) ---- */
/** Default editorial running order for a fresh issue. Optional sections may be hidden by the editor. */
export const DEFAULT_SECTIONS: { type: NewsletterSectionType; title: string; optional: boolean }[] = [
  { type: "HERO", title: "Cover", optional: false },
  { type: "PASTOR_MESSAGE", title: "From Our Pastor", optional: false },
  { type: "FEATURED_STORY", title: "This Month at McKinney SDA", optional: false },
  { type: "CHURCH_LIFE", title: "Church Life", optional: true },
  { type: "MINISTRY_SPOTLIGHT", title: "Ministry Spotlight", optional: true },
  { type: "MEMBER_HIGHLIGHT", title: "Member & Family Highlights", optional: true },
  { type: "COMMUNITY_MISSION", title: "Community & Mission", optional: true },
  { type: "UPCOMING_EVENTS", title: "Coming Up", optional: false },
  { type: "PHOTO_STORY", title: "This Month in Pictures", optional: true },
  { type: "BUILDING_UPDATE", title: "Building Project", optional: true },
  { type: "SERVE_INVOLVED", title: "Serve & Get Involved", optional: true },
  { type: "STAY_CONNECTED", title: "Stay Connected", optional: false },
];

const SECTION_LABELS: Record<NewsletterSectionType, string> = {
  HERO: "Cover / Hero",
  PASTOR_MESSAGE: "From Our Pastor",
  FEATURED_STORY: "Featured Story",
  CHURCH_LIFE: "Church Life",
  MINISTRY_SPOTLIGHT: "Ministry Spotlight",
  MEMBER_HIGHLIGHT: "Member & Family Highlights",
  COMMUNITY_MISSION: "Community & Mission",
  UPCOMING_EVENTS: "Upcoming Events",
  PHOTO_STORY: "Photo Story",
  BUILDING_UPDATE: "Building Project Update",
  SERVE_INVOLVED: "Serve & Get Involved",
  CTA: "Call to Action",
  STAY_CONNECTED: "Stay Connected",
  FOOTER: "Footer",
};

export function sectionLabel(t: NewsletterSectionType): string {
  return SECTION_LABELS[t] ?? t;
}

/* ---- Month keying (§23) ---- */

/** First day of the month containing `now`, at UTC midnight. Stable, timezone-safe issue key. */
export function monthStartOf(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** The month an issue is prepared *for* — the month after the one we are collecting in.
 * Newsletters are assembled during a month and sent for the upcoming month by default. */
export function upcomingIssueMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** Stable archive slug `YYYY-MM` from a month-start date. */
export function monthSlug(monthStart: Date): string {
  const y = monthStart.getUTCFullYear();
  const m = String(monthStart.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Human label e.g. "September 2026". */
export function monthLabel(monthStart: Date): string {
  return `${MONTHS[monthStart.getUTCMonth()]} ${monthStart.getUTCFullYear()}`;
}

/** Default configurable cadence for a month: request 15th, reminder 20th, deadline 22nd (§6). */
export function defaultCadence(monthStart: Date): { requestAt: Date; reminderAt: Date; submissionDeadlineAt: Date } {
  const y = monthStart.getUTCFullYear();
  const m = monthStart.getUTCMonth();
  // Prep happens in the month *before* the issue month.
  const prevMonth = m - 1;
  const at = (day: number, hour: number) => new Date(Date.UTC(y, prevMonth, day, hour, 0, 0));
  return {
    requestAt: at(15, 14), // 15th 9am Central ≈ 14:00 UTC
    reminderAt: at(20, 14),
    submissionDeadlineAt: at(22, 23), // end of the 22nd
  };
}

/* ---- Readiness (§24) ---- */

export type ReadinessSubmissionView = {
  ministryId: string | null;
  status: NewsletterSubmissionStatus;
};

export type ReadinessSectionView = {
  type: NewsletterSectionType;
  hidden: boolean;
  hasContent: boolean;
};

export type NewsletterReadinessInput = {
  /** All ministry ids invited to contribute. */
  departmentIds: string[];
  submissions: ReadinessSubmissionView[];
  sections: ReadinessSectionView[];
  hasCoverImage: boolean;
  hasPastorMessage: boolean;
};

export type NewsletterReadinessItem = { key: string; label: string; done: boolean; required: boolean };

export type NewsletterReadiness = {
  score: number; // 0..100 over required items only
  items: NewsletterReadinessItem[];
  totalDepartments: number;
  respondedDepartments: number;
  missingDepartmentIds: string[];
  approvedCount: number;
};

/** Required section types that gate publication-readiness. */
const REQUIRED_SECTION_TYPES: NewsletterSectionType[] = [
  "HERO", "PASTOR_MESSAGE", "FEATURED_STORY", "UPCOMING_EVENTS", "STAY_CONNECTED",
];

/**
 * Readiness is derived from real required components (§24) — never a hard-coded percentage. Each
 * required checklist item contributes equally; the score is the share of required items done.
 * Department response and approved-submission counts are surfaced for the command center but do
 * not themselves gate the score (an issue can be ready even if some departments stay silent).
 */
export function computeNewsletterReadiness(input: NewsletterReadinessInput): NewsletterReadiness {
  const departmentIds = [...new Set(input.departmentIds)];
  const respondedSet = new Set(
    input.submissions.filter((s) => isSubmissionResponse(s.status) && s.ministryId).map((s) => s.ministryId as string),
  );
  const responded = departmentIds.filter((d) => respondedSet.has(d)).length;
  const missing = departmentIds.filter((d) => !respondedSet.has(d));
  const approvedCount = input.submissions.filter((s) => isSubmissionUsable(s.status)).length;

  const sectionHasContent = (type: NewsletterSectionType): boolean => {
    const s = input.sections.find((x) => x.type === type && !x.hidden);
    return !!s && s.hasContent;
  };

  const items: NewsletterReadinessItem[] = [
    { key: "hero-image", label: "Hero Image", done: input.hasCoverImage, required: true },
    { key: "pastor-message", label: "Pastor Message", done: input.hasPastorMessage, required: true },
    { key: "featured", label: "Featured Story", done: sectionHasContent("FEATURED_STORY"), required: true },
    { key: "events", label: "Upcoming Events", done: sectionHasContent("UPCOMING_EVENTS"), required: true },
    { key: "stay-connected", label: "Stay Connected", done: sectionHasContent("STAY_CONNECTED"), required: true },
    { key: "spotlight", label: "Ministry Spotlight", done: sectionHasContent("MINISTRY_SPOTLIGHT"), required: false },
    { key: "photos", label: "Photo Gallery", done: sectionHasContent("PHOTO_STORY"), required: false },
    { key: "approved", label: "Approved Submissions", done: approvedCount > 0, required: false },
  ];

  const required = items.filter((i) => i.required);
  const done = required.filter((i) => i.done).length;
  const score = required.length === 0 ? 100 : Math.round((done / required.length) * 100);

  return {
    score,
    items,
    totalDepartments: departmentIds.length,
    respondedDepartments: responded,
    missingDepartmentIds: missing,
    approvedCount,
  };
}

// Keep a reference so downstream code and tests can assert the required set is exactly these.
export function requiredSectionTypes(): NewsletterSectionType[] {
  return [...REQUIRED_SECTION_TYPES];
}

/* ---- Publish validation (§25/§26) ---- */

export type NewsletterPublishInput = {
  status: NewsletterIssueStatus;
  readinessScore: number;
  hasCoverImage: boolean;
  hasPastorMessage: boolean;
  approvedCount: number;
  /** Submissions still awaiting review (SUBMITTED / UNDER_REVIEW). */
  pendingReviewCount: number;
  audienceSize: number;
  invalidUrls?: string[];
};

export type NewsletterPublishValidation = { errors: string[]; warnings: string[]; canPublish: boolean };

/**
 * Split publish blockers (hard failures) from advisories. Hard errors block the send/publish
 * (§26 "do not allow production send before required validations pass"); warnings are acceptable.
 */
export function validateNewsletterForPublish(input: NewsletterPublishInput): NewsletterPublishValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.status !== "APPROVED" && input.status !== "SCHEDULED") {
    errors.push("The issue must be approved before it can be published or scheduled.");
  }
  if (!input.hasCoverImage) errors.push("Add a hero/cover image before publishing.");
  if (input.audienceSize <= 0) errors.push("The selected audience resolved to zero recipients.");
  if (input.invalidUrls && input.invalidUrls.length > 0) {
    errors.push(`${input.invalidUrls.length} link${input.invalidUrls.length === 1 ? "" : "s"} could not be validated — fix or remove them.`);
  }

  if (input.pendingReviewCount > 0) {
    warnings.push(`${input.pendingReviewCount} submission${input.pendingReviewCount === 1 ? " is" : "s are"} still awaiting review and will be left out.`);
  }
  if (!input.hasPastorMessage) warnings.push("The pastor's message is empty.");
  if (input.approvedCount <= 0) warnings.push("No department submissions are approved yet.");
  if (input.readinessScore < 100) warnings.push(`Readiness is ${input.readinessScore}% — some optional components are missing.`);

  return { errors, warnings, canPublish: errors.length === 0 };
}
