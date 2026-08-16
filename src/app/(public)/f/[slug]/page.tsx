import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { env } from "@/env";
import { formatUsd, verifiedTotal, fundraiserProgress } from "@/lib/fundraising";
import { FUNDRAISER_TYPE_LABEL } from "@/lib/fundraiser-workflow";
import { Container } from "@/components/ui";
import { ProgressMeter } from "@/components/portal/fundraiser-ui";

export const dynamic = "force-dynamic";

/**
 * The public fundraising page (§12). Shareable without any Member Portal access, and identical
 * for a member-owned and a Supporter-owned fundraiser.
 *
 * What it deliberately does NOT contain: donor identities, per-donor amounts, and anything
 * from the Member Portal. The query below selects no donor field at all — only confirmed
 * amounts — so donor information cannot reach this page even by accident.
 *
 * Only an ACTIVE fundraiser is reachable; every other status 404s, which is what keeps a
 * pending, rejected, closed, or archived page off the public web.
 */

async function loadPublic(slug: string) {
  return safe(
    prisma.fundraiser.findFirst({
      where: { slug, status: "ACTIVE" },
      select: {
        id: true, slug: true, title: true, displayName: true, story: true, graphicUrl: true,
        type: true, personalGoal: true, targetDate: true, referralToken: true,
        household: { select: { familyName: true } },
        ministry: { select: { name: true } },
        campaign: { select: { title: true, status: true } },
        donations: { where: { status: "CONFIRMED" }, select: { amount: true, status: true } },
      },
    }),
    null,
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = await loadPublic(slug);
  if (!f) return { title: "Fundraiser not found" };
  return {
    title: f.title,
    description: `Support the McKinney SDA Building Project through ${f.displayName}'s fundraiser.`,
    openGraph: {
      title: f.title,
      description: f.story?.slice(0, 200) ?? "Help build our future home.",
      url: `${env.NEXT_PUBLIC_SITE_URL}/f/${f.slug}`,
      ...(f.graphicUrl ? { images: [f.graphicUrl] } : {}),
    },
  };
}

export default async function FundraiserPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = await loadPublic(slug);
  if (!f || f.campaign.status !== "ACTIVE") notFound();

  const progress = fundraiserProgress(verifiedTotal(f.donations), f.personalGoal);
  const ownerLabel =
    f.type === "FAMILY" ? f.household?.familyName ?? f.displayName
    : f.type === "MINISTRY" ? f.ministry?.name ?? f.displayName
    : f.displayName;

  return (
    <>
      <section data-dark-hero="true" className="hero-under-header relative overflow-hidden bg-hero-denim text-white">
        {f.graphicUrl ? (
          // Plain <img>: the source is an admin-approved campaign asset on an arbitrary host.
          <img src={f.graphicUrl} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-denim-950 via-denim-950/85 to-denim-900/50" aria-hidden="true" />
        <div className="glow-denim absolute inset-0" aria-hidden="true" />
        <Container size="narrow" className="relative py-14 sm:py-20">
          <p className="eyebrow text-denim-300">Building Project fundraiser</p>
          <h1 className="mt-2 text-display font-serif font-semibold text-white">{f.title}</h1>
          <p className="mt-3 text-lg text-white/80">
            by {ownerLabel}
            {f.type !== "PERSONAL" && <span className="text-white/60"> · {FUNDRAISER_TYPE_LABEL[f.type]}</span>}
          </p>
        </Container>
      </section>

      <Container size="narrow" className="py-12 sm:py-16">
        <div className="card p-6 sm:p-8">
          <ProgressMeter progress={progress} size="large" label={`${f.title} progress`} />
          {f.targetDate && (
            <p className="mt-4 text-sm text-muted">
              Aiming for {f.targetDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <a href={`/f/${f.slug}/give`} className="btn btn-accent">Support the Building Project</a>
            <Link href={`/fundraising/start?ref=${encodeURIComponent(f.referralToken)}`} className="btn btn-outline">
              Start your own fundraiser
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted">
            Giving is handled securely by AdventistGiving. The church never sees or stores your card details.
          </p>
        </div>

        {f.story && (
          <section className="mt-10">
            <h2 className="text-title font-serif font-semibold text-fg">Why this matters</h2>
            <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-fg/90">{f.story}</p>
          </section>
        )}

        <section className="mt-10 rounded-xl border border-line bg-surface-2 p-6">
          <h2 className="font-serif text-lg font-semibold text-fg">About the Building Project</h2>
          <p className="mt-2 text-muted">
            McKinney Seventh-day Adventist Church is building a permanent home. Every gift given through this
            page counts toward {ownerLabel}&rsquo;s goal once our treasurer has reconciled it
            {progress.goal > 0 && <> — {formatUsd(progress.raised)} of {formatUsd(progress.goal)} so far</>}.
          </p>
          <p className="mt-3">
            <Link href="/construction" className="font-semibold text-primary hover:text-primary-hover">
              See the Building Project →
            </Link>
          </p>
        </section>
      </Container>
    </>
  );
}
