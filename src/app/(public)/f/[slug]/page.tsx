import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatUsd, raisedPct, confirmedTotal } from "@/lib/fundraising";
import { DonateForm } from "@/components/DonateForm";

export const dynamic = "force-dynamic";

export default async function FundraiserPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ donated?: string }> }) {
  const { slug } = await params;
  const { donated } = await searchParams;
  const f = await prisma.fundraiser.findUnique({ where: { slug }, include: { campaign: { select: { title: true, slug: true, status: true } }, donations: { select: { amount: true, status: true } } } });
  if (!f || !f.active || f.campaign.status !== "ACTIVE") notFound();
  const raised = confirmedTotal(f.donations);
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <p className="text-sm text-muted">Fundraiser for <Link href={`/fundraising/${f.campaign.slug}`} className="underline">{f.campaign.title}</Link></p>
        <h1 className="text-2xl font-bold mt-1">{f.title}</h1>
        <p className="text-muted">by {f.displayName}</p>
        {f.story ? <p className="mt-3">{f.story}</p> : null}
        <div className="mt-4"><div className="flex justify-between text-sm mb-1"><span className="font-medium">{formatUsd(raised)} raised</span>{f.personalGoal ? <span className="text-muted">Goal {formatUsd(f.personalGoal)}</span> : null}</div>
          {f.personalGoal ? <div className="h-3 rounded bg-black/10 dark:bg-white/10 overflow-hidden"><div className="h-full bg-sda-green" style={{ width: `${raisedPct(raised, f.personalGoal)}%` }} /></div> : null}
        </div>
      </div>
      <section><h2 className="text-xl font-semibold mb-3">Support {f.displayName}</h2>
        {donated ? <p className="rounded bg-sda-green/10 text-sda-green px-3 py-2 mb-3">Thank you! Your gift has been recorded and credited to {f.displayName}.</p> : null}
        <DonateForm campaignId={f.campaignId} fundraiserId={f.id} backTo={`/f/${f.slug}`} />
      </section>
    </div>
  );
}
