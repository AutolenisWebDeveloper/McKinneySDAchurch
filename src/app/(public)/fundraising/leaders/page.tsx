import { prisma } from "@/lib/db";
import { formatUsd, rankFundraisers, raiserBadge, type LeaderEntry } from "@/lib/fundraising";

export const dynamic = "force-dynamic";
export const metadata = { title: "Top Fundraisers — McKinney SDA Church" };

export default async function Leaders() {
  // All confirmed, fundraiser-attributed donations, aggregated per person (across campaigns).
  const rows = await prisma.donation.findMany({
    where: { status: "CONFIRMED", fundraiserId: { not: null } },
    select: { amount: true, fundraiser: { select: { ownerUserId: true, displayName: true } } },
  });
  const byPerson = new Map<string, { name: string; total: number }>();
  for (const r of rows) {
    if (!r.fundraiser) continue;
    const key = r.fundraiser.ownerUserId ?? `name:${r.fundraiser.displayName}`;
    const cur = byPerson.get(key) ?? { name: r.fundraiser.displayName, total: 0 };
    cur.total += r.amount;
    byPerson.set(key, cur);
  }
  const entries: LeaderEntry[] = [...byPerson.entries()].map(([id, v]) => ({ id, name: v.name, total: v.total }));
  const board = rankFundraisers(entries).slice(0, 25);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">🏆 Top Fundraisers</h1>
      <p className="text-muted text-sm mb-6">All-time, across every campaign. Thank you to everyone raising support for our church.</p>
      {board.length ? (
        <ol className="space-y-1">
          {board.map((b) => {
            const badge = raiserBadge(b.total);
            return (
              <li key={b.id} className="flex items-center justify-between rounded border border-black/10 dark:border-white/10 px-3 py-2">
                <span>#{b.rank} {b.name}{badge ? <span className="ml-2 text-xs rounded px-2 py-0.5 bg-sda-gold text-sda-navy">{badge}</span> : null}</span>
                <span className="font-medium">{formatUsd(b.total)}</span>
              </li>
            );
          })}
        </ol>
      ) : <p className="text-muted">No fundraising results yet — be the first!</p>}
    </div>
  );
}
