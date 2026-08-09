"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        const t = q.trim();
        if (t) router.push(`/search?q=${encodeURIComponent(t)}`);
      }}
    >
      <label htmlFor="site-search" className="sr-only">Search the site</label>
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="9" cy="9" r="6" /><path strokeLinecap="round" d="M17 17l-3.5-3.5" />
      </svg>
      <input
        id="site-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search…"
        className="w-40 rounded-full border border-line-strong bg-surface py-2 pl-9 pr-3 text-sm text-fg shadow-sm transition-all placeholder:text-muted/70 focus:w-52 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
      />
    </form>
  );
}
