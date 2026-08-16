import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { formatUsd, campaignTotals, fundraiserTotals, rankFundraisers } from "@/lib/fundraising";
import { confirmDonation, cancelDonation, setCampaignStatus, setCampaignFundraising } from "../actions";

export const dynamic = "force-dynamic";

export default async function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("ADMIN", "PASTOR", "TREASURER");
  const { id } = await params;
  const project = await prisma.constructionProject.findFirst({ where: { active: true }, select: { id: true, title: true } });
  const c = await prisma.fundraisingCampaign.findUnique({
    where: { id },
    include: { donations: { orderBy: { createdAt: "desc" }, include: { fundraiser: { select: { displayName: true } } } }, fundraisers: { select: { id: true, displayName: true } } },
  });
  if (!c) notFound();
  const totals = campaignTotals(c.donations, c.goal);
  const names = Object.fromEntries(c.fundraisers.map((f) => [f.id, f.displayName]));
  const board = rankFundraisers(fundraiserTotals(c.donations, names)).slice(0, 10);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{c.title}</h1>
          <form action={setCampaignStatus} className="flex items-center gap-1">
            <input type="hidden" name="id" value={c.id} />
            <select name="status" defaultValue={c.status} className="rounded border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm">{["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"].map((s) => <option key={s} value={s}>{s}</option>)}</select>
            <button className="rounded border border-black/20 dark:border-white/20 px-2 py-1 text-sm">Set</button>
          </form>
        </div>
        <p className="text-sm text-muted mt-1">{formatUsd(totals.confirmed)} confirmed · {formatUsd(totals.pledged)} pledged · {totals.count} gifts · public page <Link href={`/fundraising/${c.slug}`} className="underline">/fundraising/{c.slug}</Link> · <Link href={`/dashboard/admin/campaigns/${c.id}/reconcile`} className="underline">reconcile with AdventistGiving</Link></p>
      </div>

      <section>
        <h2 className="font-semibold mb-2">Member fundraising</h2>
        <form action={setCampaignFundraising} className="rounded border border-black/10 dark:border-white/10 p-3 space-y-2 text-sm">
          <input type="hidden" name="id" value={c.id} />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="allowMemberFundraisers" defaultChecked={c.allowMemberFundraisers} />
            Let members and supporters create fundraisers for this campaign
          </label>
          {project ? (
            <label className="flex items-center gap-2">
              <input type="checkbox" name="constructionProjectId" value={project.id} defaultChecked={c.constructionProjectId === project.id} />
              Tie to the building project ({project.title}) — required for the My Building Fundraiser surfaces
            </label>
          ) : (
            <p className="text-muted">No active building project, so this campaign can&apos;t be tied to one yet.</p>
          )}
          <button className="rounded border border-black/20 dark:border-white/20 px-3 py-1">Save fundraising settings</button>
        </form>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Wall of Fame — top fundraisers</h2>
        {board.length ? <ol className="space-y-1 text-sm">{board.map((b) => <li key={b.id}>#{b.rank} · {b.name} — {formatUsd(b.total)}</li>)}</ol> : <p className="text-muted text-sm">No attributed gifts yet.</p>}
      </section>

      <section>
        <h2 className="font-semibold mb-2">Donations</h2>
        <ul className="space-y-2">
          {c.donations.map((d) => (
            <li key={d.id} className="rounded border border-black/10 dark:border-white/10 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{d.isAnonymous ? "(anonymous)" : d.donorName} · {formatUsd(d.amount)} · {d.kind} · <span className="text-muted">{d.status}{d.fundraiser ? ` · via ${d.fundraiser.displayName}` : ""}</span></span>
                <div className="flex gap-1">
                  {d.status === "PENDING" ? <form action={confirmDonation}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="campaignId" value={c.id} /><button className="rounded bg-sda-green text-white px-2 py-1">Confirm received</button></form> : null}
                  {d.status !== "CANCELLED" ? <form action={cancelDonation}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="campaignId" value={c.id} /><button className="rounded border border-black/20 dark:border-white/20 px-2 py-1">Cancel</button></form> : null}
                </div>
              </div>
              {d.message ? <p className="text-muted mt-1">“{d.message}”</p> : null}
            </li>
          ))}
          {!c.donations.length ? <li className="text-muted text-sm">No donations recorded yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
