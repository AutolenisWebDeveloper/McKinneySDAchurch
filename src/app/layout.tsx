import "./globals.css";
import type { ReactNode } from "react";
import { serif, sans } from "./fonts";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://mckinneysda.org"),
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${serif.variable} ${sans.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: noFlash }} /></head>
      <body>{children}</body>
    </html>
  );
}
