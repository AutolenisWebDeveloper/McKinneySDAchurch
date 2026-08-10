# Brand assets — McKinney Seventh-day Adventist Church

This folder holds the church's visual identity assets. The site follows the
**North American Division (NAD) / Seventh-day Adventist identity guidelines**.

## Color

- **Primary — Denim Blue, PMS 302** ≈ `#004F71`. This is the anchor color used
  across the site (`--denim-600` token). Preferred logo lockup is the **white
  church symbol on denim**; **denim-on-white** is the approved alternate.
- Supporting palette: warm neutrals (sand / stone) + white. No other brand hues.

## The official Adventist symbol

`adventist-symbol.svg` in this folder is the **official Seventh-day Adventist
symbol** (open Bible + cross + flame, white on denim), converted to web-ready
SVG from the official vector artwork. The source vector files (Illustrator /
EPS, in PMS, RGB, and CMYK) are kept under `/public/image/`
(`symbol_square_*.ai` / `.eps`) alongside the web export `symbol_square.svg`.

If you ever need to re-export or replace it, follow the identity guidelines:

1. Use the **official vector artwork** — do **not** redraw, recolor, rotate,
   distort, stretch, or add effects (shadows/gradients) to it.
2. Keep the **®** on the logotype/symbol.
3. Preserve **clear space** around the mark (the site reserves padding for this).
4. Preferred: **white symbol on denim**. On light surfaces use the
   **denim-on-white** version.

### How to install the real asset

Drop the official file in this folder **using the same filename** and it will
appear everywhere automatically:

- `adventist-symbol.svg` — used in the header, footer, and hero.

If you have separate white and denim versions, name them
`adventist-symbol-white.svg` / `adventist-symbol-denim.svg` and update
`src/components/Brand.tsx` to point at them (one-line change, commented there).

## Architectural drawings (already included)

The church's architect drawings are committed under `/public/building-plans/`
(`master-plan`, `ground-floor-plan`, `mep-plan` — each as a web preview `.jpg`
plus the full `.pdf`) and are shown on the **Building Project** page with the
project facts (site 219,290 sq ft; built-up 10,938 sq ft; total floor 76,443 sq
ft; future site at Stickhorse Ln & CR 330, Collin County, TX). Replace those
files (same names) to update the drawings.

## Building renderings & photos (optional, enhances the site)

The home and building-campaign pages have image slots that light up when photos
exist. To feature the new building, add renderings via the admin dashboard
(Construction → photos), or drop files here and reference them:

- `building-hero.jpg` — wide exterior rendering (used as an optional home/hero backdrop).

Everything degrades gracefully: with no photos, the pages show a designed denim
treatment instead of broken images.
