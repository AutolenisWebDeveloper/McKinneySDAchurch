"use client";
import { useState } from "react";

/**
 * Copy-to-clipboard for a fundraiser's share link or an approved message. The action keeps its
 * name through the flow: the button says "Copy", and after it succeeds it says "Copied" —
 * never a different word for the same act. The confirmation is announced politely so a screen
 * reader hears it too, and there is always a readable, selectable fallback of the value itself.
 */
export function CopyField({ value, label, multiline = false }: { value: string; label: string; multiline?: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start gap-2">
        {multiline ? (
          <p className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg">{value}</p>
        ) : (
          <input
            readOnly
            value={value}
            aria-label={label}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-sm text-fg"
          />
        )}
        <button type="button" onClick={copy} className="btn btn-outline shrink-0 px-4 py-2 text-sm">
          {state === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      <p aria-live="polite" className="mt-1 min-h-[1.25rem] text-xs text-muted">
        {state === "copied" && `${label} copied to your clipboard.`}
        {state === "failed" && `Your browser blocked copying. Select the text above and copy it.`}
      </p>
    </div>
  );
}
