"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const t = q.trim();
        if (t) router.push(`/search?q=${encodeURIComponent(t)}`);
      }}
    >
      <label htmlFor="site-search" className="sr-only">Search the site</label>
      <input
        id="site-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search…"
        className="rounded border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
      />
    </form>
  );
}
