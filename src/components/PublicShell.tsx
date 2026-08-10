import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { getLocale, t } from "@/lib/i18n";
import { getSetting } from "@/lib/site";
import { env } from "@/env";

export async function PublicShell({ children }: { children: ReactNode }) {
  const livestream = (await getSetting("livestream_url")) ?? null;
  const locale = await getLocale();
  const giveUrl = env.ADVENTIST_GIVING_URL ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">{t(locale, "common.skip_to_content")}</a>
      <SiteHeader livestream={livestream} giveUrl={giveUrl} locale={locale} />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter livestream={livestream} giveUrl={giveUrl} locale={locale} />
    </div>
  );
}
