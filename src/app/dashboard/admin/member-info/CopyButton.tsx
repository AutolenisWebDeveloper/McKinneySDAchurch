"use client";
import { useState } from "react";

/** Copy a value to the clipboard with lightweight feedback. */
export function CopyButton({ value, label = "Copy link" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable — the link is still visible to select */
        }
      }}
      className="btn btn-outline shrink-0 px-3 py-2 text-sm"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
