"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { NotificationBell } from "./NotificationBell";
import { CommandPalette, type CommandItem } from "./CommandPalette";
import { Icon } from "./icons";
import { portalFromPath } from "@/lib/portal";
import type { PortalKey } from "@/lib/roles";
import { navItemsFlat, quickCreateActions, type NavGroup } from "./portal-nav";

export type PortalMeta = { key: PortalKey; label: string; route: string };

const RAIL_KEY = "mck.nav.rail";

/**
 * Shared portal chrome — one design system for all six portals. The active portal is derived
 * from the URL, so switching portals is plain navigation and nav state never desyncs.
 *
 * Structure: a calm deep-navy sidebar (collapsible to an icon rail) with grouped, labelled
 * navigation on the left; a header with breadcrumbs, ⌘K command search, a role-aware Create
 * menu, notifications, and a profile menu (which owns the portal switcher, help, and sign out).
 * On narrow viewports the sidebar becomes a full-height drawer opened from a top app bar.
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
  navByPortal: Record<string, NavGroup[]>;
  initialUnread: number;
  children: ReactNode;
}) {
  const pathname = usePathname() || "/dashboard";
  const active: PortalKey = portalFromPath(pathname) ?? portals[0]?.key ?? "member";
  const groups = useMemo(() => navByPortal[active] ?? [], [navByPortal, active]);
  const activeLabel = portals.find((p) => p.key === active)?.label ?? "Member";
  const createActions = useMemo(() => quickCreateActions(active), [active]);

  const [drawer, setDrawer] = useState(false);
  const [rail, setRail] = useState(false);
  const [palette, setPalette] = useState(false);

  // Restore the persisted rail (icon-only) preference after mount to avoid hydration mismatch.
  useEffect(() => {
    try {
      setRail(localStorage.getItem(RAIL_KEY) === "1");
    } catch {
      /* localStorage may be unavailable */
    }
  }, []);
  const toggleRail = useCallback(() => {
    setRail((r) => {
      const next = !r;
      try {
        localStorage.setItem(RAIL_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Global ⌘K / Ctrl-K opens the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const paletteItems: CommandItem[] = useMemo(
    () =>
      groups.flatMap((g) =>
        g.items.map((i) => ({ href: i.href, label: i.label, group: g.label, icon: i.icon, external: i.external })),
      ),
    [groups],
  );

  // Exactly one destination is "current": the longest nav href that the path matches (exact or
  // as a parent segment), so /email/templates highlights Email Templates, not Member Email too.
  const activeHref = useMemo(() => {
    let best: string | null = null;
    for (const g of groups) {
      for (const it of g.items) {
        if (it.external) continue;
        const match = pathname === it.href || (it.href !== "/dashboard" && pathname.startsWith(`${it.href}/`));
        if (match && (best === null || it.href.length > best.length)) best = it.href;
      }
    }
    return best;
  }, [groups, pathname]);
  const isCurrent = useCallback((href: string) => href === activeHref, [activeHref]);

  const crumb = useMemo(() => matchCrumb(pathname, groups), [pathname, groups]);

  return (
    <div className="min-h-screen bg-bg">
      {/* Mobile top app bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-fg focus:outline-none focus:ring-2 focus:ring-ring/40"
          aria-label="Open navigation"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold text-fg">McKinney SDA</p>
          <p className="truncate text-[0.7rem] text-muted">{activeLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-fg focus:outline-none focus:ring-2 focus:ring-ring/40"
            aria-label="Search"
          >
            <Icon name="search" className="h-5 w-5" />
          </button>
          <NotificationBell initialUnread={initialUnread} />
        </div>
      </header>

      {drawer && (
        <MobileDrawer
          onClose={() => setDrawer(false)}
          userName={userName}
          roleLabel={roleLabel}
          groups={groups}
          portals={portals}
          active={active}
          isCurrent={isCurrent}
          pathname={pathname}
          onSearch={() => {
            setDrawer(false);
            setPalette(true);
          }}
        />
      )}

      <div className="lg:flex">
        {/* Desktop navy sidebar */}
        <Sidebar
          rail={rail}
          toggleRail={toggleRail}
          groups={groups}
          isCurrent={isCurrent}
          userName={userName}
          roleLabel={roleLabel}
        />

        <div className="min-w-0 flex-1">
          {/* Desktop header */}
          <header className="sticky top-0 z-20 hidden items-center justify-between gap-4 border-b border-line bg-surface/95 px-6 py-2.5 backdrop-blur lg:flex">
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
              <Link href={portals.find((p) => p.key === active)?.route ?? "/dashboard"} className="shrink-0 font-medium text-muted hover:text-fg">
                {activeLabel}
              </Link>
              {crumb.map((c, i) => (
                <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
                  <Icon name="chevron" className="h-3.5 w-3.5 shrink-0 text-muted/60" />
                  {c.href ? (
                    <Link href={c.href} className="truncate text-muted hover:text-fg">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="truncate font-semibold text-fg">{c.label}</span>
                  )}
                </span>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setPalette(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <Icon name="search" className="h-4 w-4" />
                <span>Search</span>
                <kbd className="rounded border border-line px-1 text-[0.65rem] font-medium">⌘K</kbd>
              </button>
              {createActions.length > 0 && <CreateMenu actions={createActions} />}
              <NotificationBell initialUnread={initialUnread} />
              <ProfileMenu userName={userName} roleLabel={roleLabel} portals={portals} active={active} />
            </div>
          </header>

          <main id="main" className="mx-auto max-w-content px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} items={paletteItems} portalLabel={activeLabel} />
    </div>
  );
}

/* ------------------------------------------------------------------ Sidebar */

function Sidebar({
  rail,
  toggleRail,
  groups,
  isCurrent,
  userName,
  roleLabel,
}: {
  rail: boolean;
  toggleRail: () => void;
  groups: NavGroup[];
  isCurrent: (href: string) => boolean;
  userName: string;
  roleLabel: string;
}) {
  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-denim-800 bg-denim-900 text-denim-100 lg:flex ${
        rail ? "w-[76px]" : "w-[264px]"
      }`}
    >
      <div className={`flex items-center gap-2 px-4 py-4 ${rail ? "justify-center px-0" : ""}`}>
        <Link href="/" className="flex items-center gap-2 text-white" title="McKinney SDA — public site">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/90 font-serif text-sm font-bold text-denim-950">
            M
          </span>
          {!rail && (
            <span className="min-w-0 leading-tight">
              <span className="block font-serif text-base font-semibold text-white">McKinney SDA</span>
              <span className="block truncate text-[0.7rem] text-denim-300">Seventh-day Adventist</span>
            </span>
          )}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((g, gi) => (
          <NavGroupBlock key={`${g.label}-${gi}`} group={g} primary={gi === 0} rail={rail} isCurrent={isCurrent} />
        ))}
      </div>

      <div className="border-t border-denim-800 p-3">
        {!rail && (
          <div className="mb-2 flex items-center gap-2 px-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-denim-700 text-xs font-semibold text-white">
              {initials(userName)}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium text-white">{userName}</span>
              <span className="block truncate text-[0.7rem] text-denim-300">{roleLabel}</span>
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={toggleRail}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-denim-200 transition-colors hover:bg-white/5 hover:text-white ${
            rail ? "justify-center" : ""
          }`}
          aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
          title={rail ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name="chevron" className={`h-4 w-4 transition-transform ${rail ? "" : "rotate-180"}`} />
          {!rail && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function NavGroupBlock({
  group,
  primary,
  rail,
  isCurrent,
}: {
  group: NavGroup;
  primary: boolean;
  rail: boolean;
  isCurrent: (href: string) => boolean;
}) {
  return (
    <div className={primary ? "mb-1 mt-1" : "mt-4"}>
      {!primary &&
        (rail ? (
          <div className="mx-auto my-2 h-px w-6 bg-denim-800" aria-hidden="true" />
        ) : (
          <p className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-denim-300">
            {group.label}
          </p>
        ))}
      <ul className="flex flex-col gap-0.5">
        {group.items.map((item) => {
          const current = isCurrent(item.href);
          const cls = `group relative flex items-center gap-3 rounded-lg py-2 text-sm transition-colors ${
            rail ? "justify-center px-0" : "px-2"
          } ${current ? "bg-white/10 font-medium text-white" : "text-denim-100 hover:bg-white/5 hover:text-white"}`;
          const inner = (
            <>
              {current && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-bright-teal" aria-hidden="true" />}
              <Icon name={item.icon ?? "dot"} className={`h-[18px] w-[18px] shrink-0 ${current ? "text-bright-teal" : "text-denim-300 group-hover:text-white"}`} />
              {!rail && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
            </>
          );
          return (
            <li key={`${item.href}-${item.label}`}>
              {item.external ? (
                <a href={item.href} className={cls} title={rail ? item.label : undefined} aria-label={rail ? item.label : undefined}>
                  {inner}
                </a>
              ) : (
                <Link
                  href={item.href}
                  className={cls}
                  title={rail ? item.label : undefined}
                  aria-label={rail ? item.label : undefined}
                  aria-current={current ? "page" : undefined}
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ Header menus */

function CreateMenu({ actions }: { actions: { href: string; label: string; icon?: import("./icons").IconName }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(() => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg bg-denim-800 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-denim-700"
      >
        <Icon name="plus" className="h-4 w-4" />
        <span className="hidden sm:inline">Create</span>
        <Icon name="chevron" className="h-3.5 w-3.5 rotate-90 opacity-80" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1.5 shadow-lg">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-sm text-fg transition-colors hover:bg-surface-2"
            >
              <Icon name={a.icon ?? "dot"} className="h-4 w-4 text-primary" />
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileMenu({
  userName,
  roleLabel,
  portals,
  active,
}: {
  userName: string;
  roleLabel: string;
  portals: PortalMeta[];
  active: PortalKey;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(() => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-denim-800 text-xs font-semibold text-white transition-colors hover:bg-denim-700"
      >
        {initials(userName)}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-fg">{userName}</p>
            <p className="truncate text-xs text-muted">{roleLabel}</p>
          </div>
          {portals.length > 1 && (
            <div className="border-b border-line py-1.5">
              <p className="px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-muted">Switch portal</p>
              {portals.map((p) => (
                <Link
                  key={p.key}
                  href={p.route}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-4 py-2 text-sm text-fg transition-colors hover:bg-surface-2"
                >
                  {p.label}
                  {p.key === active && <Icon name="approvals" className="h-4 w-4 text-primary" />}
                </Link>
              ))}
            </div>
          )}
          <div className="py-1.5">
            <Link
              href="/dashboard/support"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-fg transition-colors hover:bg-surface-2"
            >
              <Icon name="help" className="h-4 w-4 text-muted" />
              Help &amp; support
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-2"
            >
              <Icon name="logout" className="h-4 w-4 text-muted" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Mobile drawer */

function MobileDrawer({
  onClose,
  userName,
  roleLabel,
  groups,
  portals,
  active,
  isCurrent,
  pathname,
  onSearch,
}: {
  onClose: () => void;
  userName: string;
  roleLabel: string;
  groups: NavGroup[];
  portals: PortalMeta[];
  active: PortalKey;
  isCurrent: (href: string) => boolean;
  pathname: string;
  onSearch: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll, focus the panel, trap Tab, and restore focus on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-denim-950/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="absolute left-0 top-0 flex h-full w-[86vw] max-w-[320px] flex-col bg-denim-900 text-denim-100 shadow-xl outline-none"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-serif text-base font-semibold text-white">McKinney SDA</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-denim-100 hover:bg-white/10"
            aria-label="Close navigation"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={onSearch}
            className="flex w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-denim-100 hover:bg-white/15"
          >
            <Icon name="search" className="h-4 w-4" />
            Search…
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {groups.map((g, gi) => (
            <div key={`${g.label}-${gi}`} className={gi === 0 ? "mt-1" : "mt-4"}>
              {gi !== 0 && (
                <p className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-denim-300">{g.label}</p>
              )}
              <ul className="flex flex-col gap-0.5">
                {g.items.map((item) => {
                  const current = isCurrent(item.href);
                  const cls = `flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors ${
                    current ? "bg-white/10 font-medium text-white" : "text-denim-100 hover:bg-white/5 hover:text-white"
                  }`;
                  const inner = (
                    <>
                      <Icon name={item.icon ?? "dot"} className={`h-[18px] w-[18px] shrink-0 ${current ? "text-bright-teal" : "text-denim-300"}`} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </>
                  );
                  return (
                    <li key={`${item.href}-${item.label}`}>
                      {item.external ? (
                        <a href={item.href} className={cls}>
                          {inner}
                        </a>
                      ) : (
                        <Link href={item.href} className={cls} onClick={onClose} aria-current={current ? "page" : undefined}>
                          {inner}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {portals.length > 1 && (
            <div className="mt-4">
              <p className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-denim-300">Switch portal</p>
              <ul className="flex flex-col gap-0.5">
                {portals.map((p) => (
                  <li key={p.key}>
                    <Link
                      href={p.route}
                      onClick={onClose}
                      className={`flex items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors ${
                        p.key === active ? "text-white" : "text-denim-200 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {p.label}
                      {p.key === active && <span className="text-[0.6rem] uppercase tracking-wide text-bright-teal">active</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-denim-800 p-3">
          <div className="mb-2 flex items-center gap-2 px-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-denim-700 text-xs font-semibold text-white">
              {initials(userName)}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium text-white">{userName}</span>
              <span className="block truncate text-[0.7rem] text-denim-300">{roleLabel}</span>
            </span>
          </div>
          <Link
            href={`/dashboard/support?from=${encodeURIComponent(pathname)}`}
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-denim-100 hover:bg-white/5 hover:text-white"
          >
            <Icon name="help" className="h-4 w-4" />
            Help &amp; support
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-denim-100 hover:bg-white/5 hover:text-white"
          >
            <Icon name="logout" className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ helpers */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Best-effort breadcrumb tail: the matched section, plus a "Details" crumb for deeper routes. */
function matchCrumb(pathname: string, groups: NavGroup[]): { label: string; href?: string }[] {
  const items = navItemsFlat(groups).filter((i) => !i.external);
  let best: { href: string; label: string } | null = null;
  for (const i of items) {
    if (pathname === i.href || pathname.startsWith(`${i.href}/`)) {
      if (!best || i.href.length > best.href.length) best = { href: i.href, label: i.label };
    }
  }
  if (!best) return [];
  const tail: { label: string; href?: string }[] = [{ label: best.label, href: pathname === best.href ? undefined : best.href }];
  if (pathname !== best.href) tail.push({ label: "Details" });
  return tail;
}

/** Close a popover on outside-click or Escape. Returns a ref to attach to the popover root. */
function useDismiss<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return ref;
}
