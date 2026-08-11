# Building Project — cinematic film

The Building Project hero (`/construction`) auto-stages a cinematic architectural
film when the file below exists in this folder. Until then, the hero shows the
poster rendering — there is no broken request and no code change is needed to
turn the film on: **just drop the file here and redeploy.**

## Expected files

| File | Purpose | Required |
|------|---------|----------|
| `building-cinematic.mp4` | The film (H.264/AAC MP4) — broadest browser support | Yes, to activate |
| `building-cinematic.webm` | Optional smaller VP9/AV1 version, served first to capable browsers | Optional |
| `building-cinematic-poster.jpg` | First-frame poster shown while the film loads / if video is blocked | Optional (falls back to `/image/rendering-approach.jpg`) |

## Guidance

- The film plays **muted, looped, autoplay, `playsInline`** as a background — design
  it to read with no sound and no controls. Keep the left third calm; the headline
  sits there over a denim scrim.
- Target a web-optimized export (≈1080p, ~8–15 Mbps, a few MB to low tens of MB).
  Large files hurt load time; the poster shows until enough has buffered.
- The same film can be reused for the homepage teaser, YouTube, and fundraising
  presentations (a single cinematic asset, per the project brief).

## Larger files / external hosting

If the film is too large to commit to the repo, host it (Vercel Blob, a CDN, etc.)
and set its URL instead of committing the file — see the resolver in
`src/app/(public)/construction/page.tsx` (`resolveHeroMedia`), which also honors the
`BUILDING_CINEMATIC_URL` environment variable when set.
