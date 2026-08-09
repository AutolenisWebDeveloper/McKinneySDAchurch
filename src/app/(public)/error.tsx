"use client";

import Link from "next/link";

/**
 * Segment-level error boundary for the public site. Because it lives inside the
 * (public) route group, a thrown page renders this UI *within* the site shell
 * (header, nav, footer stay put) instead of the full-screen root boundary — so
 * a visitor can still navigate everywhere else while one section recovers.
 */
export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-20 text-center">
      <div className="max-w-md">
        <p className="eyebrow mb-3">Something went wrong</p>
        <h1 className="text-display font-serif font-semibold text-fg">A momentary hiccup</h1>
        <p className="mt-4 text-muted">
          This page didn’t load as expected. Please try again in a moment — the rest of the site is still here.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
          <Link href="/" className="btn btn-outline">Return home</Link>
        </div>
      </div>
    </div>
  );
}
