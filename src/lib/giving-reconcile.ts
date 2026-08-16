import { normalizeEmail } from "./email-identity";

export type GiftRow = { date?: string; donorName: string; email: string | null; amount: number; fund: string | null };
export type PendingDonation = { id: string; donorName: string; email?: string | null; amount: number };

function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === ",") { out.push(cur); cur = ""; }
    else if (c === '"') q = true;
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** Parse an AdventistGiving-style export. Flexible header mapping. */
export function parseGivingCsv(text: string): GiftRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (!lines.length) return [];
  const header = parseCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => header.findIndex((h) => names.includes(h));
  const iName = idx(["donor", "donor name", "name"]);
  const iEmail = idx(["email", "email address"]);
  const iAmount = idx(["amount", "gift amount", "total"]);
  const iFund = idx(["fund", "designation", "category"]);
  const iDate = idx(["date", "gift date"]);
  const rows: GiftRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i]!);
    const donorName = (iName >= 0 ? f[iName] ?? "" : "").trim();
    const amount = Math.round(parseFloat((iAmount >= 0 ? f[iAmount] ?? "" : "").replace(/[$,]/g, "")) || 0);
    if (!donorName && !amount) continue;
    rows.push({ donorName, amount, email: iEmail >= 0 ? (f[iEmail] ?? "").trim() || null : null, fund: iFund >= 0 ? (f[iFund] ?? "").trim() || null : null, date: iDate >= 0 ? (f[iDate] ?? "").trim() : undefined });
  }
  return rows;
}

/**
 * A fundraiser as the reconciliation screen needs to see it, for suggesting which fundraiser an
 * unmatched gift belongs to.
 */
export type AttributionCandidate = { id: string; slug: string; title: string; displayName: string };

/**
 * Suggest which fundraiser an AdventistGiving row belongs to, from its fund/designation field.
 * The giving handoff sets `designation` to the fundraiser's slug, so an exact slug hit is the
 * strong signal; a title or display-name mention is accepted as a weaker one.
 *
 * This is only ever a SUGGESTION. Nothing becomes verified until a treasurer confirms it — the
 * suggestion exists to save typing, not to decide attribution.
 */
export function suggestFundraiser(gift: GiftRow, candidates: AttributionCandidate[]): string | null {
  const fund = (gift.fund ?? "").trim().toLowerCase();
  if (!fund) return null;

  const exact = candidates.find((c) => c.slug.toLowerCase() === fund);
  if (exact) return exact.id;

  const contained = candidates.find((c) => c.slug.length >= 4 && fund.includes(c.slug.toLowerCase()));
  if (contained) return contained.id;

  const named = candidates.find((c) => {
    const t = c.title.trim().toLowerCase();
    const n = c.displayName.trim().toLowerCase();
    return (t.length >= 4 && fund.includes(t)) || (n.length >= 4 && fund.includes(n));
  });
  return named?.id ?? null;
}

/** Match parsed gifts to PENDING donations by amount + (email or name). One-to-one. */
export function matchGifts(pending: PendingDonation[], gifts: GiftRow[]): {
  matched: { donationId: string; donorName: string; amount: number }[];
  unmatchedGifts: GiftRow[];
  unmatchedDonations: PendingDonation[];
} {
  const remaining = new Map(pending.map((p) => [p.id, p]));
  const matched: { donationId: string; donorName: string; amount: number }[] = [];
  const unmatchedGifts: GiftRow[] = [];

  for (const g of gifts) {
    const gEmail = g.email ? normalizeEmail(g.email) : null;
    const gName = g.donorName.trim().toLowerCase();
    let hit: PendingDonation | undefined;
    for (const p of remaining.values()) {
      if (p.amount !== g.amount) continue;
      const pEmail = p.email ? normalizeEmail(p.email) : null;
      if ((gEmail && pEmail && gEmail === pEmail) || p.donorName.trim().toLowerCase() === gName) { hit = p; break; }
    }
    if (hit) { matched.push({ donationId: hit.id, donorName: hit.donorName, amount: hit.amount }); remaining.delete(hit.id); }
    else unmatchedGifts.push(g);
  }
  return { matched, unmatchedGifts, unmatchedDonations: [...remaining.values()] };
}
