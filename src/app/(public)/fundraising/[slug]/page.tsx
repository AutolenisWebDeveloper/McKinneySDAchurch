import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { env } from "@/env";
import { buildingCampaign } from "@/lib/fundraisers";
import {
  formatUsd,
  campaignTotals,
  fundraiserTotals,
  rankFundraisers,
  confirmedTotal,
  raisedPct,
} from "@/lib/fundraising";
import { DonateForm } from "@/components/DonateForm";
import { Container, Eyebrow, ArrowLink } from "@/components/ui";
import { Callout } from "@/components/page-ui";
import { BuildingPlans } from "@/components/BuildingPlans";
import { ExploreBand } from "@/components/building/ExploreBand";
import { ArchitectureShowcase } from "@/components/building/ArchitectureShowcase";
import { CampaignHero } from "@/components/fundraiser/CampaignHero";
import { FundraiserCards, type FundraiserCard } from "@/components/fundraiser/FundraiserCards";
import { WallOfFame } from "@/components/fundraiser/WallOfFame";
import { SpacesStrip } from "@/components/fundraiser/SpacesStrip";
import { GivingFaq } from "@/components/fundraiser/GivingFaq";
import { ShareBar } from "@/components/fundraiser/ShareBar";
import { StickyGiveBar } from "@/components/fundraiser/StickyGiveBar";

export const dynamic = "force-dynamic";

/**
 * The public campaign page. This and the individual fundraiser page (/f/[slug]) are the two
 * public faces of the same building project, so they are composed from the same parts: the
 * shared hero shell, the same space cards and Explore band, the same giving FAQ and share bar.
 * The difference is what leads — a campaign leads with the building and the church's standing
 * against its goal; a fundraiser leads with a person.
 *
 * Everything visual here is church-supplied content that already exists elsewhere in the
 * project (BUILDING_SPACES, the renderings in ArchitectureShowcase, the architect's drawings in
 * BuildingPlans). Nothing about cost, schedule or impact-per-dollar is asserted.
 *
 * The payment boundary is unchanged: DonateForm RECORDS a gift or pledge for the treasurer to
 * reconcile, and the money itself is given on AdventistGiving through an external link. No card
 * details are collected or stored here.
 */

/** Watched by the mobile give bar so it stays off the hero CTA and off the footer. */
const HERO_SENTINEL = "campaign-hero-cta";

/** The rooms visitors most want to picture, in the order they would walk through them. */
const SPACES = [
  "welcome-lobby",
  "sanctuary",
  "platform-baptistry",
  "childrens-ministry",
  "classrooms",
  "fellowship-hall",
  "kitchen",
  "parking-arrival",
];

const loadCampaign = cache(async (slug: string) => {
  return safe(
    prisma.fundraisingCampaign.findUnique({
      where: { slug },
      include: {
        donations: { select: { amount: true, status: true, fundraiserId: true } },
        // ACTIVE and CLOSED both feed the Wall of Fame: a fundraiser that finished successfully
        // and was closed still earned its recognition, and omitting it would leave its dollars on
        // the board under the anonymous "Member" fallback. DECLINED/ARCHIVED stay off entirely.
        fundraisers: {
          where: { status: { in: ["ACTIVE", "CLOSED"] } },
          include: { donations: { select: { amount: true, status: true } } },
        },
      },
    }),
    null,
  );
});

/** The active building project, for the vision copy and the church-wide figures. */
const loadProject = cache(async () =>
  safe(
    prisma.constructionProject.findFirst({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      select: { description: true, totalGoal: true, currentRaised: true, targetCompletion: true },
    }),
    null,
  ),
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await loadCampaign(slug);
  if (!c || c.status === "DRAFT") {
    return { title: "Campaign not found", robots: { index: false, follow: false } };
  }
  const totals = campaignTotals(c.donations, c.goal);
  const standing = c.goal > 0 ? ` ${formatUsd(totals.confirmed)} of ${formatUsd(c.goal)} raised so far.` : "";
  return {
    title: c.title,
    description: (c.description ?? "Help build a permanent home for the McKinney SDA Church.").slice(0, 200),
    openGraph: {
      title: c.title,
      description: `${c.description?.slice(0, 160) ?? "Help build our future home."}${standing}`,
      url: `${env.NEXT_PUBLIC_SITE_URL}/fundraising/${c.slug}`,
      ...(c.coverImageUrl ? { images: [c.coverImageUrl] } : {}),
    },
  };
}

export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ donated?: string }>;
}) {
  const { slug } = await params;
  const { donated } = await searchParams;
  const c = await loadCampaign(slug);
  if (!c || c.status === "DRAFT") notFound();

  const project = await loadProject();

  // The creation flow is bound to the Building Project campaign, so only that one offers the CTA.
  const building = await safe(buildingCampaign(), null);
  const isBuildingCampaign = !!building && building.id === c.id && c.allowMemberFundraisers;

  const totals = campaignTotals(c.donations, c.goal);
  const names = Object.fromEntries(c.fundraisers.map((f) => [f.id, f.displayName]));
  const board = rankFundraisers(fundraiserTotals(c.donations, names)).slice(0, 10);

  const activeFundraisers: FundraiserCard[] = c.fundraisers
    .filter((f) => f.status === "ACTIVE")
    .map((f) => ({
      slug: f.slug,
      title: f.title,
      displayName: f.displayName,
      goal: f.personalGoal,
      raised: confirmedTotal(f.donations),
    }))
    .sort((a, b) => b.raised - a.raised);

  const giveUrl = env.ADVENTIST_GIVING_URL ?? null;
  const publicUrl = `${env.NEXT_PUBLIC_SITE_URL}/fundraising/${c.slug}`;
  const shareMessage = `Help us build our future home — ${c.title}`;
  const targetLabel = project?.targetCompletion
    ? new Date(project.targetCompletion).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const churchWide = project
    ? [
        { label: "Church-wide goal", value: project.totalGoal > 0 ? formatUsd(project.totalGoal) : null },
        {
          label: "Raised church-wide",
          value:
            project.currentRaised > 0
              ? `${formatUsd(project.currentRaised)}${project.totalGoal > 0 ? ` · ${raisedPct(project.currentRaised, project.totalGoal)}%` : ""}`
              : null,
        },
        { label: "Target completion", value: targetLabel },
      ].filter((f): f is { label: string; value: string } => f.value !== null)
    : [];

  return (
    <>
      <CampaignHero
        title={c.title}
        description={c.description}
        imageUrl={c.coverImageUrl}
        raisedLabel={formatUsd(totals.confirmed)}
        goalLabel={c.goal > 0 ? formatUsd(c.goal) : null}
        pct={c.goal > 0 ? raisedPct(totals.confirmed, c.goal) : null}
        giftCount={totals.count}
        fundraiserCount={activeFundraisers.length}
        giveUrl={giveUrl}
        shareUrl={publicUrl}
        shareMessage={shareMessage}
        sentinelId={HERO_SENTINEL}
      />

      {/* THE VISION — why a building at all. */}
      <section className="bg-canvas">
        <Container className="py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
            <div className="lg:col-span-7">
              <Eyebrow className="mb-4">The vision</Eyebrow>
              <h2 className="text-display font-serif font-semibold text-fg">A home of our own</h2>
              <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted">
                {project?.description ? (
                  <p>{project.description}</p>
                ) : (
                  <p>
                    For now we gather in a borrowed space — and we&rsquo;re grateful for it. But God
                    has given us a vision: a permanent home where our church family can worship,
                    disciple our children, and welcome our neighbors for generations to come.
                  </p>
                )}
                <p>Every gift, every prayer, and every hand brings that day closer.</p>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                <ArrowLink href="/construction">See the whole Building Project</ArrowLink>
                <ArrowLink href="/construction/explore">Explore the future church</ArrowLink>
              </div>
            </div>
            <div className="lg:col-span-5">
              <figure className="card relative overflow-hidden p-8">
                <svg className="absolute right-4 top-4 h-10 w-10 text-denim-200" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.13 8.6c.4-.28.55-.8.35-1.24C8.6 5.4 6.7 4.2 4.6 4.2H4v3.3h.6c.83 0 1.55.42 1.98 1.06-.9.3-1.55 1.15-1.55 2.15 0 1.26 1.02 2.29 2.28 2.29s2.29-1.03 2.29-2.29c0-.86-.02-1.66-.47-2.41zM19.13 8.6c.4-.28.55-.8.35-1.24-.88-1.96-2.78-3.16-4.88-3.16h-.6v3.3h.6c.83 0 1.55.42 1.98 1.06-.9.3-1.55 1.15-1.55 2.15 0 1.26 1.02 2.29 2.28 2.29S19.6 12.03 19.6 10.77c0-.86-.02-1.66-.47-2.17z" /></svg>
                <blockquote className="font-serif text-xl leading-relaxed text-fg">
                  &ldquo;Enlarge the place of your tent … for you will spread abroad to the right and to the left.&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-sm font-semibold text-muted">Isaiah 54:2–3</figcaption>
                <div className="rule-accent mt-6" />
                {/* The church-wide figures the Building Project publishes on /construction.
                    Kept distinct from the campaign ledger above, which counts only the gifts
                    recorded against this campaign page — the two are different records and
                    presenting either as the other would misreport what has been given. */}
                {churchWide.length > 0 && (
                  <dl className="mt-6 space-y-3 border-t border-line pt-6">
                    {churchWide.map((f) => (
                      <div key={f.label} className="flex items-baseline justify-between gap-4">
                        <dt className="text-sm text-muted">{f.label}</dt>
                        <dd className="font-semibold tabular-nums text-fg">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {churchWide.length > 0 && (
                  <p className="mt-4 text-xs leading-relaxed text-muted">
                    Church-wide totals for the Building Project, as reported on the project page.
                  </p>
                )}
              </figure>
            </div>
          </div>
        </Container>
      </section>

      {/* WHAT WE ARE BUILDING — the church-approved space content, shared with /f/[slug]. */}
      <SpacesStrip slugs={SPACES} />

      {/* THE RENDERINGS — the full cinematic gallery, with its lightbox. */}
      <ArchitectureShowcase />

      {/* THE 3D EXPERIENCE. */}
      <ExploreBand />

      {/* THE ARCHITECT'S DRAWINGS + the verified site facts. */}
      <BuildingPlans />

      <FundraiserCards
        fundraisers={activeFundraisers}
        startHref={isBuildingCampaign ? "/fundraising/start" : null}
      />

      <WallOfFame entries={board} />

      {/* GIVE — the external handoff first, the record-a-gift form second. */}
      <section id="give" className="scroll-mt-24 border-y border-line bg-surface">
        <Container size="narrow" className="py-16 sm:py-20">
          <Eyebrow className="mb-3">Take your place in it</Eyebrow>
          <h2 className="text-title font-serif font-semibold text-fg">Give to this campaign</h2>
          <p className="mt-3 text-lg leading-relaxed text-muted">
            Giving is handled by AdventistGiving, the Adventist Church&rsquo;s official platform.
            This website never sees or stores your card details.
          </p>

          {donated ? (
            <div className="mt-6">
              <Callout tone="success">Thank you — your gift has been recorded.</Callout>
            </div>
          ) : null}

          {giveUrl && (
            <a href={giveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent mt-7">
              Give on AdventistGiving
            </a>
          )}

          <div className="card mt-10 p-6 sm:p-8">
            <h3 className="font-serif text-lg font-semibold text-fg">Record your gift or pledge</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Telling us about a gift lets our treasurer count it toward the goal above. It is
              bookkeeping, not a payment — no card details are collected on this page.
            </p>
            <div className="mt-6">
              <DonateForm campaignId={c.id} backTo={`/fundraising/${c.slug}`} showExternalGive={false} />
            </div>
          </div>
        </Container>
      </section>

      <GivingFaq context="campaign" />

      {/* FINAL CTA. Extra bottom padding on small screens keeps the mobile give bar clear. */}
      <section className="bg-hero-denim text-white">
        <Container size="narrow" className="py-16 pb-28 text-center sm:py-20 lg:pb-20">
          <Eyebrow className="text-denim-300">Possess the land</Eyebrow>
          <h2 className="mt-3 text-display font-serif font-semibold text-white">
            Build a home for generations.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Every gift brings the day closer when our church family walks into a home of its own.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            {giveUrl ? (
              <a href={giveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent">
                Give to the Building Project
              </a>
            ) : (
              <a href="#give" className="btn btn-accent">Give to the Building Project</a>
            )}
            <ShareBar url={publicUrl} title={c.title} message={shareMessage} tone="dark" channels />
            {isBuildingCampaign && (
              <Link href="/fundraising/start" className="text-sm font-semibold text-denim-300 underline-offset-4 hover:text-white hover:underline">
                Or start your own fundraiser →
              </Link>
            )}
          </div>
        </Container>
      </section>

      <StickyGiveBar
        giveHref={giveUrl ?? "#give"}
        raisedLabel={c.goal > 0 ? `${formatUsd(totals.confirmed)} of ${formatUsd(c.goal)}` : `${formatUsd(totals.confirmed)} raised`}
        hideWhileVisible={[`#${HERO_SENTINEL}`, "footer"]}
      />
    </>
  );
}
