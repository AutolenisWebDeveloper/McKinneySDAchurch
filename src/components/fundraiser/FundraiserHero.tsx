import { HeroShell } from "./HeroShell";
import { ShareBar } from "./ShareBar";

/**
 * The opening of a fundraiser's public page: whose fundraiser this is, what it is for, and
 * the two things a visitor can do about it — give, or pass it on.
 *
 * There is no portrait field on Fundraiser (`graphicUrl` is a campaign asset, not a photo of
 * the owner), so the owner is represented by an initials monogram rather than a stock avatar.
 * The graphic, when present, comes from an arbitrary host and is decorative only: it sits under
 * the denim scrims at low opacity, so a slow or broken image costs the page nothing.
 *
 * The denim/scrim treatment and the no-image fallback live in HeroShell, shared with the
 * campaign page so both openings are the same design.
 */

/** Up to two initials from a display name — "Johnson Family" → "JF", "Ada" → "A". */
export function monogram(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "•";
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined;
  const letters = [first, last]
    .map((p) => (p ? [...p][0] ?? "" : ""))
    .join("");
  return letters.toUpperCase() || "•";
}

export function FundraiserHero({
  title,
  displayName,
  ownerLabel,
  typeLabel,
  graphicUrl,
  giveHref,
  shareUrl,
  shareMessage,
  sentinelId,
}: {
  title: string;
  displayName: string;
  ownerLabel: string;
  /** Set for FAMILY / MINISTRY fundraisers; null for PERSONAL, where it adds nothing. */
  typeLabel: string | null;
  graphicUrl: string | null;
  giveHref: string;
  shareUrl: string;
  shareMessage: string;
  /** Watched by the mobile give bar, which stays out of the way while this CTA is on screen. */
  sentinelId: string;
}) {
  return (
    <HeroShell imageUrl={graphicUrl}>
      <div className="max-w-2xl">
        <p className="eyebrow text-denim-300">Building Project fundraiser</p>
        <h1 className="animate-rise mt-3 text-display font-serif font-semibold text-white">{title}</h1>

        <div className="animate-rise-2 mt-6 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 font-serif text-lg font-semibold text-white ring-1 ring-white/25"
          >
            {monogram(displayName)}
          </span>
          <p className="text-lg text-white/85">
            by {ownerLabel}
            {typeLabel && <span className="block text-sm text-white/60">{typeLabel} fundraiser</span>}
          </p>
        </div>

        <div className="animate-rise-3 mt-8 flex flex-wrap items-center gap-3">
          <a href={giveHref} className="btn btn-accent">Give to this fundraiser</a>
          <ShareBar url={shareUrl} title={title} message={shareMessage} tone="dark" />
        </div>
        <span id={sentinelId} aria-hidden="true" className="block h-px w-full" />
      </div>
    </HeroShell>
  );
}
