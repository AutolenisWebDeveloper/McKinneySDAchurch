import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { formatUsd, campaignTotals, fundraiserTotals, rankFundraisers, confirmedTotal } from "@/lib/fundraising";
import { DonateForm } from "@/components/DonateForm";
import { Container } from "@/components/ui";
import { Callout } from "@/components/page-ui";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ donated?: string }> }) {
  const { slug } = await params;
  const { donated } = await searchParams;
  const c = await safe(prisma.fundraisingCampaign.findUnique({
    where: { slug },
    // Only ACTIVE fundraisers are publicly listed — a draft, in-review, rejected, closed or
    // archived page must never be reachable or advertised from a public surface (§7, §18).
    include: { donations: { select: { amount: true, status: true, fundraiserId: true } }, fundraisers: { where: { status: "ACTIVE" }, include: { donations: { select: { amount: true, status: true } } } } },
  }), null);
  if (!c || c.status === "DRAFT") notFound();
  const totals = campaignTotals(c.donations, c.goal);
  const names = Object.fromEntries(c.fundraisers.map((f) => [f.id, f.displayName]));
  const board = rankFundraisers(fundraiserTotals(c.donations, names)).slice(0, 10);

  return (
    <>
      {/* Cinematic hero (cover image behind a denim scrim when available) */}
      <section data-dark-hero="true" className="hero-under-header relative overflow-hidden bg-hero-denim text-white">
        {c.coverImageUrl ? <img src={c.coverImageUrl} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40" /> : null}
        <div className="absolute inset-0 bg-gradient-to-r from-denim-950 via-denim-950/85 to-denim-900/50" aria-hidden="true" />
        <div className="glow-denim absolute inset-0" aria-hidden="true" />
        <Container size="narrow" className="relative py-14 sm:py-20">
          <Link href="/fundraising" className="inline-flex items-center gap-1.5 text-sm font-semibold text-denim-300 hover:text-white">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
            All campaigns
          </Link>
          <p className="eyebrow mt-5 text-denim-300">Campaign</p>
          <h1 className="mt-2 text-display font-serif font-semibold text-white">{c.title}</h1>
          {c.description ? <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/80">{c.description}</p> : null}
        </Container>
      </section>

      <Container size="narrow" className="py-12 sm:py-16">
        <Reveal>
          <div className="card p-6">
            <div className="flex items-end justify-between">
              <span className="font-serif text-3xl font-semibold text-denim-800 dark:text-denim-300">{formatUsd(totals.confirmed)}</span>
              {c.goal ? <span className="text-sm text-muted">of {formatUsd(c.goal)} goal</span> : null}
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-denim-100 dark:bg-white/10" role="progressbar" aria-valuenow={totals.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Campaign progress">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(totals.pct, 2)}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted">{totals.count} gift{totals.count === 1 ? "" : "s"}{c.goal ? ` · ${totals.pct}% of goal` : ""}</p>
          </div>
        </Reveal>

        {board.length ? (
          <Reveal as="section" className="mt-12">
            <h2 className="flex items-center gap-2 text-title font-serif font-semibold text-fg">
              <svg className="h-6 w-6 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0zM7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3" /></svg>
              Wall of Fame
            </h2>
            <ol className="mt-5 space-y-2">
              {board.map((b) => (
                <li key={b.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${b.rank <= 3 ? "border-gold/40 bg-gold/5" : "border-line bg-surface"}`}>
                  <span className="font-medium text-fg"><span className="mr-1 font-serif font-semibold text-muted">#{b.rank}</span> {b.name}</span>
                  <span className="font-semibold text-denim-800 dark:text-denim-300">{formatUsd(b.total)}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        ) : null}

        {c.allowMemberFundraisers ? (
          <Reveal as="section" className="mt-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-title font-serif font-semibold text-fg">Member fundraisers</h2>
              {/* Public entry point: it signs a member in to their own dashboard flow and
                  offers a non-member the Supporter path, so nobody hits a login wall here. */}
              <Link href="/fundraising/start" className="text-sm font-semibold text-primary hover:text-primary-hover">Start your own →</Link>
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
          </Reveal>
        ) : null}

        <Reveal as="section" className="mt-12">
          <h2 className="text-title font-serif font-semibold text-fg">Give to this campaign</h2>
          {donated ? <div className="mt-4"><Callout tone="success">Thank you! Your gift has been recorded.</Callout></div> : null}
          <div className="mt-6"><DonateForm campaignId={c.id} backTo={`/fundraising/${c.slug}`} /></div>
        </Reveal>
      </Container>
    </>
  );
}
