import { raisedPct, formatUsd } from "./construction";
export { raisedPct, formatUsd };

/** URL-safe base slug from a name/title. Callers append a short suffix for uniqueness. */
export function slugify(input: string): string {
  return input.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 60) || "campaign";
}

export type DonationLike = { amount: number; status: string; fundraiserId?: string | null };

/** Confirmed dollars only (money reconciled as actually given). */
export function confirmedTotal(donations: DonationLike[]): number {
  return donations.filter((d) => d.status === "CONFIRMED").reduce((s, d) => s + d.amount, 0);
}

/** Campaign rollup: confirmed vs pledged (non-cancelled), donor count, % to goal. */
export function campaignTotals(donations: DonationLike[], goal: number): {
  confirmed: number; pledged: number; count: number; pct: number;
} {
  const active = donations.filter((d) => d.status !== "CANCELLED");
  const confirmed = confirmedTotal(donations);
  return {
    confirmed,
    pledged: active.reduce((s, d) => s + d.amount, 0),
    count: donations.filter((d) => d.status === "CONFIRMED").length,
    pct: raisedPct(confirmed, goal),
  };
}

export type LeaderEntry = { id: string; name: string; total: number };

/** Wall of Fame: fundraisers ranked by confirmed total (desc). Ties share a rank. */
export function rankFundraisers(entries: LeaderEntry[]): (LeaderEntry & { rank: number })[] {
  const sorted = [...entries].sort((a, b) => b.total - a.total);
  let lastTotal: number | null = null, lastRank = 0;
  return sorted.map((e, i) => {
    const rank = lastTotal !== null && e.total === lastTotal ? lastRank : i + 1;
    lastTotal = e.total; lastRank = rank;
    return { ...e, rank };
  });
}

/** Sum confirmed donations per fundraiser id -> leaderboard entries. */
export function fundraiserTotals(donations: DonationLike[], names: Record<string, string>): LeaderEntry[] {
  const map = new Map<string, number>();
  for (const d of donations) {
    if (d.status !== "CONFIRMED" || !d.fundraiserId) continue;
    map.set(d.fundraiserId, (map.get(d.fundraiserId) ?? 0) + d.amount);
  }
  return [...map.entries()].map(([id, total]) => ({ id, name: names[id] ?? "Member", total }));
}

/** Recognition tier for a raiser's confirmed total. */
export const RAISER_TIERS = [
  { name: "Cornerstone", min: 10000 },
  { name: "Gold", min: 5000 },
  { name: "Silver", min: 1000 },
  { name: "Bronze", min: 100 },
] as const;
export function raiserBadge(total: number): string | null {
  for (const t of RAISER_TIERS) if (total >= t.min) return t.name;
  return null;
}

/* =====================================================================================
 * Verified-amount semantics (spec §3). Every figure a fundraiser owner, a visitor, or the
 * dashboard sees — raised, %, remaining, milestones, "this month" — comes from these
 * helpers, and they read CONFIRMED donations only. A PENDING donation is a *candidate*
 * attribution: it is never counted and never displayed as verified.
 * ===================================================================================== */

/** A donation as the verified-progress math needs to see it. No donor fields — by design. */
export type VerifiedDonationLike = {
  amount: number;
  status: string;
  confirmedAt?: Date | null;
  /**
   * Used ONLY to avoid counting the same person twice. Never rendered, never returned by any
   * display helper — see supporterCount.
   */
  email?: string | null;
  donorName?: string | null;
};

/** Treasurer-verified dollars. The single input to every progress figure. */
export function verifiedTotal(donations: VerifiedDonationLike[]): number {
  return donations.filter((d) => d.status === "CONFIRMED").reduce((s, d) => s + d.amount, 0);
}

/** Candidate (unconfirmed) dollars — shown to admins only, never as verified progress. */
export function candidateTotal(donations: VerifiedDonationLike[]): number {
  return donations.filter((d) => d.status === "PENDING").reduce((s, d) => s + d.amount, 0);
}

export type Progress = {
  /** Verified dollars raised. */
  raised: number;
  goal: number;
  /** True percentage — may exceed 100 when a fundraiser goes over goal (§3). */
  pct: number;
  /** Percentage for the progress bar's fill, capped at 100 so the bar never overflows. */
  barPct: number;
  /** Dollars still to go; 0 once the goal is met. */
  remaining: number;
  goalReached: boolean;
};

/**
 * Progress against a goal. Over-goal shows the true amount and percentage (e.g. "$11,200 of
 * $10,000 — 112%") while the bar fill caps at 100%; giving continues after the goal is met.
 */
export function fundraiserProgress(raised: number, goal: number): Progress {
  const safeGoal = Math.max(0, Math.round(goal));
  const safeRaised = Math.max(0, Math.round(raised));
  const pct = safeGoal > 0 ? Math.round((safeRaised / safeGoal) * 100) : 0;
  return {
    raised: safeRaised,
    goal: safeGoal,
    pct,
    barPct: Math.min(100, Math.max(0, pct)),
    remaining: Math.max(0, safeGoal - safeRaised),
    goalReached: safeGoal > 0 && safeRaised >= safeGoal,
  };
}

/** Verified dollars confirmed within the calendar month containing `now`. */
export function verifiedThisMonth(donations: VerifiedDonationLike[], now: Date = new Date()): number {
  const y = now.getFullYear(), m = now.getMonth();
  return donations
    .filter((d) => d.status === "CONFIRMED" && d.confirmedAt && d.confirmedAt.getFullYear() === y && d.confirmedAt.getMonth() === m)
    .reduce((s, d) => s + d.amount, 0);
}

/**
 * Supporter count, or null when the number would not be trustworthy (§3, §18). Only verified
 * gifts are counted — a candidate attribution tells us nothing reliable — and zero is reported
 * as null so the surface omits the figure rather than showing a hollow "0 supporters".
 */
export function supporterCount(donations: VerifiedDonationLike[]): number | null {
  const confirmed = donations.filter((d) => d.status === "CONFIRMED");
  if (!confirmed.length) return null;
  // Count PEOPLE, not gifts: someone who gives twice is one supporter. Rows with nothing to
  // identify them by fall back to counting individually, which is the safe over-count.
  let anonymous = 0;
  const seen = new Set<string>();
  for (const d of confirmed) {
    const key = d.email?.trim().toLowerCase() || d.donorName?.trim().toLowerCase();
    if (key) seen.add(key);
    else anonymous += 1;
  }
  const n = seen.size + anonymous;
  return n > 0 ? n : null;
}

/** Referral count, or null when there is nothing reliable to show (§3, §18). */
export function referralCount(referrals: unknown[]): number | null {
  return referrals.length > 0 ? referrals.length : null;
}

/** True once the target date has passed. The fundraiser stays open regardless (§18). */
export function targetDatePassed(targetDate: Date | null | undefined, now: Date = new Date()): boolean {
  return !!targetDate && targetDate.getTime() < now.getTime();
}

/* -------------------------------------------------------------- activity feed */

export type ActivityEntry = {
  at: Date;
  kind: "approved" | "verified_progress" | "milestone" | "referral_start";
  /** Already-composed, donor-free text. */
  text: string;
};

/**
 * The owner-facing Activity feed (§2). Derived entirely from the verified ledger — it shows
 * verified-progress increments, milestone crossings, and referral starts. Donor identity can
 * never reach it: the only fields read here are amount, status and confirmedAt, and amounts are
 * aggregated per reconciliation batch so no individual gift is published either.
 *
 * Milestones are replayed against the current goal, so an owner who raises their goal sees the
 * milestone history recomputed against the goal they are actually working toward.
 */
export function buildActivity(input: {
  approvedAt?: Date | null;
  goal: number;
  donations: VerifiedDonationLike[];
  referrals?: { displayName: string; createdAt: Date }[];
}): ActivityEntry[] {
  const out: ActivityEntry[] = [];

  if (input.approvedAt) {
    out.push({ at: input.approvedAt, kind: "approved", text: "Approved and ready to share" });
  }

  /**
   * Confirmed gifts, GROUPED BY RECONCILIATION. Gifts confirmed in the same treasurer batch
   * share a `confirmedAt`, so grouping on it yields one entry per reconciliation — which is what
   * §3 describes ("post at reconciliation"). Emitting a line per gift would publish each
   * individual amount, and an owner who shared their link with a handful of people could match
   * amount and date back to the person who gave it. The batch total carries the same
   * encouragement without that inference.
   */
  const byBatch = new Map<number, number>();
  for (const d of input.donations) {
    if (d.status !== "CONFIRMED" || !d.confirmedAt) continue;
    const key = d.confirmedAt.getTime();
    byBatch.set(key, (byBatch.get(key) ?? 0) + d.amount);
  }
  const confirmed = [...byBatch.entries()]
    .map(([ms, amount]) => ({ amount, at: new Date(ms) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  let running = 0;
  let lastMilestone = 0;
  for (const d of confirmed) {
    out.push({ at: d.at, kind: "verified_progress", text: `${formatUsd(d.amount)} added to your verified fundraising progress` });
    running += d.amount;
    if (input.goal > 0) {
      const pct = Math.round((running / input.goal) * 100);
      for (const m of [25, 50, 75, 100]) {
        if (m > lastMilestone && pct >= m) {
          lastMilestone = m;
          out.push({
            at: d.at,
            kind: "milestone",
            text: m === 100 ? "You reached your fundraising goal" : `You reached ${m}% of your goal`,
          });
        }
      }
    }
  }

  for (const r of input.referrals ?? []) {
    out.push({ at: r.createdAt, kind: "referral_start", text: `${r.displayName} started a fundraiser after visiting your page` });
  }

  // Newest first. Entries are built in chronological order, so ties — which are normal, because
  // a batch reconciliation confirms many gifts at the same instant — break on build order. That
  // keeps a milestone directly under the gift that caused it instead of floating away from it.
  return out
    .map((e, i) => ({ e, i }))
    .sort((a, b) => b.e.at.getTime() - a.e.at.getTime() || b.i - a.i)
    .map(({ e }) => e);
}

/* ------------------------------------------------------------------- sharing */

export type ShareTargets = {
  url: string;
  copy: string;
  sms: string;
  email: string;
  whatsapp: string;
  facebook: string;
};

/**
 * The Share tab's outbound links (§2). Every one resolves to the fundraiser's own public page,
 * which is also what the QR code encodes, so a gift arriving through any channel lands on the
 * same handoff and attributes the same way.
 */
export function shareTargets(publicUrl: string, title: string, message: string): ShareTargets {
  const text = message.trim() || `Help us build our future home — ${title}`;
  const withUrl = `${text} ${publicUrl}`;
  return {
    url: publicUrl,
    copy: publicUrl,
    sms: `sms:?&body=${encodeURIComponent(withUrl)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(withUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(withUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`,
  };
}
