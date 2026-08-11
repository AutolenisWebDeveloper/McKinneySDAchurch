# Self-hosted fonts

These are the web fonts for the site, committed to the repo and loaded via
`next/font/local` in `../fonts.ts`. They are **not** fetched from Google Fonts at
build time — that fetch intermittently failed in CI (the Turbopack `security-e2e`
build could not resolve the `next/font/google` module when the runner had no
network to `fonts.googleapis.com`). Self-hosting removes that dependency entirely.

## Files

Latin subset, weights 400 / 500 / 600 / 700:

- `noto-serif-latin-{400,500,600,700}-normal.woff2` — display / headings
- `noto-sans-latin-{400,500,600,700}-normal.woff2` — UI / body

## Provenance & refreshing

Sourced from the `@fontsource` packages (which repackage the official Google Fonts
webfonts, OFL-licensed), version **5.3.0**. To refresh or add weights:

```bash
npm install --no-save @fontsource/noto-sans @fontsource/noto-serif
cp node_modules/@fontsource/noto-sans/files/noto-sans-latin-{400,500,600,700}-normal.woff2 src/app/fonts/
cp node_modules/@fontsource/noto-serif/files/noto-serif-latin-{400,500,600,700}-normal.woff2 src/app/fonts/
```

Then mirror the weight list in `src/app/fonts.ts`. Noto is licensed under the SIL
Open Font License 1.1.
