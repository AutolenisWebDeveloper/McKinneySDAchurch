"use client";

import { useState } from "react";

/** Share via the Web Share API where available, otherwise copy the link to the clipboard. */
export function ShareButton({ url, title, className = "" }: { url: string; title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav && "share" in nav) {
      try {
        await nav.share({ title, url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button type="button" onClick={onShare} className={className} aria-live="polite">
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
      </svg>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
