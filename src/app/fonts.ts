import { Noto_Serif, Noto_Sans } from "next/font/google";

/**
 * Typography follows the NAD / Adventist identity guidelines' open-source
 * recommendation: Noto Serif for display/headings (reverent, humanist) and
 * Noto Sans for UI/body (highly legible, excellent multilingual coverage for
 * the EN/ES toggle). Both are self-hosted by next/font, so no external font
 * host is contacted at runtime (keeps the strict CSP intact).
 */
export const serif = Noto_Serif({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
});

export const sans = Noto_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});
