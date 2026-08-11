"use client";

import { createElement, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scroll-reveal primitive — the site's one motion pattern for section/element
 * entrances. Dependency-free (IntersectionObserver + CSS), and safe by design:
 *
 *  - The hidden/animated state lives in CSS behind `@media (scripting: enabled)`
 *    and is fully removed under `prefers-reduced-motion` (see globals.css `.reveal`).
 *    So with JS disabled OR reduced motion on, content is simply visible — never
 *    hidden. No layout shift, no content trapped invisible.
 *  - Above-the-fold elements reveal immediately (observer fires on observe).
 *
 * Server components can render <Reveal> around server-rendered children; the
 * children pass straight through. Use `delayMs` to stagger siblings.
 */
type RevealTag = "div" | "section" | "article" | "li" | "figure" | "span" | "ul" | "ol";

export function Reveal({
  as = "div",
  children,
  className = "",
  delayMs = 0,
}: {
  as?: RevealTag;
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No IO support, or the user prefers reduced motion → show immediately.
    if (typeof IntersectionObserver === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return createElement(
    as,
    {
      ref,
      className: `reveal ${className}`.trim(),
      "data-shown": shown ? "true" : "false",
      style: delayMs ? { transitionDelay: `${delayMs}ms` } : undefined,
    },
    children,
  );
}
