"use client";

import { useState } from "react";
import { shareTargets } from "@/lib/fundraising";

/**
 * Sharing a fundraiser, using only what the browser already provides — the Web Share sheet
 * where it exists, the clipboard where it doesn't, and a selectable field when neither is
 * available. No third-party share SDK is loaded: the CSP forbids it, and every channel here is
 * a plain link or a native API.
 *
 * Every target resolves to the fundraiser's own public page, so a gift arriving through any
 * channel lands on the same handoff and attributes the same way (see shareTargets).
 */
export function ShareBar({
  url,
  title,
  message,
  tone = "light",
  channels = false,
}: {
  url: string;
  title: string;
  message: string;
  /** "dark" sits on the denim bands; "light" on the page surface. */
  tone?: "light" | "dark";
  /** Also offer the individual channels and an explicit copy control. */
  channels?: boolean;
}) {
  const t = shareTargets(url, title, message);
  const [copied, setCopied] = useState(false);
  // Set only when the clipboard is unavailable or refuses — then the URL is offered as a
  // selectable field so sharing is still possible by hand.
  const [manual, setManual] = useState(false);

  const buttonClass = tone === "dark" ? "btn btn-ghost-light" : "btn btn-outline";
  const linkClass =
    tone === "dark"
      ? "rounded-full px-3 py-1.5 text-sm font-medium text-white/80 underline-offset-4 transition-colors hover:bg-white/10 hover:text-white"
      : "rounded-full px-3 py-1.5 text-sm font-medium text-primary underline-offset-4 transition-colors hover:bg-denim-50 hover:text-primary-hover";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(t.copy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setManual(true);
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: message, url: t.url });
        return;
      } catch (err) {
        // Dismissing the share sheet is a decision, not a failure — don't second-guess it by
        // copying instead. Any other error means the sheet never opened, so fall through.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await copyLink();
      return;
    }
    setManual(true);
  }

  return (
    <div className="inline-flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button type="button" onClick={share} className={buttonClass}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
          </svg>
          Share
        </button>

        {channels && (
          <>
            <a href={t.sms} className={linkClass}>Text</a>
            <a href={t.email} className={linkClass}>Email</a>
            <a href={t.whatsapp} target="_blank" rel="noopener noreferrer" className={linkClass}>WhatsApp</a>
            <a href={t.facebook} target="_blank" rel="noopener noreferrer" className={linkClass}>Facebook</a>
            <button type="button" onClick={copyLink} className={linkClass}>Copy link</button>
          </>
        )}
      </div>

      {/* Announced, not just shown — the confirmation is the only feedback a copy gives. */}
      <p aria-live="polite" className={`text-sm ${tone === "dark" ? "text-white/75" : "text-muted"}`}>
        {copied ? "Link copied." : ""}
      </p>

      {manual && (
        <label className="block text-sm">
          <span className={tone === "dark" ? "text-white/75" : "text-muted"}>Copy this link:</span>
          <input
            readOnly
            value={t.url}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 py-2 text-fg sm:w-96"
          />
        </label>
      )}
    </div>
  );
}
