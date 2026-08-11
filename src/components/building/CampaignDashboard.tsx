import Link from "next/link";
import { Container } from "@/components/ui";
import { formatUsd } from "@/lib/construction";

/**
 * "Building Together" — the institutional capital-campaign dashboard. Keeps the
 * distinction the platform already draws: `raised` is the campaign total published
 * by leadership; `pledgedTotal` / `pledgeCount` summarize commitments. No funds are
 * processed here — giving is an external redirect to AdventistGiving.
 */
export function CampaignDashboard({
  raised,
  goal,
  pct,
  pledgedTotal,
  pledgeCount,
  giveUrl,
  targetLabel,
}: {
  raised: number;
  goal: number;
  pct: number;
  pledgedTotal: number;
  pledgeCount: number;
  giveUrl?: string | null;
  targetLabel?: string | null;
}) {
  const ticks = [25, 50, 75];
  return (
    <section id="campaign" className="scroll-mt-24 bg-hero-denim text-white">
      <div className="relative">
        <div className="glow-denim absolute inset-0" aria-hidden="true" />
        <Container className="relative py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow text-denim-300">The campaign</p>
            <h2 className="mt-3 text-display font-serif font-semibold text-white">Building together</h2>
            <p className="mt-4 text-lg leading-relaxed text-white/75">
              Every gift moves us closer to a permanent home. Here is where the campaign stands today.
            </p>
          </div>

          {/* Headline figures */}
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <Figure value={formatUsd(raised)} label="Raised" emphasis />
            <Figure value={formatUsd(goal)} label="Campaign goal" />
            <Figure value={`${pct}%`} label="Funded" />
          </div>

          {/* Progress visualization */}
          <div className="mt-10 rounded-2xl border border-white/12 bg-white/5 p-6 shadow-lg backdrop-blur-sm sm:p-8">
            <div className="relative">
              <div className="h-5 overflow-hidden rounded-full bg-white/12" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Campaign funding progress">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-gold transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
              {ticks.map((t) => (
                <span key={t} className="absolute top-0 h-5 w-px bg-white/25" style={{ left: `${t}%` }} aria-hidden="true" />
              ))}
            </div>
            <div className="mt-3 flex justify-between text-xs text-white/55">
              <span>$0</span><span>25%</span><span>50%</span><span>75%</span><span>{formatUsd(goal)}</span>
            </div>

            <dl className="mt-6 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-widest text-white/50">Pledged to date</dt>
                <dd className="mt-1 font-serif text-2xl font-semibold text-white">{formatUsd(pledgedTotal)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-white/50">Commitments</dt>
                <dd className="mt-1 font-serif text-2xl font-semibold text-white">{pledgeCount}</dd>
              </div>
              {targetLabel ? (
                <div>
                  <dt className="text-xs uppercase tracking-widest text-white/50">Target completion</dt>
                  <dd className="mt-1 font-serif text-2xl font-semibold text-white">{targetLabel}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {giveUrl ? (
              <a href={giveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent">Give to the building</a>
            ) : null}
            <a href="#pledge" className="btn btn-white">Make a pledge</a>
            <Link href="/construction#build-with-us" className="btn btn-ghost-light">See what you're building</Link>
          </div>
          <p className="mt-4 text-xs text-white/55">
            Figures are published by church leadership. Giving is processed securely through AdventistGiving; a pledge is a commitment, not a payment.
          </p>
        </Container>
      </div>
    </section>
  );
}

function Figure({ value, label, emphasis = false }: { value: string; label: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-2xl border p-6 ${emphasis ? "border-accent/40 bg-accent-strong/10" : "border-white/12 bg-white/5"}`}>
      <p className="font-serif text-4xl font-semibold text-white sm:text-5xl">{value}</p>
      <p className="mt-2 text-sm uppercase tracking-widest text-white/60">{label}</p>
    </div>
  );
}
