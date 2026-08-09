"use client";
import { useEffect, useState } from "react";

/** Informational notice. The site uses only essential cookies (login session + theme); no tracking. */
export function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(!/(?:^|; )cookieNotice=1/.test(document.cookie)); }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-lg">
        <p className="flex-1 text-sm text-muted">
          We use only essential cookies to keep you signed in and remember your theme. No tracking or advertising cookies.
        </p>
        <button
          onClick={() => { document.cookie = "cookieNotice=1; path=/; max-age=31536000; samesite=lax"; setShow(false); }}
          className="btn btn-primary px-4 py-2 text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
