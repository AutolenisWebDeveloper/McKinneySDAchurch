import { HeroShell } from "./HeroShell";
import { ShareBar } from "./ShareBar";

/**
 * The campaign opening. Where an individual fundraiser leads with a person, a campaign leads
 * with the building itself and the church's standing against its goal — so the headline figures
 * sit in the hero rather than waiting in a card further down.
 *
 * A figure whose value would be hollow is dropped rather than shown as a zero: an empty stat
 * rail reads as a broken page, and "0 gifts" discourages the first one.
 */
export function CampaignHero({
  title,
  description,
  imageUrl,
  raisedLabel,
  goalLabel,
  pct,
  giftCount,
  fundraiserCount,
  giveUrl,
  shareUrl,
  shareMessage,
  sentinelId,
}: {
  title: string;
  description: string | null;
  imageUrl: string | null;
  raisedLabel: string;
  goalLabel: string | null;
  pct: number | null;
  giftCount: number;
  fundraiserCount: number;
  /** External AdventistGiving URL, or null when it is not configured. */
  giveUrl: string | null;
  shareUrl: string;
  shareMessage: string;
  sentinelId: string;
}) {
  const stats = [
    { label: "Raised so far", value: raisedLabel },
    ...(goalLabel ? [{ label: "Campaign goal", value: goalLabel }] : []),
    ...(giftCount > 0 ? [{ label: giftCount === 1 ? "Gift" : "Gifts", value: String(giftCount) }] : []),
    ...(fundraiserCount > 0
      ? [{ label: fundraiserCount === 1 ? "Member fundraiser" : "Member fundraisers", value: String(fundraiserCount) }]
      : []),
  ];

  return (
    <HeroShell imageUrl={imageUrl} size="tall">
      <div className="max-w-3xl">
        <p className="eyebrow text-denim-300">The Building Project</p>
        <h1 className="animate-rise mt-3 text-display font-serif font-semibold text-white">{title}</h1>
        {description && (
          <p className="animate-rise-2 mt-5 max-w-2xl text-lg leading-relaxed text-white/85">{description}</p>
        )}

        <div className="animate-rise-3 mt-9 flex flex-wrap items-center gap-3">
          {giveUrl ? (
            <a href={giveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent">
              Give to the Building Project
            </a>
          ) : (
            <a href="#give" className="btn btn-accent">Give to the Building Project</a>
          )}
          <ShareBar url={shareUrl} title={title} message={shareMessage} tone="dark" />
        </div>
        <span id={sentinelId} aria-hidden="true" className="block h-px w-full" />
      </div>

      {/* The headline figures, on the hero rather than below it: a visitor should know where the
          church stands before they decide whether to keep reading. */}
      {stats.length > 0 && (
        <dl className="animate-rise-4 mt-12 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-6 border-t border-white/15 pt-8 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-xs font-semibold uppercase tracking-widest text-denim-300">{s.label}</dt>
              <dd className="mt-1.5 font-serif text-2xl font-semibold tabular-nums text-white sm:text-3xl">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {pct !== null && (
        <div className="mt-8 max-w-3xl">
          <div
            className="h-2.5 overflow-hidden rounded-full bg-white/15"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${raisedLabel}${goalLabel ? ` of ${goalLabel}` : ""}, ${pct} percent`}
            aria-label="Campaign progress"
          >
            <div
              className="h-full rounded-full bg-gold transition-[width] duration-700 motion-reduce:transition-none"
              style={{ width: `${Math.max(pct, 1.5)}%` }}
            />
          </div>
          <p className="mt-2.5 text-sm tabular-nums text-white/70">
            {pct}% of the way there
          </p>
        </div>
      )}
    </HeroShell>
  );
}
