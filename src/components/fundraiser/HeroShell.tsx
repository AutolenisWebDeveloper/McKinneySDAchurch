import type { ReactNode } from "react";
import { Container } from "@/components/ui";

/**
 * The one cinematic hero treatment shared by the campaign page and the individual fundraiser
 * page: a church-supplied image under denim scrims, sized so white text holds AA over any
 * photograph, with the brand glow on top.
 *
 * Both routes render the same building project, so they get the same opening — a second hero
 * built beside this one would be the start of a parallel design system.
 *
 * Most campaigns and fundraisers never set their own image, so the no-image case is the normal
 * one and has to look finished rather than like a missing asset: it falls back to a
 * church-supplied rendering of the building being funded. Decorative either way — the headline
 * carries the meaning, and a slow or broken image costs the page nothing.
 *
 * The give-bar sentinel is NOT placed here: each hero puts it beside its own call to action, so
 * the bar appears when the buttons leave the screen rather than when the section does.
 */
export const HERO_FALLBACK = "/image/rendering-approach.jpg";

export function HeroShell({
  imageUrl,
  children,
  size = "default",
}: {
  imageUrl?: string | null;
  children: ReactNode;
  /** "tall" gives the campaign page a fuller opening; "default" suits a personal page. */
  size?: "default" | "tall";
}) {
  const pad = size === "tall" ? "py-20 sm:py-28 lg:py-32" : "py-16 sm:py-24";
  return (
    <section data-dark-hero="true" className="hero-under-header relative overflow-hidden bg-hero-denim text-white">
      {/* Plain <img>: a supplied image may live on an arbitrary host, and the fallback is local. */}
      <img
        src={imageUrl || HERO_FALLBACK}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${imageUrl ? "opacity-40" : "opacity-35"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-denim-950 via-denim-950/85 to-denim-900/45" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-t from-denim-950/75 via-transparent to-transparent" aria-hidden="true" />
      <div className="glow-denim absolute inset-0" aria-hidden="true" />

      <Container className={`relative ${pad}`}>{children}</Container>
    </section>
  );
}
