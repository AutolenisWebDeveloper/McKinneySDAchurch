import { Container } from "@/components/ui";
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
 * Most fundraisers will never set a graphic, so the no-graphic case is the normal one and has to
 * look finished rather than like a missing asset. It falls back to a church-supplied rendering
 * of the building being funded — the same class of decorative backdrop /construction and the
 * Explore band already use. It is scenery, not a claim: nothing is asserted about this
 * fundraiser that its own record does not say.
 */
const FALLBACK_BACKDROP = "/image/rendering-approach.jpg";

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
    <section data-dark-hero="true" className="hero-under-header relative overflow-hidden bg-hero-denim text-white">
      {/* Plain <img>: a supplied graphic lives on an arbitrary host, and the fallback is a
          local asset. Decorative either way — the headline carries the meaning. */}
      <img
        src={graphicUrl ?? FALLBACK_BACKDROP}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${graphicUrl ? "opacity-40" : "opacity-35"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-denim-950 via-denim-950/85 to-denim-900/45" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-t from-denim-950/70 via-transparent to-transparent" aria-hidden="true" />
      <div className="glow-denim absolute inset-0" aria-hidden="true" />

      <Container className="relative py-16 sm:py-24">
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
        </div>
      </Container>

      <span id={sentinelId} aria-hidden="true" className="block h-px w-full" />
    </section>
  );
}
