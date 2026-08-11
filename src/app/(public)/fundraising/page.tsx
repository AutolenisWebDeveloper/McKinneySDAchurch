import Link from "next/link";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { formatUsd, raisedPct } from "@/lib/fundraising";
import { PageHeader, EmptyState } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Fundraising",
  description: "Support the campaigns moving our church family forward.",
};

export default async function Fundraising() {
  const [campaigns, sums] = await Promise.all([
    safe(prisma.fundraisingCampaign.findMany({ where: { status: "ACTIVE" } }), []),
    safe(prisma.donation.groupBy({ by: ["campaignId"], where: { status: "CONFIRMED" }, _sum: { amount: true } }), []),
  ]);
  const raisedBy = new Map(sums.map((s) => [s.campaignId, s._sum.amount ?? 0]));
  const ranked = [...campaigns].sort((a, b) => (raisedBy.get(b.id) ?? 0) - (raisedBy.get(a.id) ?? 0));

  return (
    <>
      <PageHeader
        eyebrow="Support our church"
        title="Fundraising"
        lede="Together we can do far more than any of us alone. Explore our active campaigns and be part of what God is doing here."
        tone="denim"
        actions={
          <Link href="/fundraising/leaders" className="btn btn-ghost-light">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0zM7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3" /></svg>
            Top fundraisers
          </Link>
        }
      />
      <Section>
        {ranked.length ? (
          <ul className="grid gap-6 md:grid-cols-2">
            {ranked.map((c, i) => {
              const raised = raisedBy.get(c.id) ?? 0;
              const pct = c.goal ? raisedPct(raised, c.goal) : 0;
              return (
                <Reveal as="li" key={c.id} delayMs={Math.min(i, 4) * 60}>
                  <Link href={`/fundraising/${c.slug}`} className="card card-hover group flex h-full flex-col p-6">
                    <h2 className="font-serif text-xl font-semibold text-fg group-hover:text-primary">{c.title}</h2>
                    {c.description ? <p className="mt-2 flex-1 text-sm text-muted">{c.description}</p> : <span className="flex-1" />}
                    <div className="mt-5">
                      <div className="mb-1.5 flex items-baseline justify-between text-sm">
                        <span className="font-serif text-lg font-semibold text-denim-800 dark:text-denim-300">{formatUsd(raised)}</span>
                        {c.goal ? <span className="text-muted">of {formatUsd(c.goal)}{pct ? ` · ${pct}%` : ""}</span> : <span className="text-muted">raised so far</span>}
                      </div>
                      {c.goal ? (
                        <div className="h-2.5 overflow-hidden rounded-full bg-denim-100 dark:bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.title} progress`}>
                          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
                        </div>
                      ) : null}
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No active campaigns right now" body={<>Check back soon — or <Link href="/construction" className="font-semibold text-primary hover:text-primary-hover">support our building project</Link> directly.</>} />
        )}
      </Section>
    </>
  );
}
