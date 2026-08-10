import type { OfficerRole, Prisma, MotionResult, ActionItemStatus } from "@prisma/client";

/** An office is "current" if active, started, and not past its term end. */
export function isCurrentOffice(o: { active: boolean; termStart: Date; termEnd?: Date | null }, asOf: Date = new Date()): boolean {
  if (!o.active) return false;
  if (+new Date(o.termStart) > +asOf) return false;
  if (o.termEnd && +new Date(o.termEnd) < +asOf) return false;
  return true;
}

/** Prisma WHERE for current officers (mirror of isCurrentOffice for the leadership page). */
export function currentOfficeWhere(asOf: Date = new Date()): Prisma.ChurchOfficeWhereInput {
  return { active: true, termStart: { lte: asOf }, OR: [{ termEnd: null }, { termEnd: { gte: asOf } }] };
}

export const OFFICER_ORDER: OfficerRole[] = ["ELDER", "DEACON", "DEACONESS", "CLERK", "TREASURER", "SS_SUPERINTENDENT", "MINISTRY_LEADER", "OTHER"];
export function officerRank(role: OfficerRole): number {
  const i = OFFICER_ORDER.indexOf(role);
  return i === -1 ? OFFICER_ORDER.length : i;
}

/* ===== Phase 6: motions + action items (pure logic, §31) ===== */


/**
 * Determine a motion's result from its vote tally. A motion carries on a simple majority of
 * FOR over AGAINST (abstentions don't count toward the majority). A tie fails (no majority).
 * Returns PENDING only when no votes have been recorded yet.
 */
export function tallyMotion(v: { votesFor: number; votesAgainst: number; votesAbstain: number }): MotionResult {
  const total = v.votesFor + v.votesAgainst + v.votesAbstain;
  if (total === 0) return "PENDING";
  return v.votesFor > v.votesAgainst ? "CARRIED" : "FAILED";
}

/** Allowed action-item transitions. DONE/CANCELLED are terminal but may be reopened to OPEN. */
const ACTION_ITEM_ALLOWED: Record<ActionItemStatus, ActionItemStatus[]> = {
  OPEN: ["IN_PROGRESS", "DONE", "CANCELLED"],
  IN_PROGRESS: ["DONE", "CANCELLED", "OPEN"],
  DONE: ["OPEN"],
  CANCELLED: ["OPEN"],
};

export function canActionItemTransition(from: ActionItemStatus, to: ActionItemStatus): boolean {
  return ACTION_ITEM_ALLOWED[from]?.includes(to) ?? false;
}

export function isActionItemClosed(status: ActionItemStatus): boolean {
  return status === "DONE" || status === "CANCELLED";
}

/** URL-safe slug for committee names. */
export function committeeSlug(name: string): string {
  return name.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "committee";
}
