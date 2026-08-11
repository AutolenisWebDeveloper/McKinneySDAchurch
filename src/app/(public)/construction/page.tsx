import Link from "next/link";
import { prisma } from "@/lib/db";
import { raisedPct, formatUsd, campaignRollup, phaseRollup } from "@/lib/construction";
import { safe } from "@/lib/safe";
import { env } from "@/env";
import { subscribeBuilding, createPledge } from "./actions";
import { Card, Callout, fieldClass, Honeypot } from "@/components/page-ui";
import { Section, Container, Eyebrow, ArrowLink } from "@/components/ui";
import { BuildingPlans } from "@/components/BuildingPlans";
import { BuildingHero } from "@/components/building/BuildingHero";
import { CampaignDashboard } from "@/components/building/CampaignDashboard";
import { ArchitectureShowcase } from "@/components/building/ArchitectureShowcase";
import { InteractivePlan } from "@/components/building/InteractivePlan";
import { MilestoneTracker } from "@/components/building/MilestoneTracker";
import { LatestProgress } from "@/components/building/LatestProgress";
import { BuildWithUs } from "@/components/building/BuildWithUs";
import { StewardshipSection } from "@/components/building/StewardshipSection";
import type { GalleryImage } from "@/components/building/GalleryLightbox";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "The Building Project",
  description: "Possess the Land — building a permanent home for worship, discipleship, and community. Explore the future church in 3D and build with us.",
};

const EXT = "noopener noreferrer";

/** A slim band promoting the immersive 3D experience. */
function ExploreBand() {
  return (
    <section className="relative overflow-hidden bg-denim-900 text-white">
      <img src="/image/rendering-aerial.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-r from-denim-950 via-denim-950/85 to-denim-950/40" aria-hidden="true" />
      <Container className="relative py-14 sm:py-16">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow text-denim-300">The signature feature</p>
            <h2 className="mt-2 text-title font-serif font-semibold text-white">Explore our future home in 3D</h2>
            <p className="mt-3 text-white/75">
              Move through the campus, open each space, and see what we're building — in an
              immersive, interactive experience.
            </p>
          </div>
          <Link href="/construction/explore" className="btn btn-white shrink-0">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3zM12 3v18M3 7.5l9 4.5 9-4.5" /></svg>
            Launch the experience
          </Link>
        </div>
      </Container>
    </section>
  );
}

export default async function Construction({ searchParams }: { searchParams: Promise<{ subscribed?: string; pledged?: string }> }) {
  const { subscribed, pledged } = await searchParams;
  const giveUrl = env.ADVENTIST_GIVING_URL ?? null;

  const project = await safe(prisma.constructionProject.findFirst({
    where: { active: true }, orderBy: { createdAt: "desc" },
    include: {
      phases: { orderBy: { sortOrder: "asc" } },
      updates: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 12 },
      givingLevels: { orderBy: { minAmount: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } },
      photos: { orderBy: { sortOrder: "asc" } },
      pledges: { where: { publicRecognition: true, isAnonymous: false, status: { in: ["CONFIRMED", "FULFILLED"] } }, select: { donorName: true } },
      documents: { select: { id: true, title: true } },
    },
  }), null);

  // No active project yet — still present the vision, the 3D experience, and the plans.
  if (!project) {
    return (
      <>
        <BuildingHero />
        <ExploreBand />
        <ArchitectureShowcase />
        <InteractivePlan />
        <BuildingPlans />
        <SubscribeSection subscribed={subscribed} />
      </>
    );
  }

  const allPledges = await safe(prisma.buildingPledge.findMany({ where: { projectId: project.id }, select: { amount: true, receivedToDate: true, status: true } }), []);
  const campaign = campaignRollup(allPledges);
  const phases = phaseRollup(project.phases);
  const pct = raisedPct(project.currentRaised, project.totalGoal);
  const targetLabel = project.targetCompletion
    ? new Date(project.targetCompletion).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const dbRenderings: GalleryImage[] = project.photos
    .filter((p) => p.category === "rendering")
    .map((p) => ({ src: p.url, alt: p.caption ?? `${project.title} — architectural rendering`, caption: p.caption ?? undefined, tag: "Rendering" }));
  const progressPhotos: GalleryImage[] = project.photos
    .filter((p) => p.category !== "rendering")
    .map((p) => ({ src: p.url, alt: p.caption ?? `${project.title} — construction progress`, caption: p.caption ?? undefined }));

  const stewardshipStats = [
    { label: "Campaign goal", value: formatUsd(project.totalGoal) },
    { label: "Raised to date", value: formatUsd(project.currentRaised) },
    { label: "Pledged", value: formatUsd(campaign.totalPledged) },
    { label: "Milestones complete", value: `${phases.completionPct}%` },
  ];

  return (
    <>
      {/* 1 — CINEMATIC HERO */}
      <BuildingHero projectTitle={project.title} targetLabel={targetLabel} />

      {/* 2 — VISION */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Eyebrow className="mb-4">The vision</Eyebrow>
            <h2 className="text-display font-serif font-semibold text-fg">A home of our own</h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted">
              {project.description ? <p>{project.description}</p> : (
                <p>
                  For now we gather in a borrowed space — and we're grateful for it. But God
                  has given us a vision: a permanent home where our church family can worship,
                  disciple our children, and welcome our neighbors for generations to come.
                </p>
              )}
              <p>Every gift, every prayer, and every hand brings that day closer.</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              <ArrowLink href="/construction/explore">Explore the future church</ArrowLink>
              <ArrowLink href="#build-with-us">Build with us</ArrowLink>
            </div>
          </div>
          <div className="lg:col-span-5">
            <figure className="card relative overflow-hidden p-8">
              <svg className="absolute right-4 top-4 h-10 w-10 text-denim-200" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.13 8.6c.4-.28.55-.8.35-1.24C8.6 5.4 6.7 4.2 4.6 4.2H4v3.3h.6c.83 0 1.55.42 1.98 1.06-.9.3-1.55 1.15-1.55 2.15 0 1.26 1.02 2.29 2.28 2.29s2.29-1.03 2.29-2.29c0-.86-.02-1.66-.47-2.41zM19.13 8.6c.4-.28.55-.8.35-1.24-.88-1.96-2.78-3.16-4.88-3.16h-.6v3.3h.6c.83 0 1.55.42 1.98 1.06-.9.3-1.55 1.15-1.55 2.15 0 1.26 1.02 2.29 2.28 2.29S19.6 12.03 19.6 10.77c0-.86-.02-1.66-.47-2.17z" /></svg>
              <blockquote className="font-serif text-xl leading-relaxed text-fg">
                “Enlarge the place of your tent … for you will spread abroad to the right and to the left.”
              </blockquote>
              <figcaption className="mt-4 text-sm font-semibold text-muted">Isaiah 54:2–3</figcaption>
              <div className="rule-accent mt-6" />
              <p className="mt-6 text-sm leading-relaxed text-muted">
                A permanent home is not the goal — it is the tool. The goal is a community that
                worships, disciples, and serves McKinney for generations.
              </p>
            </figure>
          </div>
        </div>
      </Section>

      {/* 3 — CAMPAIGN PROGRESS */}
      <CampaignDashboard
        raised={project.currentRaised}
        goal={project.totalGoal}
        pct={pct}
        pledgedTotal={campaign.totalPledged}
        pledgeCount={campaign.count}
        giveUrl={giveUrl}
        targetLabel={targetLabel}
      />

      {/* 4 — 3D EXPERIENCE */}
      <ExploreBand />

      {/* 5 — ARCHITECTURE */}
      <ArchitectureShowcase extraImages={dbRenderings} />

      {/* 6 — INTERACTIVE PLAN + 7 — PROJECT FACTS / PLANS */}
      <InteractivePlan />
      <div id="plans" className="scroll-mt-24" />
      <BuildingPlans />

      {/* 8 — CONSTRUCTION PROGRESS (milestones) */}
      <MilestoneTracker
        milestones={project.phases.map((p) => ({ id: p.id, name: p.name, description: p.description, status: p.status, budget: p.budget, spent: p.spent }))}
        completionPct={phases.completionPct}
      />

      {/* 9 — LATEST PROGRESS */}
      <LatestProgress updates={project.updates} photos={progressPhotos} />

      {/* 10 — BUILD WITH US */}
      <BuildWithUs opportunities={project.givingLevels} giveUrl={giveUrl} />

      {/* 11 — PLEDGE */}
      {project.publicPledgeEnabled ? (
        <Section className="bg-surface" container={false}>
          <Container>
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
        </Section>
      ) : null}

      {/* 12 — SPONSORSHIP */}
      <section className="bg-tint">
        <Container className="py-14 sm:py-16">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <Eyebrow className="mb-2">Sponsors & partners</Eyebrow>
              <h2 className="text-title font-serif font-semibold text-fg">Partner with the mission</h2>
              <p className="mt-2 text-muted">Businesses and families can partner with the building project in meaningful, lasting ways.</p>
            </div>
            <ArrowLink href="/sponsors">Explore sponsorship</ArrowLink>
          </div>
        </Container>
      </section>

      {/* 13 — STEWARDSHIP (+ FAQ + documents + leadership) */}
      <StewardshipSection stats={stewardshipStats} faqs={project.faqs} documents={project.documents} />

      {/* 14 — UPDATES SUBSCRIBE */}
      <SubscribeSection subscribed={subscribed} />

      {/* 15 — FINAL CTA */}
      <section className="bg-hero-denim text-white">
        <Container className="py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-denim-300">Possess the land</p>
            <h2 className="mt-3 text-display font-serif font-semibold text-white">Build a home for generations.</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
              Explore the future church, then take your place in the story God is writing for the
              McKinney SDA Church.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/construction/explore" className="btn btn-white">Explore in 3D</Link>
              {giveUrl ? (
                <a href={giveUrl} target="_blank" rel={EXT} className="btn btn-accent">Give to the building</a>
              ) : (
                <a href="#pledge" className="btn btn-accent">Make a pledge</a>
              )}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function SubscribeSection({ subscribed }: { subscribed?: string }) {
  return (
    <Section container size="narrow" className="bg-canvas text-center">
      <Eyebrow className="mb-3">Stay connected</Eyebrow>
      <h2 className="text-title font-serif font-semibold text-fg">Get building updates</h2>
      {subscribed ? (
        <div className="mx-auto mt-6 max-w-md"><Callout tone="success">You're subscribed to building updates. Thank you!</Callout></div>
      ) : (
        <form action={subscribeBuilding} className="mx-auto mt-6 flex max-w-md gap-2">
          <input name="email" type="email" required placeholder="you@email.com" aria-label="Email address for building updates" className={`${fieldClass} flex-1`} />
          <Honeypot />
          <button className="btn btn-primary">Subscribe</button>
        </form>
      )}
    </Section>
  );
}
