import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatUsd, raisedPct, campaignTotals, fundraiserTotals, rankFundraisers, confirmedTotal } from "@/lib/fundraising";
import { DonateForm } from "@/components/DonateForm";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ donated?: string }> }) {
  const { slug } = await params;
  const { donated } = await searchParams;
  const c = await prisma.fundraisingCampaign.findUnique({
    where: { slug },
    include: { donations: { select: { amount: true, status: true, fundraiserId: true } }, fundraisers: { where: { active: true }, include: { donations: { select: { amount: true, status: true } } } } },
  });
  if (!c || c.status === "DRAFT") notFound();
  const totals = campaignTotals(c.donations, c.goal);
  const names = Object.fromEntries(c.fundraisers.map((f) => [f.id, f.displayName]));
  const board = rankFundraisers(fundraiserTotals(c.donations, names)).slice(0, 10);

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        {c.coverImageUrl ? <img src={c.coverImageUrl} alt="" className="w-full rounded-xl mb-4 max-h-64 object-cover" /> : null}
        <h1 className="text-2xl font-bold">{c.title}</h1>
        {c.description ? <p className="mt-2 text-muted">{c.description}</p> : null}
        <div className="mt-4"><div className="flex justify-between text-sm mb-1"><span className="font-medium">{formatUsd(totals.confirmed)} raised</span>{c.goal ? <span className="text-muted">Goal {formatUsd(c.goal)}</span> : null}</div>
          <div className="h-4 rounded bg-black/10 dark:bg-white/10 overflow-hidden"><div className="h-full bg-sda-green" style={{ width: `${totals.pct}%` }} /></div>
          <p className="text-xs text-muted mt-1">{totals.count} gifts{c.goal ? ` · ${totals.pct}% of goal` : ""}</p>
        </div>
      </div>

      {board.length ? (
        <section><h2 className="text-xl font-semibold mb-3">🏆 Wall of Fame</h2>
          <ol className="space-y-1">{board.map((b) => <li key={b.id} className="flex justify-between rounded border border-black/10 dark:border-white/10 px-3 py-2"><span>#{b.rank} {b.name}</span><span className="font-medium">{formatUsd(b.total)}</span></li>)}</ol>
        </section>
      ) : null}

      {c.allowMemberFundraisers ? (
        <section>
          <div className="flex items-center justify-between mb-3"><h2 className="text-xl font-semibold">Member fundraisers</h2><Link href="/dashboard/fundraisers" className="text-sm underline">Start your own →</Link></div>
          {c.fundraisers.length ? (
            <ul className="space-y-2">{c.fundraisers.map((f) => <li key={f.id} className="rounded border border-black/10 dark:border-white/10 p-3 flex justify-between"><Link href={`/f/${f.slug}`} className="hover:underline">{f.title} <span className="text-muted text-sm">· {f.displayName}</span></Link><span className="text-sm text-muted">{formatUsd(confirmedTotal(f.donations))}</span></li>)}</ul>
          ) : <p className="text-muted text-sm">Be the first to start a fundraiser for this campaign.</p>}
        </section>
      ) : null}

      <section><h2 className="text-xl font-semibold mb-3">Give to this campaign</h2>
        {donated ? <p className="rounded bg-sda-green/10 text-sda-green px-3 py-2 mb-3">Thank you! Your gift has been recorded.</p> : null}
        <DonateForm campaignId={c.id} backTo={`/fundraising/${c.slug}`} />
      </section>
    </div>
  );
}
