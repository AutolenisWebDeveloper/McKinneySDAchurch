import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatUsd, raisedPct } from "@/lib/fundraising";
import { PageHeader } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Fundraising",
  description: "Support the campaigns moving our church family forward.",
};

export default async function Fundraising() {
  const [campaigns, sums] = await Promise.all([
    prisma.fundraisingCampaign.findMany({ where: { status: "ACTIVE" } }),
    prisma.donation.groupBy({ by: ["campaignId"], where: { status: "CONFIRMED" }, _sum: { amount: true } }),
  ]);
  const raisedBy = new Map(sums.map((s) => [s.campaignId, s._sum.amount ?? 0]));
  const ranked = [...campaigns].sort((a, b) => (raisedBy.get(b.id) ?? 0) - (raisedBy.get(a.id) ?? 0));

  return (
    <>
      <PageHeader
        eyebrow="Support our church"
        title="Fundraising"
        lede="Together we can do far more than any of us alone. Explore our active campaigns and be part of what God is doing here."
        actions={<Link href="/fundraising/leaders" className="btn btn-outline">🏆 Top fundraisers</Link>}
      />
      <Section>
        {ranked.length ? (
          <ul className="grid gap-6 md:grid-cols-2">
            {ranked.map((c) => {
              const raised = raisedBy.get(c.id) ?? 0;
              const pct = c.goal ? raisedPct(raised, c.goal) : 0;
              return (
                <li key={c.id}>
                  <Link href={`/fundraising/${c.slug}`} className="card card-hover group flex h-full flex-col p-6">
                    <h2 className="font-serif text-xl font-semibold text-fg group-hover:text-primary">{c.title}</h2>
                    {c.description ? <p className="mt-2 flex-1 text-sm text-muted">{c.description}</p> : <span className="flex-1" />}
                    <div className="mt-5">
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-semibold text-denim-800 dark:text-denim-300">{formatUsd(raised)}</span>
                        {c.goal ? <span className="text-muted">of {formatUsd(c.goal)}</span> : null}
                      </div>
                      {c.goal ? (
                        <div className="h-2.5 overflow-hidden rounded-full bg-denim-100 dark:bg-white/10">
                          <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(pct, 2)}%` }} />
                        </div>
                      ) : <p className="text-xs text-muted">raised so far</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card p-8 text-center">
            <p className="font-serif text-lg font-semibold text-fg">No active campaigns right now</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">Check back soon — or support our building project directly.</p>
          </div>
        )}
      </Section>
    </>
  );
}
