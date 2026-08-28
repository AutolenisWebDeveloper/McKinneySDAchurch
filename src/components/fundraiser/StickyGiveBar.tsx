"use client";

import { useEffect, useState } from "react";

/**
 * The mobile give bar. On a phone the hero CTA scrolls away within a screen or two, and the
 * rail that keeps giving in view on desktop is stacked back into the flow — so the offer needs
 * somewhere to live.
 *
 * `hideWhileVisible` names the things the bar must not sit on top of: the hero CTA (where the
 * offer is already on screen) and the site footer (which the bar would otherwise cover once the
 * page is scrolled to the end). They are observed rather than measured from scroll offsets,
 * which keeps the bar correct at any viewport height and through content of any length.
 *
 * Hidden means *not rendered*: a bar faded to zero opacity still swallows taps and still counts
 * as visible to assistive tech.
 */
export function StickyGiveBar({
  giveHref,
  raisedLabel,
  hideWhileVisible,
}: {
  giveHref: string;
  /** Short progress readout, e.g. "$4,750 raised". */
  raisedLabel: string;
  /** CSS selectors; the bar stays hidden while any matched element is on screen. */
  hideWhileVisible: string[];
}) {
  const [show, setShow] = useState(false);
  const selectorKey = hideWhileVisible.join("|");

  useEffect(() => {
    const els = selectorKey
      .split("|")
      .flatMap((sel) => [...document.querySelectorAll(sel)]);

    // With nothing to hide against — or no IntersectionObserver — leave the bar off rather
    // than pin it over the page for the whole visit.
    if (!els.length || typeof IntersectionObserver === "undefined") return;

    const onScreen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) onScreen.add(e.target);
        else onScreen.delete(e.target);
      }
      setShow(onScreen.size === 0);
    });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [selectorKey]);

  if (!show) return null;

  // z-30 deliberately: the cookie consent notice is also fixed to the bottom of the screen, at
  // z-40, and has to win. Once it is dismissed this bar has that space to itself.
  return (
    <div
      className="animate-rise fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 shadow-lg backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      data-testid="sticky-give-bar"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="min-w-0 truncate text-sm font-semibold tabular-nums text-fg">{raisedLabel}</p>
        <a href={giveHref} className="btn btn-accent shrink-0">Give now</a>
      </div>
    </div>
  );
}
