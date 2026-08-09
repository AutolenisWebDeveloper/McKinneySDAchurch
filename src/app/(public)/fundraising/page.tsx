import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatUsd, raisedPct } from "@/lib/fundraising";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fundraising — McKinney SDA Church" };

export default async function Fundraising() {
  const [campaigns, sums] = await Promise.all([
    prisma.fundraisingCampaign.findMany({ where: { status: "ACTIVE" } }),
    prisma.donation.groupBy({ by: ["campaignId"], where: { status: "CONFIRMED" }, _sum: { amount: true } }),
  ]);
  const raisedBy = new Map(sums.map((s) => [s.campaignId, s._sum.amount ?? 0]));
  const ranked = [...campaigns].sort((a, b) => (raisedBy.get(b.id) ?? 0) - (raisedBy.get(a.id) ?? 0));
  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-bold">Support Our Church</h1><a href="/fundraising/leaders" className="text-sm underline">🏆 Top fundraisers</a></div>
      {ranked.length ? (
        <ul className="space-y-4">
          {ranked.map((c) => {
            const raised = raisedBy.get(c.id) ?? 0;
            return (
              <li key={c.id} className="rounded border border-black/10 dark:border-white/10 p-4">
                <Link href={`/fundraising/${c.slug}`} className="font-medium hover:underline">{c.title}</Link>
                {c.description ? <p className="text-sm text-muted mt-1">{c.description}</p> : null}
                {c.goal ? (<div className="mt-2"><div className="h-2 rounded bg-black/10 dark:bg-white/10 overflow-hidden"><div className="h-full bg-sda-green" style={{ width: `${raisedPct(raised, c.goal)}%` }} /></div><p className="text-xs text-muted mt-1">{formatUsd(raised)} of {formatUsd(c.goal)}</p></div>) : <p className="text-xs text-muted mt-1">{formatUsd(raised)} raised</p>}
              </li>
            );
          })}
        </ul>
      ) : <p className="text-muted">No active campaigns right now.</p>}
    </div>
  );
}
