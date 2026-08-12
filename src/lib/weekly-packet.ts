import type { WeeklyPacketStatus, PacketSubmissionStatus, PacketSubmissionKind } from "@prisma/client";

/**
 * Pure Weekly-Packet logic (§22, §12) — no I/O. Readiness scoring, packet + submission status
 * machines, announcement categorization, slugging, and publish validation live here so they are
 * deterministic and fully unit-tested; the DB/server layer calls into them.
 */

/* ---- Packet status machine ---- */
const ALLOWED: Record<WeeklyPacketStatus, WeeklyPacketStatus[]> = {
  COLLECTING: ["IN_REVIEW"],
  IN_REVIEW: ["READY", "COLLECTING"],
  READY: ["PUBLISHED", "IN_REVIEW"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canPacketTransition(from: WeeklyPacketStatus, to: WeeklyPacketStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

/* ---- Submission (announcement) status machine (§6) ----
 * Canonical governed lifecycle. Legacy ACCEPTED/NEEDS_INFO rows normalize into this graph so
 * old data keeps working. Structural validity only — WHO may drive each edge (department head
 * vs. admin) is enforced in the service layer. */
export type SubmissionState =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED"
  | "ARCHIVED";

const SUBMISSION_ALLOWED: Record<SubmissionState, SubmissionState[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "APPROVED", "CHANGES_REQUESTED", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "CHANGES_REQUESTED", "REJECTED"],
  CHANGES_REQUESTED: ["SUBMITTED"],
  APPROVED: ["PUBLISHED", "UNDER_REVIEW"],
  REJECTED: [],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: [],
};

/** Normalize a stored PacketSubmissionStatus (incl. legacy values) to a canonical SubmissionState. */
export function normalizeSubmissionState(status: PacketSubmissionStatus): SubmissionState {
  switch (status) {
    case "ACCEPTED":
      return "APPROVED";
    case "NEEDS_INFO":
      return "CHANGES_REQUESTED";
    default:
      return status as SubmissionState;
  }
}

export function canSubmissionTransition(from: PacketSubmissionStatus, to: SubmissionState): boolean {
  return SUBMISSION_ALLOWED[normalizeSubmissionState(from)]?.includes(to) ?? false;
}

/** A submission is "open" (still needs someone's action) until it is approved/published/etc. */
export function isSubmissionOpen(status: PacketSubmissionStatus): boolean {
  const s = normalizeSubmissionState(status);
  return s === "DRAFT" || s === "SUBMITTED" || s === "UNDER_REVIEW" || s === "CHANGES_REQUESTED";
}

/** Approved-or-published announcements are what render publicly. */
export function isSubmissionPublic(status: PacketSubmissionStatus): boolean {
  const s = normalizeSubmissionState(status);
  return s === "APPROVED" || s === "PUBLISHED";
}

/* ---- Announcement editorial categories (§4/§15) ---- */
export const ANNOUNCEMENT_CATEGORIES = [
  "This Weekend",
  "Coming Up",
  "Ministries",
  "Community & Outreach",
  "Prayer & Fellowship",
] as const;
export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];
const DEFAULT_CATEGORY: AnnouncementCategory = "Coming Up";

/** Snap any stored/free-text category to a canonical one (case-insensitive), else the default. */
export function normalizeCategory(category?: string | null): AnnouncementCategory {
  if (!category) return DEFAULT_CATEGORY;
  const found = ANNOUNCEMENT_CATEGORIES.find((c) => c.toLowerCase() === category.trim().toLowerCase());
  return found ?? DEFAULT_CATEGORY;
}

/** Editorial print/online ordering weight for a category. */
export function categoryRank(category?: string | null): number {
  const i = ANNOUNCEMENT_CATEGORIES.indexOf(normalizeCategory(category));
  return i === -1 ? ANNOUNCEMENT_CATEGORIES.length : i;
}

/* ---- Deep-link slugs (§4) ---- */
/** URL/anchor-safe slug from a title. Deterministic; empty input → "item". */
export function slugify(text: string): string {
  const s = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return s || "item";
}

/** Ensure a slug is unique within a set (append -2, -3, …). Pure; caller supplies the taken set. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  let candidate = base;
  let n = 2;
  while (taken.has(candidate)) candidate = `${base}-${n++}`;
  return candidate;
}

/* ---- Publish validation (§13/§14) ---- */
export type BulletinValidationInput = {
  orderOfServiceItemCount: number;
  approvedAnnouncementCount: number;
  /** Submissions still SUBMITTED / UNDER_REVIEW (unreviewed) — a governance hard-stop. */
  pendingReviewCount: number;
  /** Submissions in CHANGES_REQUESTED the department head hasn't resubmitted. */
  changesRequestedCount: number;
  sermonTitle?: string | null;
  speaker?: string | null;
  scripture?: string | null;
  sabbathSchoolTime?: string | null;
  divineWorshipTime?: string | null;
  /** URLs found anywhere in the edition that failed validation. */
  invalidUrls?: string[];
};

export type BulletinValidation = { errors: string[]; warnings: string[]; canPublish: boolean };

/**
 * Split publish blockers (hard failures) from advisories (optional/noncritical). Publication is
 * blocked only by genuine hard failures (§14); everything else is a warning the admin may accept.
 */
export function validateBulletinForPublish(input: BulletinValidationInput): BulletinValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.orderOfServiceItemCount <= 0) {
    errors.push("The order of service has no items — add the worship program before publishing.");
  }
  if (input.pendingReviewCount > 0) {
    errors.push(
      `${input.pendingReviewCount} submission${input.pendingReviewCount === 1 ? " is" : "s are"} still awaiting review — approve, request changes, or reject before publishing.`,
    );
  }
  if (input.invalidUrls && input.invalidUrls.length > 0) {
    errors.push(`${input.invalidUrls.length} link${input.invalidUrls.length === 1 ? "" : "s"} could not be validated — fix or remove them.`);
  }

  if (input.changesRequestedCount > 0) {
    warnings.push(`${input.changesRequestedCount} submission${input.changesRequestedCount === 1 ? "" : "s"} awaiting the department head's changes will be left out.`);
  }
  if (input.approvedAnnouncementCount <= 0) warnings.push("No announcements are approved yet.");
  if (!input.sermonTitle?.trim()) warnings.push("The sermon title is empty.");
  if (!input.speaker?.trim()) warnings.push("The speaker is empty.");
  if (!input.scripture?.trim()) warnings.push("The scripture reading is empty.");
  if (!input.sabbathSchoolTime?.trim()) warnings.push("Sabbath School time is not set.");
  if (!input.divineWorshipTime?.trim()) warnings.push("Divine Worship time is not set.");

  return { errors, warnings, canPublish: errors.length === 0 };
}

/* ---- URL validation (§16/§23) ---- */
/** Accept only http(s) or mailto/tel URLs for church-supplied links; reject everything else. */
export function isSafeUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  if (/^(mailto:|tel:)/i.test(u)) return u.length <= 254;
  try {
    const parsed = new URL(u);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && u.length <= 2048;
  } catch {
    return false;
  }
}

/* ---- Readiness ---- */

export type ReadinessSubmission = {
  ministryId: string | null;
  kind: PacketSubmissionKind;
  status: PacketSubmissionStatus;
};

export type ReadinessInput = {
  /** All ministry ids expected to respond each week. */
  departmentIds: string[];
  submissions: ReadinessSubmission[];
  /** Whether the packet has a linked order-of-service (Bulletin) with at least one item. */
  hasOrderOfService: boolean;
};

export type Readiness = {
  score: number; // 0..100
  totalDepartments: number;
  respondedDepartments: number;
  missingDepartmentIds: string[];
  hasOrderOfService: boolean;
};

/**
 * A department has "responded" when it has at least one submission that is not REJECTED — an
 * explicit NOTHING_THIS_WEEK counts. Score weights department response at 80% and the presence
 * of an order-of-service at 20% (a packet with no departments still needs its program).
 */
export function computeReadiness(input: ReadinessInput): Readiness {
  const departmentIds = [...new Set(input.departmentIds)];
  const total = departmentIds.length;

  const respondedSet = new Set(
    input.submissions
      .filter((s) => s.status !== "REJECTED" && s.ministryId)
      .map((s) => s.ministryId as string),
  );
  const responded = departmentIds.filter((d) => respondedSet.has(d)).length;
  const missing = departmentIds.filter((d) => !respondedSet.has(d));

  const deptScore = total === 0 ? 100 : (responded / total) * 100;
  const oosScore = input.hasOrderOfService ? 100 : 0;
  const score = Math.round(deptScore * 0.8 + oosScore * 0.2);

  return {
    score,
    totalDepartments: total,
    respondedDepartments: responded,
    missingDepartmentIds: missing,
    hasOrderOfService: input.hasOrderOfService,
  };
}

/* ---- Sabbath helpers ---- */

/** The date of the upcoming Saturday (Sabbath) at UTC midnight; returns today if it's Saturday. */
export function upcomingSabbath(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const add = (6 - day + 7) % 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d;
}
