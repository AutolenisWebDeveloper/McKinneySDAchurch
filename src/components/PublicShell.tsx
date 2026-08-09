import Link from "next/link";
import type { ReactNode } from "react";
import { publicNav } from "./nav";
import { SearchBox } from "./SearchBox";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { getLocale } from "@/lib/i18n";
import { getSetting } from "@/lib/site";
import { env } from "@/env";

export async function PublicShell({ children }: { children: ReactNode }) {
  const livestream = await getSetting("livestream_url");
  const locale = await getLocale();
  const giveUrl = env.ADVENTIST_GIVING_URL;
  const ext = "noopener noreferrer";

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <Link href="/" className="font-semibold text-sda-navy dark:text-sda-gold">McKinney SDA</Link>
          <nav aria-label="Primary" className="hidden md:flex gap-4 text-sm">
            {publicNav.map((i) => (
              <Link key={i.href} href={i.href} className="hover:underline">{i.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <SearchBox />
            {livestream ? <a href={livestream} target="_blank" rel={ext} className="rounded bg-sda-navy text-white px-3 py-1 text-sm">Watch Live</a> : null}
            {giveUrl ? <a href={giveUrl} target="_blank" rel={ext} className="rounded bg-sda-gold text-sda-navy px-3 py-1 text-sm font-medium">Give</a> : null}
            <LanguageToggle locale={locale} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <footer className="border-t border-black/10 dark:border-white/10 mt-12">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted flex flex-wrap gap-x-8 gap-y-2">
          <span>McKinney Seventh-day Adventist Church</span>
          <Link href="/beliefs" className="hover:underline">Beliefs</Link>
          <Link href="/church-manual" className="hover:underline">Church Manual</Link>
          <Link href="/search" className="hover:underline">Search</Link>
          {giveUrl ? <a href={giveUrl} target="_blank" rel={ext} className="hover:underline">Give</a> : null}
        </div>
      </footer>
    </>
  );
}
