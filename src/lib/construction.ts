/** Construction / capital-campaign display + rollup logic. All amounts are whole dollars and
 *  are informational only — no funds are processed here (giving stays external via AdventistGiving;
 *  pledges are commitments, not payments). */

export function raisedPct(currentRaised: number, totalGoal: number): number {
  if (totalGoal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((currentRaised / totalGoal) * 100)));
}
export function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
export const TIMELINE_STATUS = ["planned", "in_progress", "completed"] as const;
export function timelineLabel(status: string): string {
  return status === "in_progress" ? "In progress" : status === "completed" ? "Completed" : "Planned";
}
export function phaseStatusLabel(s: string): string {
  return s === "IN_PROGRESS" ? "In progress" : s === "COMPLETED" ? "Completed" : s === "ON_HOLD" ? "On hold" : "Planned";
}

export type PledgeLike = { amount: number; receivedToDate: number; status: string };

/** Campaign totals from pledges. Cancelled pledges are excluded from commitments. */
export function campaignRollup(pledges: PledgeLike[]): {
  count: number; totalPledged: number; totalReceived: number; avgPledge: number; fulfillmentPct: number;
} {
  const active = pledges.filter((p) => p.status !== "CANCELLED");
  const totalPledged = active.reduce((s, p) => s + p.amount, 0);
  const totalReceived = active.reduce((s, p) => s + p.receivedToDate, 0);
  const count = active.length;
  return {
    count,
    totalPledged,
    totalReceived,
    avgPledge: count ? Math.round(totalPledged / count) : 0,
    fulfillmentPct: totalPledged > 0 ? Math.round((totalReceived / totalPledged) * 100) : 0,
  };
}

export type PhaseLike = { budget: number; spent: number; status: string };

/** Budget + completion rollup across phases. */
export function phaseRollup(phases: PhaseLike[]): {
  totalBudget: number; totalSpent: number; pctSpent: number; completionPct: number;
} {
  const totalBudget = phases.reduce((s, p) => s + p.budget, 0);
  const totalSpent = phases.reduce((s, p) => s + p.spent, 0);
  const completed = phases.filter((p) => p.status === "COMPLETED").length;
  return {
    totalBudget,
    totalSpent,
    pctSpent: totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0,
    completionPct: phases.length ? Math.round((completed / phases.length) * 100) : 0,
  };
}

/** Highest giving level an amount qualifies for (or null). */
export function qualifyingLevel(amount: number, levels: { name: string; minAmount: number }[]): string | null {
  const eligible = levels.filter((l) => amount >= l.minAmount).sort((a, b) => b.minAmount - a.minAmount);
  return eligible.length ? eligible[0].name : null;
}

/** Per-period amount for a recurring pledge, for display ("$250/month"). */
export function pledgePerPeriod(amount: number, frequency: string, termMonths?: number | null): number {
  if (frequency === "ONE_TIME") return amount;
  if (frequency === "MONTHLY") return termMonths && termMonths > 0 ? Math.round(amount / termMonths) : amount;
  if (frequency === "QUARTERLY") return termMonths && termMonths > 0 ? Math.round(amount / Math.ceil(termMonths / 3)) : amount;
  if (frequency === "ANNUAL") return termMonths && termMonths > 0 ? Math.round(amount / Math.max(1, Math.ceil(termMonths / 12))) : amount;
  return amount;
}
export function frequencyLabel(f: string): string {
  return f === "MONTHLY" ? "monthly" : f === "QUARTERLY" ? "quarterly" : f === "ANNUAL" ? "annually" : "one-time";
}
