import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatUsd, campaignTotals, fundraiserTotals, rankFundraisers, confirmedTotal } from "@/lib/fundraising";
import { DonateForm } from "@/components/DonateForm";
import { Container } from "@/components/ui";
import { Card, Callout } from "@/components/page-ui";

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
    <Container size="narrow" className="py-12 sm:py-16">
      {c.coverImageUrl ? <img src={c.coverImageUrl} alt={c.title} className="mb-6 max-h-72 w-full rounded-xl object-cover" /> : null}
      <p className="eyebrow mb-3">Campaign</p>
      <h1 className="text-display font-serif font-semibold text-fg">{c.title}</h1>
      {c.description ? <p className="mt-4 text-lg leading-relaxed text-muted">{c.description}</p> : null}

      <div className="card mt-8 p-6">
        <div className="flex items-end justify-between">
          <span className="text-3xl font-semibold text-denim-800 dark:text-denim-300">{formatUsd(totals.confirmed)}</span>
          {c.goal ? <span className="text-sm text-muted">of {formatUsd(c.goal)} goal</span> : null}
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-denim-100 dark:bg-white/10" role="progressbar" aria-valuenow={totals.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Campaign progress">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(totals.pct, 2)}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted">{totals.count} gift{totals.count === 1 ? "" : "s"}{c.goal ? ` · ${totals.pct}% of goal` : ""}</p>
      </div>

      {board.length ? (
        <section className="mt-12">
          <h2 className="text-title font-serif font-semibold text-fg">🏆 Wall of Fame</h2>
          <ol className="mt-5 space-y-2">
            {board.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
                <span className="font-medium text-fg"><span className="text-muted">#{b.rank}</span> {b.name}</span>
                <span className="font-semibold text-denim-800 dark:text-denim-300">{formatUsd(b.total)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {c.allowMemberFundraisers ? (
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-title font-serif font-semibold text-fg">Member fundraisers</h2>
            <Link href="/dashboard/fundraisers" className="text-sm font-semibold text-primary hover:text-primary-hover">Start your own →</Link>
          </div>
          {c.fundraisers.length ? (
            <ul className="space-y-2">
              {c.fundraisers.map((f) => (
                <li key={f.id} className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
                  <Link href={`/f/${f.slug}`} className="font-medium text-fg hover:text-primary">{f.title} <span className="text-sm text-muted">· {f.displayName}</span></Link>
                  <span className="text-sm text-muted">{formatUsd(confirmedTotal(f.donations))}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Be the first to start a fundraiser for this campaign.</p>}
        </section>
      ) : null}

      <section className="mt-12">
        <h2 className="text-title font-serif font-semibold text-fg">Give to this campaign</h2>
        {donated ? <div className="mt-4"><Callout tone="success">Thank you! Your gift has been recorded.</Callout></div> : null}
        <div className="mt-6"><DonateForm campaignId={c.id} backTo={`/fundraising/${c.slug}`} /></div>
      </section>
    </Container>
  );
}
