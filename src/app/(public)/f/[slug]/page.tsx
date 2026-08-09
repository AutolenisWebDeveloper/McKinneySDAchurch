import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { formatUsd, raisedPct, confirmedTotal } from "@/lib/fundraising";
import { DonateForm } from "@/components/DonateForm";
import { Container } from "@/components/ui";
import { Card, Callout } from "@/components/page-ui";

export const dynamic = "force-dynamic";

export default async function FundraiserPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ donated?: string }> }) {
  const { slug } = await params;
  const { donated } = await searchParams;
  const f = await safe(prisma.fundraiser.findUnique({
    where: { slug },
    include: { campaign: { select: { title: true, slug: true, status: true } }, donations: { select: { amount: true, status: true } } },
  }), null);
  if (!f || !f.active || f.campaign.status !== "ACTIVE") notFound();
  const raised = confirmedTotal(f.donations);
  const pct = f.personalGoal ? raisedPct(raised, f.personalGoal) : 0;

  return (
    <Container size="narrow" className="py-12 sm:py-16">
      <p className="text-sm text-muted">
        Fundraiser for <Link href={`/fundraising/${f.campaign.slug}`} className="font-semibold text-primary hover:text-primary-hover">{f.campaign.title}</Link>
      </p>
      <h1 className="mt-2 text-display font-serif font-semibold text-fg">{f.title}</h1>
      <p className="mt-2 text-muted">by {f.displayName}</p>
      {f.story ? <p className="mt-5 text-lg leading-relaxed text-fg/90">{f.story}</p> : null}

      <div className="card mt-8 p-6">
        <div className="flex items-end justify-between">
          <span className="text-2xl font-semibold text-denim-800 dark:text-denim-300">{formatUsd(raised)}</span>
          {f.personalGoal ? <span className="text-sm text-muted">of {formatUsd(f.personalGoal)} goal</span> : null}
        </div>
        {f.personalGoal ? (
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-denim-100 dark:bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Fundraiser progress">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
          </div>
        ) : null}
      </div>

      <section className="mt-10">
        <h2 className="text-title font-serif font-semibold text-fg">Support {f.displayName}</h2>
        {donated ? (
          <div className="mt-4">
            <Callout tone="success">Thank you! Your gift has been recorded and credited to {f.displayName}.</Callout>
          </div>
        ) : null}
        <div className="mt-6">
          <DonateForm campaignId={f.campaignId} fundraiserId={f.id} backTo={`/f/${f.slug}`} />
        </div>
      </section>
    </Container>
  );
}
