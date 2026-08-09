import { prisma } from "@/lib/db";
import { raisedPct, formatUsd, timelineLabel, phaseStatusLabel, campaignRollup, phaseRollup } from "@/lib/construction";
import { subscribeBuilding, createPledge } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Building Project — McKinney SDA Church" };
const inp = "w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2";

export default async function Construction({ searchParams }: { searchParams: Promise<{ subscribed?: string; pledged?: string }> }) {
  const { subscribed, pledged } = await searchParams;
  const project = await prisma.constructionProject.findFirst({
    where: { active: true }, orderBy: { createdAt: "desc" },
    include: {
      phases: { orderBy: { sortOrder: "asc" } },
      timelineItems: { orderBy: { sortOrder: "asc" } },
      updates: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 12 },
      givingLevels: { orderBy: { minAmount: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } },
      photos: { orderBy: { sortOrder: "asc" } },
      pledges: { where: { publicRecognition: true, isAnonymous: false, status: { in: ["CONFIRMED", "FULFILLED"] } }, select: { donorName: true } },
      documents: { select: { id: true, title: true, url: true } },
    },
  });
  if (!project) return <div><h1 className="text-2xl font-bold mb-2">Building Project</h1><p className="text-muted">Details about our building project will be posted here soon.</p></div>;

  const allPledges = await prisma.buildingPledge.findMany({ where: { projectId: project.id }, select: { amount: true, receivedToDate: true, status: true } });
  const campaign = campaignRollup(allPledges);
  const phases = phaseRollup(project.phases);
  const pct = raisedPct(project.currentRaised, project.totalGoal);
  const renderings = project.photos.filter((p) => p.category === "rendering");
  const progressPhotos = project.photos.filter((p) => p.category !== "rendering");

  return (
    <div className="max-w-3xl space-y-12">
      {/* hero */}
      <section>
        {project.heroImageUrl ? <img src={project.heroImageUrl} alt="" className="w-full rounded-xl mb-4 object-cover max-h-72" /> : null}
        <h1 className="text-3xl font-bold">{project.title}</h1>
        {project.description ? <p className="mt-2 text-muted">{project.description}</p> : null}
        {project.targetCompletion ? <p className="text-sm text-muted mt-1">Target completion: {new Date(project.targetCompletion).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p> : null}
        {/* thermometer */}
        <div className="mt-5">
          <div className="flex justify-between text-sm mb-1"><span className="font-medium">{formatUsd(project.currentRaised)} raised</span><span className="text-muted">Goal {formatUsd(project.totalGoal)}</span></div>
          <div className="h-4 rounded bg-black/10 dark:bg-white/10 overflow-hidden"><div className="h-full bg-sda-green" style={{ width: `${pct}%` }} aria-hidden="true" /></div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
            <span>{pct}% of goal</span>
            <span>{formatUsd(campaign.totalPledged)} pledged</span>
            <span>{campaign.count} {campaign.count === 1 ? "pledge" : "pledges"}</span>
          </div>
        </div>
      </section>

      {/* renderings */}
      {renderings.length ? (
        <section><h2 className="text-xl font-semibold mb-3">Renderings</h2>
          <div className="grid gap-4 sm:grid-cols-2">{renderings.map((p) => (<figure key={p.id}><img src={p.url} alt={p.caption ?? ""} className="w-full rounded object-cover" />{p.caption ? <figcaption className="text-xs text-muted mt-1">{p.caption}</figcaption> : null}</figure>))}</div>
        </section>
      ) : null}

      {/* phases */}
      {project.phases.length ? (
        <section><h2 className="text-xl font-semibold mb-1">Phases</h2>
          <p className="text-sm text-muted mb-3">{formatUsd(phases.totalSpent)} of {formatUsd(phases.totalBudget)} budget · {phases.completionPct}% of phases complete</p>
          <ul className="space-y-3">{project.phases.map((ph) => (
            <li key={ph.id} className="rounded border border-black/10 dark:border-white/10 p-3">
              <div className="flex justify-between"><span className="font-medium">{ph.name}</span><span className="text-xs rounded px-2 py-0.5 border border-black/20 dark:border-white/20">{phaseStatusLabel(ph.status)}</span></div>
              {ph.description ? <p className="text-sm text-muted mt-1">{ph.description}</p> : null}
              {ph.budget > 0 ? (<div className="mt-2"><div className="h-2 rounded bg-black/10 dark:bg-white/10 overflow-hidden"><div className="h-full bg-sda-navy" style={{ width: `${raisedPct(ph.spent, ph.budget)}%` }} /></div><p className="text-xs text-muted mt-1">{formatUsd(ph.spent)} of {formatUsd(ph.budget)}</p></div>) : null}
            </li>))}
          </ul>
        </section>
      ) : null}

      {/* giving levels */}
      {project.givingLevels.length ? (
        <section><h2 className="text-xl font-semibold mb-3">Ways to give</h2>
          <div className="grid gap-3 sm:grid-cols-2">{project.givingLevels.map((l) => (
            <div key={l.id} className="rounded border border-black/10 dark:border-white/10 p-3"><p className="font-medium">{l.name} · {formatUsd(l.minAmount)}+</p>{l.description ? <p className="text-sm text-muted mt-1">{l.description}</p> : null}</div>))}
          </div>
        </section>
      ) : null}

      {/* pledge form */}
      {project.publicPledgeEnabled ? (
        <section id="pledge">
          <h2 className="text-xl font-semibold mb-2">Make a pledge</h2>
          {pledged ? <p className="rounded bg-sda-green/10 text-sda-green px-3 py-2">Thank you — your pledge has been received. Our team will follow up.</p> : (
            <>
              <p className="text-sm text-muted mb-3">A pledge is a giving commitment — no payment is collected here. Give securely anytime through AdventistGiving.</p>
              <form action={createPledge} className="space-y-3">
                <input type="hidden" name="projectId" value={project.id} />
                <input name="donorName" required placeholder="Your name" className={inp} />
                <div className="grid grid-cols-2 gap-3"><input name="email" type="email" placeholder="Email" className={inp} /><input name="phone" placeholder="Phone" className={inp} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <input name="amount" type="number" min={1} required placeholder="Amount $" className={inp} />
                  <select name="frequency" className={inp}><option value="ONE_TIME">One-time</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="ANNUAL">Annual</option></select>
                  <input name="termMonths" type="number" min={1} placeholder="Over N months" className={inp} />
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publicRecognition" /> You may list my name as a supporter</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isAnonymous" /> Keep my pledge anonymous</label>
                <textarea name="note" rows={2} placeholder="Note (optional)" className={inp} />
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                <button className="rounded bg-sda-navy text-white px-4 py-2">Submit pledge</button>
              </form>
            </>
          )}
          {project.pledges.length ? <p className="text-xs text-muted mt-3">With thanks to {project.pledges.map((p) => p.donorName).join(", ")} and many others.</p> : null}
        </section>
      ) : null}

      {/* progress gallery */}
      {progressPhotos.length ? (
        <section><h2 className="text-xl font-semibold mb-3">Progress photos</h2>
          <div className="grid gap-4 sm:grid-cols-3">{progressPhotos.map((p) => (<figure key={p.id}><img src={p.url} alt={p.caption ?? ""} className="w-full rounded object-cover aspect-square" />{p.caption ? <figcaption className="text-xs text-muted mt-1">{p.caption}</figcaption> : null}</figure>))}</div>
        </section>
      ) : null}

      {/* timeline */}
      {project.timelineItems.length ? (
        <section><h2 className="text-xl font-semibold mb-3">Timeline</h2>
          <ol className="space-y-2">{project.timelineItems.map((it) => (
            <li key={it.id} className="rounded border border-black/10 dark:border-white/10 p-3"><div className="flex justify-between"><span className="font-medium">{it.title}</span><span className="text-xs rounded px-2 py-0.5 border border-black/20 dark:border-white/20">{timelineLabel(it.status)}</span></div>{it.targetDate ? <p className="text-xs text-muted mt-1">Target: {new Date(it.targetDate).toLocaleDateString("en-US")}</p> : null}</li>))}
          </ol>
        </section>
      ) : null}

      {/* updates */}
      {project.updates.length ? (
        <section><h2 className="text-xl font-semibold mb-3">Updates</h2>
          <ul className="space-y-4">{project.updates.map((u) => (
            <li key={u.id} className="rounded border border-black/10 dark:border-white/10 p-4"><p className="text-sm text-muted">{new Date(u.year, u.month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>{u.title ? <p className="font-medium">{u.title}</p> : null}<p className="mt-1">{u.description}</p>{u.videoUrl ? <p className="mt-2 text-sm"><a href={u.videoUrl} target="_blank" rel="noopener noreferrer" className="underline">Watch update</a></p> : null}</li>))}
          </ul>
        </section>
      ) : null}

      {/* documents */}
      {project.documents.length ? (
        <section><h2 className="text-xl font-semibold mb-3">Documents</h2>
          <ul className="text-sm space-y-1">{project.documents.map((d) => <li key={d.id}><a href={d.url} target="_blank" rel="noopener noreferrer" className="underline">{d.title}</a></li>)}</ul>
        </section>
      ) : null}

      {/* FAQ */}
      {project.faqs.length ? (
        <section><h2 className="text-xl font-semibold mb-3">FAQ</h2>
          <dl className="space-y-3">{project.faqs.map((f) => (<div key={f.id}><dt className="font-medium">{f.question}</dt><dd className="text-sm text-muted">{f.answer}</dd></div>))}</dl>
        </section>
      ) : null}

      {/* subscribe */}
      <section><h2 className="text-xl font-semibold mb-2">Get building updates</h2>
        {subscribed ? <p className="rounded bg-sda-green/10 text-sda-green px-3 py-2">You're subscribed to building updates.</p> : (
          <form action={subscribeBuilding} className="flex gap-2"><input name="email" type="email" required placeholder="you@email.com" className={`${inp} flex-1`} /><input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" /><button className="rounded bg-sda-navy text-white px-4 py-2">Subscribe</button></form>
        )}
      </section>
    </div>
  );
}
