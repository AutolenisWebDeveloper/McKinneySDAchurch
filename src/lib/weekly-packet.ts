import type { WeeklyPacketStatus, PacketSubmissionStatus, PacketSubmissionKind } from "@prisma/client";

/**
 * Pure Weekly-Packet logic (§22, §12) — no I/O. Readiness scoring and status transitions live
 * here so they are deterministic and fully unit-tested; the DB/server layer calls into them.
 */

/* ---- Status machine ---- */
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
