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
