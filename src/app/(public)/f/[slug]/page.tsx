import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { env } from "@/env";
import {
  formatUsd,
  verifiedTotal,
  fundraiserProgress,
  supporterCount,
  referralCount,
  targetDatePassed,
} from "@/lib/fundraising";
import { raisedPct } from "@/lib/construction";
import { FUNDRAISER_TYPE_LABEL } from "@/lib/fundraiser-workflow";
import { Container, Eyebrow, ArrowLink } from "@/components/ui";
import { ProgressMeter, FactList, formatDate } from "@/components/portal/fundraiser-ui";
import { BuildingPlans } from "@/components/BuildingPlans";
import { ExploreBand } from "@/components/building/ExploreBand";
import { FundraiserHero } from "@/components/fundraiser/FundraiserHero";
import { ShareBar } from "@/components/fundraiser/ShareBar";
import { StickyGiveBar } from "@/components/fundraiser/StickyGiveBar";
import { SpacesStrip } from "@/components/fundraiser/SpacesStrip";
import { GivingFaq } from "@/components/fundraiser/GivingFaq";

export const dynamic = "force-dynamic";

/**
 * The public fundraising page (§12). Shareable without any Member Portal access, and identical
 * for a member-owned and a Supporter-owned fundraiser.
 *
 * What it deliberately does NOT contain: donor identities, per-donor amounts, and anything
 * from the Member Portal. The query below selects no donor field at all — only confirmed
 * amounts and their confirmation times — so donor information cannot reach this page even by
 * accident. Keep it that way: every figure on this page is an aggregate.
 *
 * Only an ACTIVE fundraiser is reachable; every other status 404s, which is what keeps a
 * pending, rejected, closed, or archived page off the public web.
 *
 * No money is handled here. Giving is a redirect through /f/{slug}/give to AdventistGiving —
 * this platform has no payment surface and never will.
 */

/** Watched by the mobile give bar so it stays off the hero CTA and off the footer. */
const HERO_SENTINEL = "fundraiser-hero-cta";

/**
 * The rooms a visitor most often wants to picture, in the order they'd walk through them.
 * Copy and imagery come from BUILDING_SPACES — this is a selection, not a second source.
 */
const SPACES = ["welcome-lobby", "sanctuary", "childrens-ministry", "classrooms", "fellowship-hall", "kitchen"];

async function loadPublic(slug: string) {
  return safe(
    prisma.fundraiser.findFirst({
      where: { slug, status: "ACTIVE" },
      select: {
        id: true, slug: true, title: true, displayName: true, story: true, graphicUrl: true,
        type: true, personalGoal: true, targetDate: true, referralToken: true, approvedAt: true,
        household: { select: { familyName: true } },
        ministry: { select: { name: true } },
        campaign: { select: { title: true, status: true } },
        donations: { where: { status: "CONFIRMED" }, select: { amount: true, status: true, confirmedAt: true } },
        referrals: { where: { status: "ACTIVE" }, select: { id: true } },
      },
    }),
    null,
  );
}

/** The active building project, for the church-wide framing. Never blocks the page. */
async function loadProject() {
  return safe(
    prisma.constructionProject.findFirst({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      select: { description: true, totalGoal: true, currentRaised: true, targetCompletion: true },
    }),
    null,
  );
}

/**
 * This goal as a share of the whole campaign. A personal goal is a small fraction of a capital
 * campaign, so a rounded whole percentage would read "0%" for most fundraisers — the extra
 * decimal is what keeps the figure true. Returns null when there is nothing honest to say.
 */
function goalShare(goal: number, campaignTotal: number): string | null {
  if (goal <= 0 || campaignTotal <= 0) return null;
  const pct = (goal / campaignTotal) * 100;
  if (pct > 100) return null;
  if (pct < 0.1) return "less than 0.1%";
  return pct >= 10 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = await loadPublic(slug);
  // The same two gates the page applies. Without the campaign check the browser tab would name
  // a fundraiser whose page 404s.
  if (!f || f.campaign.status !== "ACTIVE") return { title: "Fundraiser not found" };
  const progress = fundraiserProgress(verifiedTotal(f.donations), f.personalGoal);
  const standing =
    progress.goal > 0
      ? `${formatUsd(progress.raised)} of ${formatUsd(progress.goal)} raised so far.`
      : progress.raised > 0
        ? `${formatUsd(progress.raised)} raised so far.`
        : "";
  return {
    title: f.title,
    description: `Support the McKinney SDA Building Project through ${f.displayName}'s fundraiser.`,
    openGraph: {
      title: f.title,
      description: [f.story?.slice(0, 160) ?? "Help build our future home.", standing].filter(Boolean).join(" "),
      url: `${env.NEXT_PUBLIC_SITE_URL}/f/${f.slug}`,
      ...(f.graphicUrl ? { images: [f.graphicUrl] } : {}),
    },
  };
}

export default async function FundraiserPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = await loadPublic(slug);
  if (!f || f.campaign.status !== "ACTIVE") notFound();

  const project = await loadProject();

  const progress = fundraiserProgress(verifiedTotal(f.donations), f.personalGoal);
  /**
   * GIFTS, not supporters. supporterCount() de-duplicates on email ?? donorName, and this page
   * selects neither — by design — so every row counts separately and the figure is the number
   * of confirmed gifts. It is labelled "gifts" for that reason. Do NOT add donor fields to the
   * query to make "supporters" work: the donor-free select is the privacy guarantee.
   */
  const gifts = supporterCount(f.donations);
  const referrals = referralCount(f.referrals);
  const targetPassed = targetDatePassed(f.targetDate);

  const ownerLabel =
    f.type === "FAMILY" ? f.household?.familyName ?? f.displayName
    : f.type === "MINISTRY" ? f.ministry?.name ?? f.displayName
    : f.displayName;
  const typeLabel = f.type === "PERSONAL" ? null : FUNDRAISER_TYPE_LABEL[f.type];

  const giveHref = `/f/${f.slug}/give`;
  const publicUrl = `${env.NEXT_PUBLIC_SITE_URL}/f/${f.slug}`;
  const shareMessage = `Help ${ownerLabel} build our future home — ${f.title}`;
  const storyHeading = f.type === "PERSONAL" ? "Why I'm fundraising" : "Why we're fundraising";
  const share = project ? goalShare(progress.goal, project.totalGoal) : null;
  const projectPct = project ? raisedPct(project.currentRaised, project.totalGoal) : 0;

  const projectFacts = project
    ? [
        { label: "Church-wide goal", value: project.totalGoal > 0 ? formatUsd(project.totalGoal) : null },
        { label: "Raised church-wide", value: project.currentRaised > 0 ? `${formatUsd(project.currentRaised)}${project.totalGoal > 0 ? ` · ${projectPct}%` : ""}` : null },
        { label: "Target completion", value: project.targetCompletion ? project.targetCompletion.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null },
      ]
    : [];
  const showProject = !!project && (!!project.description || projectFacts.some((x) => x.value !== null));

  return (
    <>
      <FundraiserHero
        title={f.title}
        displayName={f.displayName}
        ownerLabel={ownerLabel}
        typeLabel={typeLabel}
        graphicUrl={f.graphicUrl}
        giveHref={giveHref}
        shareUrl={publicUrl}
        shareMessage={shareMessage}
        sentinelId={HERO_SENTINEL}
      />

      <Container className="py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* The rail leads in the DOM so a phone meets the progress and the Give button before
              the story; on lg: it moves to the right and follows the reader down the page. */}
          <div className="lg:order-2 lg:col-span-5 xl:col-span-4">
            <div className="lg:sticky lg:top-28">
              {/* Below lg the rail is stacked into the flow, where a full-bleed card would
                  stretch the CTA across the whole page. Capped to the width of the prose it
                  sits above, and left-aligned with it. */}
              <div className="card max-w-xl p-6 sm:p-7 lg:max-w-none">
                {progress.goal > 0 ? (
                  <ProgressMeter progress={progress} size="large" label={`${f.title} progress`} />
                ) : (
                  // No goal set — there is nothing to be a percentage OF, so the bar and the
                  // "of $0" framing are omitted rather than rendered empty.
                  <div>
                    <p className="font-serif text-4xl font-semibold tabular-nums text-denim-800 sm:text-5xl dark:text-gold">
                      {formatUsd(progress.raised)}
                    </p>
                    <p className="mt-1 text-muted">raised toward the Building Project</p>
                  </div>
                )}

                {progress.raised === 0 && (
                  <p className="mt-4 font-medium text-fg">Be the first to give.</p>
                )}

                {(gifts !== null || f.targetDate) && (
                  <div className="mt-5 border-t border-line pt-5">
                    <FactList
                      columns={2}
                      facts={[
                        { label: "Gifts", value: gifts },
                        { label: "Target date", value: f.targetDate ? formatDate(f.targetDate) : null },
                      ]}
                    />
                  </div>
                )}

                {targetPassed && (
                  <p className="mt-4 text-sm font-medium text-accent-strong">
                    The target date has passed — this page is still open and still accepting gifts.
                  </p>
                )}

                <a href={giveHref} className="btn btn-accent mt-6 w-full">Give to this fundraiser</a>
                <div className="mt-3">
                  <ShareBar url={publicUrl} title={f.title} message={shareMessage} />
                </div>

                <p className="mt-4 text-xs leading-relaxed text-muted">
                  Giving is handled securely by AdventistGiving, the Adventist Church&rsquo;s official
                  giving platform. This website never sees or stores your card details.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:order-1 lg:col-span-7 xl:col-span-8">
            {f.story && (
              <section>
                <Eyebrow className="mb-3">In their words</Eyebrow>
                <h2 className="text-title font-serif font-semibold text-fg">{storyHeading}</h2>
                {/* User-authored text, rendered as text. Never as HTML. */}
                <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-fg/90">{f.story}</p>
              </section>
            )}

            {showProject && project && (
              <section className={f.story ? "mt-14" : ""}>
                <Eyebrow className="mb-3">The church-wide campaign</Eyebrow>
                <h2 className="text-title font-serif font-semibold text-fg">What we&rsquo;re building</h2>
                {project.description && (
                  <p className="mt-5 text-lg leading-relaxed text-muted">{project.description}</p>
                )}
                {projectFacts.some((x) => x.value !== null) && (
                  <div className="mt-8 rounded-xl border border-line bg-surface-2 p-6">
                    <FactList facts={projectFacts} />
                    <p className="mt-4 text-sm leading-relaxed text-muted">
                      {progress.goal > 0 ? (
                        <>
                          These are the whole church&rsquo;s figures for the Building Project — not{" "}
                          {ownerLabel}&rsquo;s personal goal, which is shown on its own above.
                        </>
                      ) : (
                        // With no personal goal set there is no second figure to contrast with,
                        // so the sentence must not point at one.
                        <>
                          These are the whole church&rsquo;s figures for the Building Project, not the
                          amount raised through this page.
                        </>
                      )}
                    </p>
                  </div>
                )}
                <div className="mt-6">
                  <ArrowLink href="/construction">See the whole Building Project</ArrowLink>
                </div>
              </section>
            )}
          </div>
        </div>
      </Container>

      <SpacesStrip slugs={SPACES} />
      <ExploreBand />
      <BuildingPlans />
      <GivingFaq />

      {project && (
        <section className="bg-tint">
          <Container size="narrow" className="py-14 sm:py-16">
            <Eyebrow className="mb-3">One part of a bigger story</Eyebrow>
            <h2 className="text-title font-serif font-semibold text-fg">This goal inside the whole</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              {share && progress.goal > 0 ? (
                <>
                  {ownerLabel}&rsquo;s goal of {formatUsd(progress.goal)} is {share} of the church&rsquo;s{" "}
                  {formatUsd(project.totalGoal)} Building Project.
                </>
              ) : (
                <>{ownerLabel}&rsquo;s fundraiser is one part of the church&rsquo;s Building Project.</>
              )}{" "}
              No single page finishes a building — but together, page by page and gift by gift, they do.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              <ArrowLink href="/construction">The Building Project</ArrowLink>
              <ArrowLink href="/fundraising">Everyone who&rsquo;s fundraising</ArrowLink>
            </div>
          </Container>
        </section>
      )}

      <section className="border-t border-line bg-surface">
        <Container size="narrow" className="py-14 sm:py-16">
          <Eyebrow className="mb-3">Pass it on</Eyebrow>
          <h2 className="text-title font-serif font-semibold text-fg">Start your own fundraiser</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Anyone in our church family can open a page like this one, set a goal, and invite the
            people they know. It takes a few minutes.
          </p>
          {referrals !== null && (
            <p className="mt-3 text-muted">
              {referrals === 1
                ? "1 fundraiser has already started from this page."
                : `${referrals} fundraisers have already started from this page.`}
            </p>
          )}
          <Link href={`/fundraising/start?ref=${encodeURIComponent(f.referralToken)}`} className="btn btn-primary mt-6">
            Start your own fundraiser
          </Link>
        </Container>
      </section>

      {/* Final CTA. Extra bottom padding on small screens keeps the mobile give bar clear of
          these buttons — the bar hides against the footer, not against this band. */}
      <section className="bg-hero-denim text-white">
        <Container size="narrow" className="py-16 pb-28 text-center sm:py-20 lg:pb-20">
          <Eyebrow className="text-denim-300">Possess the land</Eyebrow>
          <h2 className="mt-3 text-display font-serif font-semibold text-white">
            Help {ownerLabel} get there.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Every gift given through this page goes to the McKinney SDA Building Project — and
            counts toward this goal once our treasurer has reconciled it.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <a href={giveHref} className="btn btn-accent">Give to this fundraiser</a>
            <ShareBar url={publicUrl} title={f.title} message={shareMessage} tone="dark" channels />
          </div>
        </Container>
      </section>

      <StickyGiveBar
        giveHref={giveHref}
        raisedLabel={progress.goal > 0 ? `${formatUsd(progress.raised)} of ${formatUsd(progress.goal)}` : `${formatUsd(progress.raised)} raised`}
        hideWhileVisible={[`#${HERO_SENTINEL}`, "footer"]}
      />
    </>
  );
}
