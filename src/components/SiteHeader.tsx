"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navGroups } from "./nav";
import { Brand } from "./Brand";
import { SearchBox } from "./SearchBox";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";

const EXT = "noopener noreferrer";

export function SiteHeader({
  livestream,
  giveUrl,
  locale,
}: {
  livestream: string | null;
  giveUrl: string | null;
  locale: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null); // desktop dropdown label
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setOpen(null);
    setMobileOpen(false);
  }, [pathname]);

  // Close on outside click / Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(null); setMobileOpen(false); }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-bg/85 backdrop-blur-md border-b border-line shadow-sm"
          : "bg-bg/60 backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-content px-4 sm:px-6">
        <div className="flex h-[4.5rem] items-center gap-4">
          <Brand size="md" />

          {/* Desktop nav */}
          <nav aria-label="Primary" className="ml-auto hidden lg:block" ref={navRef}>
            <ul className="flex items-center gap-1">
              {navGroups.map((group) => {
                const groupActive = group.items.some((i) => isActive(i.href));
                const isOpen = open === group.label;
                return (
                  <li key={group.label} className="relative">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                      onClick={() => setOpen(isOpen ? null : group.label)}
                      className={`nav-link flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                        groupActive ? "text-primary" : "hover:text-primary"
                      }`}
                      data-active={groupActive}
                    >
                      {group.label}
                      <svg
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
                      >
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {isOpen && (
                      <div
                        className="absolute left-1/2 top-full z-50 mt-2 w-80 -translate-x-1/2 animate-rise"
                        role="menu"
                        aria-label={group.label}
                      >
                        <div className="card overflow-hidden p-2 shadow-lg">
                          {group.items.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              role="menuitem"
                              className={`block rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2 ${
                                isActive(item.href) ? "bg-surface-2" : ""
                              }`}
                            >
                              <span className="block text-sm font-semibold text-fg">{item.label}</span>
                              {item.desc && (
                                <span className="mt-0.5 block text-xs text-muted">{item.desc}</span>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2 lg:ml-2">
            <div className="hidden xl:block"><SearchBox /></div>
            {livestream && (
              <a
                href={livestream}
                target="_blank"
                rel={EXT}
                className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-fg transition-colors hover:text-primary sm:inline-flex"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                Watch Live
              </a>
            )}
            {giveUrl && (
              <a href={giveUrl} target="_blank" rel={EXT} className="btn btn-accent hidden sm:inline-flex px-4 py-2 text-sm">
                Give
              </a>
            )}
            <div className="hidden lg:flex items-center gap-1">
              <LanguageToggle locale={locale} />
              <ThemeToggle />
            </div>

            {/* Mobile toggle */}
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-fg lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden" id="mobile-menu">
          <div className="fixed inset-0 top-[4.5rem] z-30 bg-ink-900/20" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="relative z-40 max-h-[calc(100vh-4.5rem)] overflow-y-auto border-t border-line bg-bg px-4 pb-8 pt-4 shadow-lg">
            <div className="mb-4"><SearchBox /></div>
            <nav aria-label="Mobile" className="space-y-5">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="eyebrow mb-2 px-1">{group.label}</p>
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`block rounded-lg px-3 py-2.5 text-[0.95rem] font-medium transition-colors hover:bg-surface-2 ${
                            isActive(item.href) ? "bg-surface-2 text-primary" : "text-fg"
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
              {giveUrl && <a href={giveUrl} target="_blank" rel={EXT} className="btn btn-accent flex-1">Give</a>}
              {livestream && <a href={livestream} target="_blank" rel={EXT} className="btn btn-outline flex-1">Watch Live</a>}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <LanguageToggle locale={locale} />
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
