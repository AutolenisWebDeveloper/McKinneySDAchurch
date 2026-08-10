"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Item = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  deepLink: string | null;
  readAt: string | null;
  createdAt: string;
};

/** Bell + unread badge + dropdown list. Reads the shared Notification service via /api/notifications. */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { items: Item[]; unread: number };
        setItems(data.items);
        setUnread(data.unread);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && items === null) void load();
  }, [open, items, load]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAll() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setItems((prev) => prev?.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })) ?? prev);
    setUnread(0);
  }

  async function openItem(i: Item) {
    if (!i.readAt) {
      await fetch(`/api/notifications/${i.id}/read`, { method: "POST" });
      setUnread((u) => Math.max(0, u - 1));
    }
    if (i.deepLink) window.location.href = i.deepLink;
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-fg transition-colors hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-ring/40"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 2a5 5 0 00-5 5v2.6l-1.3 2.6A1 1 0 004.6 14h10.8a1 1 0 00.9-1.4L15 9.6V7a5 5 0 00-5-5zM8 16a2 2 0 004 0H8z" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -right-1 -top-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] font-bold leading-4 text-white"
            aria-hidden="true"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
          role="menu"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-semibold text-fg">Notifications</span>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-xs font-medium text-primary hover:text-primary-hover">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && <p className="px-4 py-6 text-center text-sm text-muted">Loading…</p>}
            {!loading && items && items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted">You&rsquo;re all caught up.</p>
            )}
            {!loading &&
              items?.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => openItem(i)}
                  className={`block w-full border-b border-line px-4 py-3 text-left last:border-0 hover:bg-surface-2 ${
                    i.readAt ? "" : "bg-denim-50/60"
                  }`}
                  role="menuitem"
                >
                  <span className="flex items-start gap-2">
                    {!i.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-fg">{i.title}</span>
                      {i.body && <span className="mt-0.5 block text-xs text-muted line-clamp-2">{i.body}</span>}
                      <span className="mt-0.5 block text-[0.7rem] text-muted">
                        {new Date(i.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
