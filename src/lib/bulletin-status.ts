import type { PacketSubmissionStatus } from "@prisma/client";
import { normalizeSubmissionState } from "./weekly-packet";

/** Presentation mapping for a submission status → badge label + tone (matches dashboard-ui tones). */
export type BadgeTone = "default" | "accent" | "warn" | "info" | "success";

const MAP: Record<string, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Draft", tone: "default" },
  SUBMITTED: { label: "Submitted", tone: "info" },
  UNDER_REVIEW: { label: "Under review", tone: "info" },
  CHANGES_REQUESTED: { label: "Changes requested", tone: "warn" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Not included", tone: "accent" },
  PUBLISHED: { label: "Published", tone: "success" },
  ARCHIVED: { label: "Archived", tone: "default" },
};

export function submissionStatusBadge(status: PacketSubmissionStatus): { label: string; tone: BadgeTone } {
  return MAP[normalizeSubmissionState(status)] ?? { label: String(status), tone: "default" };
}
