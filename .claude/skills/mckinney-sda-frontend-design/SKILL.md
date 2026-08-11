---
name: mckinney-sda-frontend-design
description: >-
  The communication-first UX and canonical design system for the McKinney SDA
  platform — the public website and the six-portal dashboard. Use whenever
  building or changing any page, portal view, component, form, navigation, or
  layout, or choosing colors/spacing/states. Enforces the brand design tokens,
  the portal shell, accessible forms, and the seven page-clarity questions.
  Trigger on: page, component, UI, layout, portal, navigation, form, design,
  brand color, responsive, mobile, accessibility, WCAG, empty state, loading.
---

# McKinney SDA — Frontend & UX

The platform is communication-first: every screen should make the next action obvious. Use the
one design system; do not fork it.

## What to inspect

- `tailwind.config.ts` + `src/app/globals.css` — the semantic, theme-aware design tokens.
- `src/components/portal/*` — `PortalChrome.tsx`, `PortalShell.tsx`, `portal-nav.ts`,
  `home-ui.tsx`, `NotificationBell.tsx`, `WorkItemDetail.tsx`.
- `src/components/*` — shared UI (`ui.tsx`, `page-ui.tsx`, `Brand.tsx`, `SiteHeader.tsx`,
  `SiteFooter.tsx`, `PublicShell.tsx`, `SearchBox.tsx`, `ThemeToggle.tsx`,
  `LanguageToggle.tsx`).
- `src/lib/i18n.ts` — EN/ES strings (the site is bilingual).

## Design system (use the tokens — never raw hex)

Colors are semantic Tailwind tokens backed by CSS variables (light/dark via `class`):
`bg`, `canvas`, `surface`, `surface-2`, `tint`, `fg`, `ink`, `muted`, `line`, `line-strong`,
`primary` / `primary-hover` / `on-primary`, `accent` / `accent-strong`, `ring`, plus the brand
**denim** scale (`denim-50…950`) and `gold` / `teal` / `bright-teal` / `orange`. Legacy
`sda.navy` / `sda.green` / `sda.gold` alias into the denim system. Fonts: `font-serif`
(headings) / `font-sans`. Radii/shadows are tokenized (`--radius`, `--shadow-*`).

- **Always** use these tokens and the shared components. Never hard-code colors, spacings, or
  a bespoke layout that bypasses the portal shell.
- Reuse `PortalChrome`/`PortalShell` for authenticated pages and `PublicShell` for public
  pages. New nav items go through `portal-nav.ts` (visibility is presentation-only; see
  `mckinney-sda-rbac-security`).

## The seven page-clarity questions

Every important page must answer:

1. **Where am I?** (clear title/breadcrumb, correct portal chrome)
2. **What matters here?** (primary content / status cards up top)
3. **What requires attention?** (task queue, unread, needs-info, follow-ups)
4. **What can I do?** (obvious primary action + quick actions)
5. **What happens after I act?** (confirmation journey, expected outcome)
6. **Who owns the next step?** (assignee / responsible role surfaced)
7. **How will I know the outcome?** (notification/status, deep link back)

## Required states & patterns

- Every data view has explicit **loading**, **empty**, and **error** states — never a blank or
  spinner-only screen.
- Forms: labeled controls, visible focus, inline validation, honeypots on public forms
  (visitor/prayer/baptism), and a clear success/confirmation state.
- Status is communicated with consistent status cards/badges (`ministry-badge.tsx`,
  `page-ui.tsx`), not ad-hoc styling.
- Responsive + mobile-first: usable mobile navigation, no horizontal overflow, tap targets and
  readable body text.
- Bilingual: user-facing strings go through `i18n.ts` (EN/ES), not hard-coded literals.

## Accessibility — target WCAG 2.2 AA

Build in: semantic landmarks, a skip-to-content link, `lang` set, keyboard operability with
visible focus, labeled controls, and sufficient contrast in **both** light and dark
(≥ 4.5:1 text). (The codebase's built-in baseline is 2.1 AA; target 2.2 AA for new work —
including focus-appearance, target-size, and dragging alternatives.) Verify keyboard-only flow
and screen-reader labels for any interactive component.

## Prohibited patterns (reject in review)

- Hard-coded hex/rgb colors or raw spacing instead of tokens.
- A bespoke page layout or nav that bypasses the portal/public shells.
- Pages missing loading/empty/error states, or forms without labels/visible focus.
- Color as the only signal, or contrast below AA in either theme.
- Hard-coded user-facing English that skips `i18n.ts`.
- Inventing new brand colors outside the token system.

## Verification requirements

- Keyboard-only pass on new interactive UI; check contrast in light and dark.
- `npm run typecheck` for the component; visually verify the seven questions are answered.
- For DB-backed pages, confirm `npm run build` still prerenders (see
  `mckinney-sda-production-readiness`).
