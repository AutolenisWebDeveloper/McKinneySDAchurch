import localFont from "next/font/local";

/**
 * Typography follows the NAD / Adventist identity guidelines' open-source
 * recommendation: Noto Serif for display/headings (reverent, humanist) and
 * Noto Sans for UI/body (highly legible, great multilingual coverage for the
 * EN/ES toggle).
 *
 * Self-hosted from committed woff2 files (latin subset, weights 400/500/600/700)
 * in ./fonts, so the BUILD never contacts Google Fonts. This removes the
 * intermittent `next/font/google` fetch failure in CI (Turbopack could not resolve
 * the Google font module when the runner had no network to fonts.googleapis.com)
 * and keeps the strict CSP intact at runtime.
 *
 * Source: @fontsource/noto-serif + @fontsource/noto-sans v5.3.0 (latin). To refresh,
 * re-copy files/noto-*-latin-{400,500,600,700}-normal.woff2 from those packages
 * into ./fonts (see ./fonts/README.md).
 */
export const serif = localFont({
  variable: "--font-serif",
  display: "swap",
  src: [
    { path: "./fonts/noto-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-serif-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/noto-serif-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/noto-serif-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

export const sans = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [
    { path: "./fonts/noto-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/noto-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/noto-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});
