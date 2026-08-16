import Link from "next/link";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { formatUsd, rankFundraisers, raiserBadge, type LeaderEntry } from "@/lib/fundraising";
import { PageHeader, EmptyState } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Top Fundraisers",
  description: "Celebrating everyone raising support for our church.",
};

/** Rank medallion — gold/silver/bronze for the top three, a plain number otherwise. */
function Rank({ rank }: { rank: number }) {
  const styles =
    rank === 1 ? "bg-gold text-denim-950" :
    rank === 2 ? "bg-denim-200 text-denim-900" :
    rank === 3 ? "bg-accent-strong text-white" :
    null;
  if (!styles) return <span className="flex h-8 w-8 items-center justify-center font-serif text-base font-semibold text-muted">{rank}</span>;
  return <span className={`flex h-8 w-8 items-center justify-center rounded-full font-serif text-sm font-semibold shadow-sm ${styles}`}>{rank}</span>;
}

export default async function Leaders() {
  // All confirmed, fundraiser-attributed donations, aggregated per person (across campaigns).
  // Recognition survives a normal close, but a fundraiser the church DECLINED or ARCHIVED must
  // disappear from public surfaces — moderation has to actually take the name down, and the
  // display name on a Supporter-owned page is free text typed by an unauthenticated visitor.
  const rows = await safe(prisma.donation.findMany({
    where: {
      status: "CONFIRMED",
      fundraiserId: { not: null },
      fundraiser: { status: { in: ["ACTIVE", "CLOSED"] } },
    },
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

  return (
    <>
      <PageHeader
        eyebrow="With gratitude"
        title="Top fundraisers"
        lede="All-time, across every campaign. Thank you to everyone raising support for our church family."
        tone="denim"
        actions={<Link href="/fundraising" className="btn btn-ghost-light">Back to campaigns</Link>}
      />
      <Section container size="narrow">
        {board.length ? (
          <ol className="space-y-2">
            {board.map((b, i) => {
              const badge = raiserBadge(b.total);
              return (
                <Reveal as="li" key={b.id} delayMs={Math.min(i, 6) * 45}>
                  <div className={`flex items-center justify-between rounded-xl border px-4 py-3.5 ${b.rank <= 3 ? "border-gold/40 bg-gold/5" : "border-line bg-surface"}`}>
                    <span className="flex items-center gap-3">
                      <Rank rank={b.rank} />
                      <span className="font-medium text-fg">{b.name}</span>
                      {badge ? <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-denim-900 dark:text-denim-100">{badge}</span> : null}
                    </span>
                    <span className="font-serif text-lg font-semibold text-denim-800 dark:text-denim-300">{formatUsd(b.total)}</span>
                  </div>
                </Reveal>
              );
            })}
          </ol>
        ) : (
          <EmptyState title="No fundraising results yet" body="Be the first to start a fundraiser and appear here." />
        )}
      </Section>
    </>
  );
}
