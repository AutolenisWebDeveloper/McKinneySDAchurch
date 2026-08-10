import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { formatUsd, confirmedTotal, raisedPct } from "@/lib/fundraising";
import { createFundraiser } from "./actions";

export const dynamic = "force-dynamic";
const inp = "w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2";

export default async function MyFundraisers({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const actor = await requireActor();
  const { created } = await searchParams;
  const [mine, campaigns] = await Promise.all([
    prisma.fundraiser.findMany({ where: { ownerUserId: actor.userId }, orderBy: { createdAt: "desc" }, include: { campaign: { select: { title: true } }, donations: { select: { amount: true, status: true } } } }),
    prisma.fundraisingCampaign.findMany({ where: { status: "ACTIVE", allowMemberFundraisers: true }, select: { id: true, title: true } }),
  ]);
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">My Fundraisers</h1>
        <p className="text-xs text-muted mb-4">Create a personal fundraising page, share your link, and every gift you bring in counts toward your total and the Wall of Fame.</p>
        {created ? <p className="rounded bg-sda-green/10 text-sda-green px-3 py-2 mb-3">Created! Share your link: <Link href={`/f/${created}`} className="underline">{env.NEXT_PUBLIC_SITE_URL}/f/{created}</Link></p> : null}
        {mine.length ? (
          <ul className="space-y-2">
            {mine.map((f) => {
              const raised = confirmedTotal(f.donations);
              return (
                <li key={f.id} className="rounded border border-black/10 dark:border-white/10 p-3">
                  <div className="flex items-center justify-between"><span className="font-medium">{f.title}</span><Link href={`/f/${f.slug}`} className="text-sm underline">Share link</Link></div>
                  <p className="text-sm text-muted">{f.campaign.title} · {formatUsd(raised)} raised{f.personalGoal ? ` · ${raisedPct(raised, f.personalGoal)}% of ${formatUsd(f.personalGoal)}` : ""}</p>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-muted">You haven't started a fundraiser yet.</p>}
      </div>
      {campaigns.length ? (
        <section>
          <h2 className="font-semibold mb-2">Start a fundraiser</h2>
          <form action={createFundraiser} className="space-y-3">
            <select name="campaignId" required className={inp}><option value="">Choose a campaign…</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
            <input name="displayName" required defaultValue="" placeholder="Your display name" className={inp} />
            <input name="title" required placeholder="Fundraiser title (e.g. Team Ada for the Youth Wing)" className={inp} />
            <input name="personalGoal" type="number" min={0} placeholder="Your goal $ (optional)" className={inp} />
            <textarea name="story" rows={3} placeholder="Why you're raising (optional)" className={inp} />
            <button className="rounded bg-sda-navy text-white px-4 py-2">Create my fundraiser</button>
          </form>
        </section>
      ) : <p className="text-muted text-sm">No campaigns are open for member fundraisers right now.</p>}
    </div>
  );
}
