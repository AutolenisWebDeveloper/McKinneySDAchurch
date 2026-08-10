"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "../SignOutButton";
import { NotificationBell } from "./NotificationBell";
import { portalFromPath } from "@/lib/portal";
import type { PortalKey } from "@/lib/roles";
import type { NavItem } from "./portal-nav";

export type PortalMeta = { key: PortalKey; label: string; route: string };

/**
 * Shared portal chrome (one design system for all six portals, §18). The active portal is
 * derived from the URL, so switching portals is plain navigation and nav state never desyncs.
 * Responsive: fixed sidebar on desktop, slide-over drawer on mobile.
 */
export function PortalChrome({
  userName,
  roleLabel,
  portals,
  navByPortal,
  initialUnread,
  children,
}: {
  userName: string;
  roleLabel: string;
  portals: PortalMeta[];
  navByPortal: Record<string, NavItem[]>;
  initialUnread: number;
  children: ReactNode;
}) {
  const pathname = usePathname() || "/dashboard";
  const active: PortalKey = portalFromPath(pathname) ?? portals[0]?.key ?? "member";
  const nav = navByPortal[active] ?? [];
  const activeLabel = portals.find((p) => p.key === active)?.label ?? "Member";
  const [drawer, setDrawer] = useState(false);

  const navList = (
    <nav aria-label={`${activeLabel} portal`} className="flex flex-col gap-0.5 text-sm">
      {nav.map((i) => {
        const current = i.href === pathname;
        const cls = `rounded-lg px-3 py-2 transition-colors ${
          current ? "bg-denim-800 text-white" : "text-fg hover:bg-surface-2"
        }`;
        return i.external ? (
          <a key={i.href} href={i.href} className={cls}>
            {i.label}
          </a>
        ) : (
          <Link key={i.href} href={i.href} className={cls} onClick={() => setDrawer(false)} aria-current={current ? "page" : undefined}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );

  const switcher =
    portals.length > 1 ? (
      <div className="mt-4">
        <p className="px-3 text-[0.7rem] font-semibold uppercase tracking-widest text-muted">Switch portal</p>
        <div className="mt-1 flex flex-col gap-0.5 text-sm">
          {portals.map((p) => (
            <Link
              key={p.key}
              href={p.route}
              onClick={() => setDrawer(false)}
              aria-current={p.key === active ? "true" : undefined}
              className={`flex items-center justify-between rounded-lg px-3 py-1.5 transition-colors ${
                p.key === active ? "text-primary font-semibold" : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              {p.label}
              {p.key === active && <span className="text-[0.65rem] uppercase tracking-wide">active</span>}
            </Link>
          ))}
        </div>
      </div>
    ) : null;

  const sidebarInner = (
    <div className="flex h-full flex-col p-4">
      <Link href="/" className="font-serif text-lg font-semibold text-denim-800 dark:text-gold">
        McKinney SDA
      </Link>
      <p className="mt-0.5 text-xs text-muted">
        {userName} · <span className="font-medium">{roleLabel}</span>
      </p>
      <div className="mt-4 flex-1 overflow-y-auto">
        {navList}
        {switcher}
      </div>
      <div className="mt-2 border-t border-line pt-3">
        <SignOutButton />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-fg focus:outline-none focus:ring-2 focus:ring-ring/40"
          aria-label="Open navigation"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M3 5h14a1 1 0 000-2H3a1 1 0 000 2zm14 4H3a1 1 0 000 2h14a1 1 0 000-2zm0 6H3a1 1 0 100 2h14a1 1 0 100-2z" clipRule="evenodd" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-fg">{activeLabel} Portal</span>
        <NotificationBell initialUnread={initialUnread} />
      </header>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} aria-hidden="true" />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[80vw] border-r border-line bg-surface shadow-xl">
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg hover:bg-surface-2"
                aria-label="Close navigation"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 10-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            {sidebarInner}
          </div>
        </div>
      )}

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-surface lg:block">
          {sidebarInner}
        </aside>

        <div className="min-w-0 flex-1">
          {/* Desktop header */}
          <header className="hidden items-center justify-between border-b border-line bg-surface px-6 py-3 lg:flex">
            <h1 className="text-sm font-semibold text-fg">{activeLabel} Portal</h1>
            <NotificationBell initialUnread={initialUnread} />
          </header>
          <main id="main" className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
