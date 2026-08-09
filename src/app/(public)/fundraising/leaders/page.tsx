import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { formatUsd, rankFundraisers, raiserBadge, type LeaderEntry } from "@/lib/fundraising";
import { PageHeader } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Top Fundraisers",
  description: "Celebrating everyone raising support for our church.",
};

export default async function Leaders() {
  // All confirmed, fundraiser-attributed donations, aggregated per person (across campaigns).
  const rows = await safe(prisma.donation.findMany({
    where: { status: "CONFIRMED", fundraiserId: { not: null } },
    select: { amount: true, fundraiser: { select: { ownerUserId: true, displayName: true } } },
  }), []);
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

  const medal = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null);

  return (
    <>
      <PageHeader
        eyebrow="With gratitude"
        title="🏆 Top Fundraisers"
        lede="All-time, across every campaign. Thank you to everyone raising support for our church family."
      />
      <Section container size="narrow">
        {board.length ? (
          <ol className="space-y-2">
            {board.map((b) => {
              const badge = raiserBadge(b.total);
              return (
                <li key={b.id} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3.5">
                  <span className="flex items-center gap-3">
                    <span className="w-6 text-center font-serif text-lg font-semibold text-muted">{medal(b.rank) ?? b.rank}</span>
                    <span className="font-medium text-fg">{b.name}</span>
                    {badge ? <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-denim-900 dark:text-denim-100">{badge}</span> : null}
                  </span>
                  <span className="font-semibold text-denim-800 dark:text-denim-300">{formatUsd(b.total)}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="card p-8 text-center">
            <p className="font-serif text-lg font-semibold text-fg">No fundraising results yet</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">Be the first to start a fundraiser and appear here.</p>
          </div>
        )}
      </Section>
    </>
  );
}
