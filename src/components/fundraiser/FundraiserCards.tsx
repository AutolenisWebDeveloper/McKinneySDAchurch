import Link from "next/link";
import { formatUsd, fundraiserProgress } from "@/lib/fundraising";
import { Container, Eyebrow } from "@/components/ui";
import { monogram } from "./FundraiserHero";

/**
 * The people carrying the campaign. A flat list of names and totals reads like a ledger; these
 * are the church family, so each one gets a card with its own progress — which is also what
 * makes a visitor click through to a page that can actually tell them a story.
 *
 * Donor identity never appears here: only a fundraiser's own title, owner label and confirmed
 * total, all of which are already public on that fundraiser's page.
 */
export type FundraiserCard = {
  slug: string;
  title: string;
  displayName: string;
  goal: number;
  raised: number;
};

export function FundraiserCards({
  fundraisers,
  startHref,
}: {
  fundraisers: FundraiserCard[];
  /** Shown only when this campaign is the one the creation flow actually targets. */
  startHref: string | null;
}) {
  if (!fundraisers.length) return null;

  return (
    <section className="border-y border-line bg-surface">
      <Container className="py-16 sm:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <Eyebrow className="mb-3">Carrying the campaign</Eyebrow>
            <h2 className="text-title font-serif font-semibold text-fg">Member fundraisers</h2>
            <p className="mt-3 text-muted">
              Families, ministries and individuals raising toward the same building — each with
              their own page, their own goal, and their own reasons for giving.
            </p>
          </div>
          {startHref && (
            <Link href={startHref} className="btn btn-outline shrink-0">Start your own</Link>
          )}
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fundraisers.map((f) => {
            const p = fundraiserProgress(f.raised, f.goal);
            return (
              <li key={f.slug}>
                <Link
                  href={`/f/${f.slug}`}
                  className="card card-hover group flex h-full flex-col p-6 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-denim-100 font-serif font-semibold text-denim-800 dark:bg-white/10 dark:text-denim-200"
                    >
                      {monogram(f.displayName)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-serif text-lg font-semibold text-fg">{f.title}</span>
                      <span className="block truncate text-sm text-muted">{f.displayName}</span>
                    </span>
                  </div>

                  <div className="mt-5 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-serif text-2xl font-semibold tabular-nums text-denim-800 dark:text-gold">
                        {formatUsd(p.raised)}
                      </span>
                      {p.goal > 0 && <span className="text-sm tabular-nums text-muted">of {formatUsd(p.goal)}</span>}
                    </p>
                    {p.goal > 0 && (
                      <div
                        className="mt-3 h-2 overflow-hidden rounded-full bg-denim-100 dark:bg-white/10"
                        role="progressbar"
                        aria-valuenow={p.pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuetext={`${formatUsd(p.raised)} of ${formatUsd(p.goal)}, ${p.pct} percent`}
                        aria-label={`${f.title} progress`}
                      >
                        <div
                          className={`h-full rounded-full ${p.goalReached ? "bg-gold" : "bg-accent-strong"}`}
                          style={{ width: `${Math.max(p.barPct, p.raised > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    See their page
                    <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
