import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { formatUsd, raisedPct } from "@/lib/fundraising";
import { createCampaign } from "./actions";

export const dynamic = "force-dynamic";
const inp = "w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2";

export default async function Campaigns() {
  await requireActor("ADMIN", "PASTOR", "TREASURER");
  const [campaigns, sums, project] = await Promise.all([
    prisma.fundraisingCampaign.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.donation.groupBy({ by: ["campaignId"], where: { status: "CONFIRMED" }, _sum: { amount: true }, _count: true }),
    prisma.constructionProject.findFirst({ where: { active: true }, select: { id: true, title: true } }),
  ]);
  const totalById = new Map(sums.map((s) => [s.campaignId, { raised: s._sum.amount ?? 0, count: s._count }]));
  const ranked = [...campaigns].sort((a, b) => (totalById.get(b.id)?.raised ?? 0) - (totalById.get(a.id)?.raised ?? 0));

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-3">Fundraising Campaigns</h1>
        {ranked.length ? (
          <ol className="space-y-2">
            {ranked.map((c, i) => {
              const t = totalById.get(c.id) ?? { raised: 0, count: 0 };
              return (
                <li key={c.id} className="rounded border border-black/10 dark:border-white/10 p-3">
                  <div className="flex items-center justify-between">
                    <Link href={`/dashboard/admin/campaigns/${c.id}`} className="font-medium hover:underline">#{i + 1} · {c.title}</Link>
                    <span className="text-xs rounded px-2 py-0.5 border border-black/20 dark:border-white/20">{c.status}</span>
                  </div>
                  <p className="text-sm text-muted mt-1">{formatUsd(t.raised)} raised{c.goal ? ` · ${raisedPct(t.raised, c.goal)}% of ${formatUsd(c.goal)}` : ""} · {t.count} gifts</p>
                </li>
              );
            })}
          </ol>
        ) : <p className="text-muted">No campaigns yet.</p>}
      </div>
      <section>
        <h2 className="font-semibold mb-2">New campaign</h2>
        <form action={createCampaign} className="space-y-3">
          <input name="title" required placeholder="Campaign title" className={inp} />
          <textarea name="description" rows={3} placeholder="Description" className={inp} />
          <div className="grid grid-cols-2 gap-3"><input name="goal" type="number" min={0} placeholder="Goal $" className={inp} /><input name="endDate" type="date" className={inp} /></div>
          <input name="coverImageUrl" type="url" placeholder="Cover image URL (optional)" className={inp} />
          {project ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="constructionProjectId" value={project.id} /> Tie to building project ({project.title}) — confirmed gifts add to its total</label> : null}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allowMemberFundraisers" defaultChecked /> Let members create personal fundraisers</label>
          <button className="rounded bg-sda-navy text-white px-4 py-2">Create campaign</button>
        </form>
      </section>
    </div>
  );
}
