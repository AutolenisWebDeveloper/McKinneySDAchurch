"use client";
import { useEffect, useState } from "react";

/** Informational notice. The site uses only essential cookies (login session + theme); no tracking. */
export function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(!/(?:^|; )cookieNotice=1/.test(document.cookie)); }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-sda-navy text-white text-sm">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-3">
        <p className="flex-1">We use only essential cookies to keep you signed in and remember your theme. No tracking or advertising cookies.</p>
        <button onClick={() => { document.cookie = "cookieNotice=1; path=/; max-age=31536000; samesite=lax"; setShow(false); }} className="rounded bg-white text-sda-navy px-3 py-1">Got it</button>
      </div>
    </div>
  );
}
