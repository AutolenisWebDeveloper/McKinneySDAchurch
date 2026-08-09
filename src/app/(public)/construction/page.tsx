import { prisma } from "@/lib/db";
import { raisedPct, formatUsd, timelineLabel, phaseStatusLabel, campaignRollup, phaseRollup } from "@/lib/construction";
import { subscribeBuilding, createPledge } from "./actions";
import { PageHeader, Card, Callout, fieldClass, Honeypot } from "@/components/page-ui";
import { Section, Container, Eyebrow } from "@/components/ui";
import { BuildingPlans } from "@/components/BuildingPlans";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "The Building Project",
  description: "Help us build a permanent home for worship, discipleship, and community.",
};

const EXT = "noopener noreferrer";

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
      documents: { select: { id: true, title: true } },
    },
  });

  if (!project) {
    return (
      <>
        <PageHeader
          eyebrow="Our building project"
          title="A home of our own"
          lede="We’re raising funds to build a permanent home for the McKinney SDA Church. Here is the vision — with more to come as the campaign takes shape."
          tone="denim"
        />
        <BuildingPlans />
      </>
    );
  }

  const allPledges = await prisma.buildingPledge.findMany({ where: { projectId: project.id }, select: { amount: true, receivedToDate: true, status: true } });
  const campaign = campaignRollup(allPledges);
  const phases = phaseRollup(project.phases);
  const pct = raisedPct(project.currentRaised, project.totalGoal);
  const renderings = project.photos.filter((p) => p.category === "rendering");
  const progressPhotos = project.photos.filter((p) => p.category !== "rendering");

  return (
    <>
      {/* HERO with progress */}
      <section className="relative overflow-hidden bg-hero-denim text-white">
        <div className="glow-denim absolute inset-0" aria-hidden="true" />
        <Container className="relative py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <p className="eyebrow mb-4 text-denim-300">Our building project</p>
              <h1 className="text-hero font-serif font-semibold text-white">{project.title}</h1>
              {project.description ? <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">{project.description}</p> : null}
              {project.targetCompletion ? (
                <p className="mt-4 text-sm text-white/70">Target completion: <span className="font-medium text-white">{new Date(project.targetCompletion).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span></p>
              ) : null}
              {project.publicPledgeEnabled ? (
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="#pledge" className="btn btn-white">Make a pledge</a>
                  {project.updates.length ? <a href="#updates" className="btn btn-ghost-light">Follow the progress</a> : null}
                </div>
              ) : null}
            </div>

            {/* Thermometer card (glass on denim) */}
            <div className="rounded-2xl border border-white/15 bg-white/10 p-8 shadow-lg backdrop-blur-sm">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-semibold text-white sm:text-4xl">{formatUsd(project.currentRaised)}</span>
                <span className="text-sm text-white/70">of {formatUsd(project.totalGoal)}</span>
              </div>
              <div className="mt-4 h-4 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Building fund progress">
                <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-4 border-t border-white/10 pt-5 text-center">
                <div><p className="text-2xl font-semibold text-white">{pct}%</p><p className="text-xs text-white/60">of goal</p></div>
                <div><p className="text-2xl font-semibold text-white">{formatUsd(campaign.totalPledged)}</p><p className="text-xs text-white/60">pledged</p></div>
                <div><p className="text-2xl font-semibold text-white">{campaign.count}</p><p className="text-xs text-white/60">{campaign.count === 1 ? "pledge" : "pledges"}</p></div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* SITE & BUILDING PLANS (church-supplied drawings) */}
      <BuildingPlans />

      {/* RENDERINGS */}
      {renderings.length ? (
        <Section>
          <Eyebrow className="mb-3">The vision</Eyebrow>
          <h2 className="text-title font-serif font-semibold text-fg">Renderings</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {renderings.map((p) => (
              <figure key={p.id} className="overflow-hidden rounded-xl border border-line shadow-sm">
                <img src={p.url} alt={p.caption ?? `${project.title} — architectural rendering`} className="w-full object-cover" />
                {p.caption ? <figcaption className="bg-surface px-4 py-3 text-sm text-muted">{p.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </Section>
      ) : null}

      {/* PHASES */}
      {project.phases.length ? (
        <section className="bg-tint">
          <Container className="py-16 sm:py-20">
            <Eyebrow className="mb-3">The plan</Eyebrow>
            <h2 className="text-title font-serif font-semibold text-fg">Building in phases</h2>
            <p className="mt-2 text-muted">{formatUsd(phases.totalSpent)} of {formatUsd(phases.totalBudget)} budget · {phases.completionPct}% of phases complete</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {project.phases.map((ph) => (
                <li key={ph.id} className="card p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-serif text-lg font-semibold text-fg">{ph.name}</span>
                    <span className="chip shrink-0">{phaseStatusLabel(ph.status)}</span>
                  </div>
                  {ph.description ? <p className="mt-2 text-sm text-muted">{ph.description}</p> : null}
                  {ph.budget > 0 ? (
                    <div className="mt-4">
                      <div className="h-2 overflow-hidden rounded-full bg-denim-100 dark:bg-white/10"><div className="h-full rounded-full bg-denim-600" style={{ width: `${raisedPct(ph.spent, ph.budget)}%` }} /></div>
                      <p className="mt-1.5 text-xs text-muted">{formatUsd(ph.spent)} of {formatUsd(ph.budget)}</p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {/* GIVING LEVELS */}
      {project.givingLevels.length ? (
        <Section>
          <Eyebrow className="mb-3">Ways to give</Eyebrow>
          <h2 className="text-title font-serif font-semibold text-fg">Every gift builds something</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {project.givingLevels.map((l) => (
              <div key={l.id} className="card p-6">
                <p className="font-serif text-lg font-semibold text-fg">{l.name}</p>
                <p className="mt-1 text-sm font-semibold text-denim-800 dark:text-denim-300">{formatUsd(l.minAmount)}+</p>
                {l.description ? <p className="mt-2 text-sm text-muted">{l.description}</p> : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* PLEDGE FORM */}
      {project.publicPledgeEnabled ? (
        <section id="pledge" className="bg-tint">
          <Container className="py-16 sm:py-20" >
            <div className="mx-auto max-w-2xl">
              <Eyebrow className="mb-3">Join the campaign</Eyebrow>
              <h2 className="text-title font-serif font-semibold text-fg">Make a pledge</h2>
              {pledged ? (
                <div className="mt-6"><Callout tone="success">Thank you — your pledge has been received. Our team will follow up with you.</Callout></div>
              ) : (
                <Card className="mt-6">
                  <p className="mb-5 text-sm text-muted">A pledge is a giving commitment — no payment is collected here. You can give securely anytime through AdventistGiving.</p>
                  <form action={createPledge} className="space-y-3">
                    <input type="hidden" name="projectId" value={project.id} />
                    <input name="donorName" required placeholder="Your name" aria-label="Your name" className={fieldClass} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input name="email" type="email" placeholder="Email" aria-label="Email" className={fieldClass} />
                      <input name="phone" placeholder="Phone" aria-label="Phone" className={fieldClass} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input name="amount" type="number" min={1} required placeholder="Amount $" aria-label="Pledge amount in dollars" className={fieldClass} />
                      <select name="frequency" aria-label="Giving frequency" className={fieldClass}>
                        <option value="ONE_TIME">One-time</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="ANNUAL">Annual</option>
                      </select>
                      <input name="termMonths" type="number" min={1} placeholder="Over N months" aria-label="Spread over how many months" className={fieldClass} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="publicRecognition" className="accent-primary" /> You may list my name as a supporter</label>
                    <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="isAnonymous" className="accent-primary" /> Keep my pledge anonymous</label>
                    <textarea name="note" rows={2} placeholder="Note (optional)" aria-label="Note (optional)" className={fieldClass} />
                    <Honeypot />
                    <button className="btn btn-primary">Submit pledge</button>
                  </form>
                </Card>
              )}
              {project.pledges.length ? (
                <p className="mt-5 text-sm text-muted">With thanks to {project.pledges.map((p) => p.donorName).join(", ")} and many others.</p>
              ) : null}
            </div>
          </Container>
        </section>
      ) : null}

      {/* PROGRESS PHOTOS */}
      {progressPhotos.length ? (
        <Section>
          <Eyebrow className="mb-3">On the ground</Eyebrow>
          <h2 className="text-title font-serif font-semibold text-fg">Progress photos</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {progressPhotos.map((p) => (
              <figure key={p.id} className="overflow-hidden rounded-xl border border-line shadow-sm">
                <img src={p.url} alt={p.caption ?? `${project.title} — construction progress`} className="aspect-square w-full object-cover" />
                {p.caption ? <figcaption className="bg-surface px-4 py-2.5 text-xs text-muted">{p.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </Section>
      ) : null}

      {/* TIMELINE */}
      {project.timelineItems.length ? (
        <section className="bg-tint">
          <Container className="py-16 sm:py-20">
            <Eyebrow className="mb-3">The road ahead</Eyebrow>
            <h2 className="text-title font-serif font-semibold text-fg">Timeline</h2>
            <ol className="mt-8 space-y-3">
              {project.timelineItems.map((it) => (
                <li key={it.id} className="card flex items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-serif text-base font-semibold text-fg">{it.title}</p>
                    {it.targetDate ? <p className="mt-0.5 text-xs text-muted">Target: {new Date(it.targetDate).toLocaleDateString("en-US")}</p> : null}
                  </div>
                  <span className="chip shrink-0">{timelineLabel(it.status)}</span>
                </li>
              ))}
            </ol>
          </Container>
        </section>
      ) : null}

      {/* UPDATES */}
      {project.updates.length ? (
        <Section>
          <div id="updates" className="scroll-mt-24" />
          <Eyebrow className="mb-3">News</Eyebrow>
          <h2 className="text-title font-serif font-semibold text-fg">Building updates</h2>
          <ul className="mt-8 space-y-5">
            {project.updates.map((u) => (
              <li key={u.id} className="card p-6">
                <p className="text-sm text-muted">{new Date(u.year, u.month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                {u.title ? <p className="mt-0.5 font-serif text-lg font-semibold text-fg">{u.title}</p> : null}
                <p className="mt-2 text-fg/90">{u.description}</p>
                {u.videoUrl ? <p className="mt-3"><a href={u.videoUrl} target="_blank" rel={EXT} className="text-sm font-semibold text-primary hover:text-primary-hover">Watch update →</a></p> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* DOCUMENTS + FAQ */}
      {(project.documents.length || project.faqs.length) ? (
        <section className="bg-tint">
          <Container className="py-16 sm:py-20">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              {project.faqs.length ? (
                <div>
                  <Eyebrow className="mb-3">Questions</Eyebrow>
                  <h2 className="text-title font-serif font-semibold text-fg">Frequently asked</h2>
                  <dl className="mt-6 space-y-5">
                    {project.faqs.map((f) => (
                      <div key={f.id} className="card p-5">
                        <dt className="font-semibold text-fg">{f.question}</dt>
                        <dd className="mt-1.5 text-sm text-muted">{f.answer}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
              {project.documents.length ? (
                <div>
                  <Eyebrow className="mb-3">Resources</Eyebrow>
                  <h2 className="text-title font-serif font-semibold text-fg">Documents</h2>
                  <ul className="mt-6 space-y-2">
                    {project.documents.map((d) => (
                      <li key={d.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
                        <svg className="h-4 w-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
                        <span className="text-fg">{d.title}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted">Contact the church office to request access to project documents.</p>
                </div>
              ) : null}
            </div>
          </Container>
        </section>
      ) : null}

      {/* SUBSCRIBE */}
      <Section container size="narrow" className="text-center">
        <Eyebrow className="mb-3">Stay connected</Eyebrow>
        <h2 className="text-title font-serif font-semibold text-fg">Get building updates</h2>
        {subscribed ? (
          <div className="mx-auto mt-6 max-w-md"><Callout tone="success">You’re subscribed to building updates. Thank you!</Callout></div>
        ) : (
          <form action={subscribeBuilding} className="mx-auto mt-6 flex max-w-md gap-2">
            <input name="email" type="email" required placeholder="you@email.com" aria-label="Email address for building updates" className={`${fieldClass} flex-1`} />
            <Honeypot />
            <button className="btn btn-primary">Subscribe</button>
          </form>
        )}
      </Section>
    </>
  );
}
