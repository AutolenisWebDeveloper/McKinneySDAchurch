import "./globals.css";
import type { ReactNode } from "react";
import { serif, sans } from "./fonts";
import { getLocale } from "@/lib/i18n";

// Vercel may provide NEXT_PUBLIC_SITE_URL / VERCEL_URL as a bare host (no scheme);
// normalize so `new URL()` never throws during the build.
const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "https://mckinneysda.vercel.app";
const siteUrl = /^https?:\/\//.test(rawSiteUrl) ? rawSiteUrl : `https://${rawSiteUrl}`;

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "McKinney Seventh-day Adventist Church",
    template: "%s · McKinney SDA Church",
  },
  description:
    "A Christ-centered Seventh-day Adventist congregation in McKinney, Texas. Join us for worship each Sabbath — all are welcome.",
  openGraph: {
    title: "McKinney Seventh-day Adventist Church",
    description:
      "A Christ-centered Seventh-day Adventist congregation in McKinney, Texas. Join us for worship each Sabbath.",
    type: "website",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#061a24" },
  ],
};

// Set theme before paint to avoid a flash of the wrong mode.
const noFlash =
  "(function(){try{var m=document.cookie.match(/(?:^|; )theme=(dark|light)/);if(m&&m[1]==='dark')document.documentElement.classList.add('dark');}catch(e){}})();";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale(); // reflect the chosen language for screen readers (WCAG 3.1.1)
  return (
    <html lang={locale} suppressHydrationWarning className={`${serif.variable} ${sans.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: noFlash }} /></head>
      <body>{children}</body>
    </html>
  );
}
