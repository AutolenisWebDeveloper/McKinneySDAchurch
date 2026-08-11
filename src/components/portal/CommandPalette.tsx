"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "./icons";

export type CommandItem = { href: string; label: string; group: string; icon?: IconName; external?: boolean };

/**
 * ⌘K / Ctrl-K command palette. Searches the actor's AUTHORIZED destinations (the same nav the
 * sidebar renders — already filtered by portal access) and offers a secure escape hatch into
 * the server-side record search at /dashboard/search, which re-checks permissions and never
 * exposes unauthorized records. We deliberately do NOT query members/households from the client
 * here — record search stays behind its existing authorization gate.
 */
export function CommandPalette({
  open,
  onClose,
  items,
  portalLabel,
}: {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  portalLabel: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((i) => `${i.label} ${i.group}`.toLowerCase().includes(needle));
  }, [q, items]);

  // Row count includes the trailing "search records" action when a query is present.
  const showRecordSearch = q.trim().length > 0;
  const rowCount = filtered.length + (showRecordSearch ? 1 : 0);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      // Focus after paint so the dialog is in the DOM.
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  // Lock background scroll while the palette is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  function go(item: CommandItem) {
    onClose();
    if (item.external) window.location.href = item.href;
    else router.push(item.href);
  }

  function recordSearch() {
    onClose();
    router.push(`/dashboard/search?q=${encodeURIComponent(q.trim())}`);
  }

  function commit(index: number) {
    if (showRecordSearch && index === filtered.length) return recordSearch();
    const item = filtered[index];
    if (item) go(item);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(rowCount, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + Math.max(rowCount, 1)) % Math.max(rowCount, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] sm:pt-[16vh]">
      <div className="absolute inset-0 bg-denim-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-lg"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon name="search" className="h-5 w-5 shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${portalLabel}…`}
            aria-label={`Search ${portalLabel}`}
            className="w-full bg-transparent py-4 text-base text-fg outline-none placeholder:text-muted"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[0.65rem] font-medium text-muted sm:block">
            Esc
          </kbd>
        </div>

        <ul ref={listRef} className="max-h-[52vh] overflow-y-auto py-2" role="listbox" aria-label="Results">
          {filtered.map((item, i) => (
            <li key={`${item.href}-${item.label}`} role="option" aria-selected={active === i}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(item)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  active === i ? "bg-tint text-fg" : "text-fg hover:bg-surface-2"
                }`}
              >
                <Icon name={item.icon ?? "dot"} className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="shrink-0 text-xs text-muted">{item.group}</span>
              </button>
            </li>
          ))}

          {showRecordSearch && (
            <li role="option" aria-selected={active === filtered.length}>
              <button
                type="button"
                onMouseEnter={() => setActive(filtered.length)}
                onClick={recordSearch}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  active === filtered.length ? "bg-tint text-fg" : "text-fg hover:bg-surface-2"
                }`}
              >
                <Icon name="search" className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate">
                  Search records for “{q.trim()}”
                </span>
                <span className="shrink-0 text-xs text-muted">Directory &amp; more</span>
              </button>
            </li>
          )}

          {rowCount === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted">No destinations match “{q.trim()}”.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
