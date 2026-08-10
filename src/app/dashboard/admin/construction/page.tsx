import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { formatUsd, campaignRollup, phaseRollup, phaseStatusLabel, frequencyLabel } from "@/lib/construction";
import { saveProject, addPhase, updatePhase, addGivingLevel, addFaq, addPhoto, addTimelineItem, postUpdate, confirmPledge, recordPledgePayment, cancelPledge, uploadConstructionPhoto } from "./actions";
import { storageConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";
const inp = "w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2";
const btn = "rounded bg-sda-navy text-white px-4 py-2";

export default async function ConstructionAdmin() {
  await requireActor("ADMIN", "PASTOR");
  const project = await prisma.constructionProject.findFirst({
    where: { active: true }, orderBy: { createdAt: "desc" },
    include: {
      phases: { orderBy: { sortOrder: "asc" } }, givingLevels: { orderBy: { minAmount: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } }, photos: { orderBy: { sortOrder: "asc" } },
      pledges: { orderBy: { createdAt: "desc" } },
    },
  });
  const campaign = project ? campaignRollup(project.pledges) : null;
  const phases = project ? phaseRollup(project.phases) : null;

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-3">Building Project</h1>
        {project && campaign && phases ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
            <Stat label="Raised" value={formatUsd(project.currentRaised)} />
            <Stat label="Pledged" value={formatUsd(campaign.totalPledged)} />
            <Stat label="Pledges" value={String(campaign.count)} />
            <Stat label="Phase budget" value={formatUsd(phases.totalSpent) + " / " + formatUsd(phases.totalBudget)} />
          </div>
        ) : null}
        <form action={saveProject} className="space-y-3">
          {project ? <input type="hidden" name="id" value={project.id} /> : null}
          <input name="title" required defaultValue={project?.title ?? ""} placeholder="Project title" className={inp} />
          <textarea name="description" rows={3} defaultValue={project?.description ?? ""} placeholder="Description" className={inp} />
          <input name="heroImageUrl" type="url" defaultValue={project?.heroImageUrl ?? ""} placeholder="Hero image URL (optional)" className={inp} />
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs text-muted mb-1">Goal ($)</label><input name="totalGoal" type="number" min={0} defaultValue={project?.totalGoal ?? 0} className={inp} /></div>
            <div><label className="block text-xs text-muted mb-1">Raised ($)</label><input name="currentRaised" type="number" min={0} defaultValue={project?.currentRaised ?? 0} className={inp} /></div>
            <div><label className="block text-xs text-muted mb-1">Target completion</label><input name="targetCompletion" type="date" defaultValue={project?.targetCompletion ? new Date(project.targetCompletion).toISOString().slice(0, 10) : ""} className={inp} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publicPledgeEnabled" defaultChecked={project?.publicPledgeEnabled ?? true} /> Allow public pledges</label>
          <button className={btn}>{project ? "Save project" : "Create project"}</button>
        </form>
      </div>

      {project ? (
        <>
          <Section title="Phases">
            {project.phases.map((ph) => (
              <form key={ph.id} action={updatePhase} className="flex flex-wrap items-center gap-2 py-1 text-sm">
                <span className="w-40 truncate">{ph.name}</span>
                <input type="hidden" name="id" value={ph.id} />
                <select name="status" defaultValue={ph.status} className="rounded border border-black/20 dark:border-white/20 bg-transparent px-2 py-1">{["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"].map((s) => <option key={s} value={s}>{phaseStatusLabel(s)}</option>)}</select>
                <input name="spent" type="number" min={0} defaultValue={ph.spent} className="w-28 rounded border border-black/20 dark:border-white/20 bg-transparent px-2 py-1" />
                <span className="text-muted">/ {formatUsd(ph.budget)}</span>
                <button className="rounded border border-black/20 dark:border-white/20 px-2 py-1">Update</button>
              </form>
            ))}
            <form action={addPhase} className="mt-2 space-y-2">
              <input type="hidden" name="projectId" value={project.id} />
              <div className="grid grid-cols-2 gap-2"><input name="name" required placeholder="Phase name" className={inp} /><input name="budget" type="number" min={0} placeholder="Budget $" className={inp} /></div>
              <div className="grid grid-cols-2 gap-2"><select name="status" className={inp}>{["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"].map((s) => <option key={s} value={s}>{phaseStatusLabel(s)}</option>)}</select><input name="targetDate" type="date" className={inp} /></div>
              <button className={btn}>Add phase</button>
            </form>
          </Section>

          <Section title={`Pledges (${project.pledges.length})`}>
            <ul className="space-y-2">{project.pledges.map((p) => (
              <li key={p.id} className="rounded border border-black/10 dark:border-white/10 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{p.isAnonymous ? "(anonymous)" : p.donorName} · {formatUsd(p.amount)} {frequencyLabel(p.frequency)} · <span className="text-muted">{p.status} · {formatUsd(p.receivedToDate)} received</span></span>
                  <div className="flex gap-1">
                    {p.status === "PENDING" ? <form action={confirmPledge}><input type="hidden" name="id" value={p.id} /><button className="rounded border border-black/20 dark:border-white/20 px-2 py-1">Confirm</button></form> : null}
                    {p.status !== "CANCELLED" && p.status !== "FULFILLED" ? (
                      <form action={recordPledgePayment} className="flex gap-1"><input type="hidden" name="id" value={p.id} /><input name="amount" type="number" min={1} placeholder="$ received" className="w-24 rounded border border-black/20 dark:border-white/20 bg-transparent px-2 py-1" /><button className="rounded border border-black/20 dark:border-white/20 px-2 py-1">Record</button></form>
                    ) : null}
                    {p.status !== "CANCELLED" ? <form action={cancelPledge}><input type="hidden" name="id" value={p.id} /><button className="rounded border border-black/20 dark:border-white/20 px-2 py-1">Cancel</button></form> : null}
                  </div>
                </div>
              </li>))}
              {!project.pledges.length ? <li className="text-muted text-sm">No pledges yet.</li> : null}
            </ul>
          </Section>

          <Section title="Giving levels">
            <ul className="text-sm mb-2">{project.givingLevels.map((l) => <li key={l.id}>{l.name} · {formatUsd(l.minAmount)}+</li>)}</ul>
            <form action={addGivingLevel} className="grid grid-cols-3 gap-2 items-end"><input type="hidden" name="projectId" value={project.id} /><input name="name" required placeholder="Level name" className={inp} /><input name="minAmount" type="number" min={0} required placeholder="Min $" className={inp} /><button className={btn}>Add</button></form>
          </Section>

          <Section title="Photos & renderings">
            {storageConfigured() ? (
              <form action={uploadConstructionPhoto} className="space-y-2 mb-3">
                <input type="hidden" name="projectId" value={project.id} />
                <input name="file" type="file" accept="image/*" required className={inp} />
                <div className="grid grid-cols-2 gap-2"><input name="caption" placeholder="Caption" className={inp} /><select name="category" className={inp}><option value="rendering">Rendering</option><option value="progress">Progress</option><option value="completed">Completed</option></select></div>
                <button className={btn}>Upload photo</button>
              </form>
            ) : <p className="text-xs text-muted mb-2">Set BLOB_READ_WRITE_TOKEN to enable direct upload. For now, add by image URL:</p>}
            <form action={addPhoto} className="space-y-2"><input type="hidden" name="projectId" value={project.id} /><input name="url" type="url" required placeholder="Image URL" className={inp} /><div className="grid grid-cols-2 gap-2"><input name="caption" placeholder="Caption" className={inp} /><select name="category" className={inp}><option value="rendering">Rendering</option><option value="progress">Progress</option><option value="completed">Completed</option></select></div><button className={btn}>Add photo</button></form>
          </Section>

          <Section title="FAQ">
            <form action={addFaq} className="space-y-2"><input type="hidden" name="projectId" value={project.id} /><input name="question" required placeholder="Question" className={inp} /><textarea name="answer" rows={2} required placeholder="Answer" className={inp} /><button className={btn}>Add FAQ</button></form>
          </Section>

          <Section title="Timeline milestone">
            <form action={addTimelineItem} className="space-y-2"><input type="hidden" name="projectId" value={project.id} /><input name="title" required placeholder="Milestone" className={inp} /><div className="grid grid-cols-2 gap-2"><select name="status" className={inp}><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select><input name="targetDate" type="date" className={inp} /></div><button className={btn}>Add milestone</button></form>
          </Section>

          <Section title="Post monthly update">
            <form action={postUpdate} className="space-y-2"><input type="hidden" name="projectId" value={project.id} /><input name="title" placeholder="Title (optional)" className={inp} /><textarea name="description" rows={3} required placeholder="What's new…" className={inp} /><input name="videoUrl" type="url" placeholder="Video URL (optional)" className={inp} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" /> Email building-update subscribers</label><button className={btn}>Post update</button></form>
          </Section>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-black/10 dark:border-white/10 p-2"><div className="text-xs text-muted">{label}</div><div className="font-semibold">{value}</div></div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="font-semibold mb-2">{title}</h2>{children}</section>;
}
