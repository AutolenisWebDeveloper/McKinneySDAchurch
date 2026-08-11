---
name: mckinney-sda-giving-boundary
description: >-
  Enforces the absolute payment boundary for the McKinney SDA platform: the
  church does NOT process donations locally — giving routes externally to
  AdventistGiving. Use whenever code touches giving, donations, pledges,
  fundraising, campaigns, the Give page/button, reconciliation, or anything
  payment-adjacent. Rejects any local card/ACH/checkout/payment-token
  implementation. Trigger on: donate, giving, donation, pledge, fundraising,
  campaign, Stripe, PayPal, Square, checkout, payment, card, ACH, AdventistGiving.
---

# McKinney SDA — Giving Boundary (AdventistGiving only)

**Absolute boundary: McKinney SDA does not process donations locally.** All actual giving is
an external redirect to AdventistGiving. The app never handles card or bank details.

- Configured origin: env var **`ADVENTIST_GIVING_URL`** (e.g. the church's
  `https://adventistgiving.org/donate/<account>` link). The Give button/page hide when unset.
- `src/components/DonateForm.tsx` renders an outbound link to `env.ADVENTIST_GIVING_URL`
  (`target="_blank" rel="noopener noreferrer"`) with the copy "we never handle card details".

## What the local code is allowed to do (and only this)

- **Record a pledge or a reported gift** — `Donation` (`kind: PLEDGE | GIVEN`, `status:
  PENDING | CONFIRMED | CANCELLED`). `GIVEN` means "reported as given via AdventistGiving — no
  card data here."
- **Fundraising attribution** — `FundraisingCampaign`, `Fundraiser`, and the Wall-of-Fame /
  leaderboard math in `src/lib/fundraising.ts` (`confirmedTotal`, `campaignTotals`,
  `rankFundraisers`, `raiserBadge`). No money moves.
- **Reconcile externally-collected gifts** — `src/lib/giving-reconcile.ts` parses an
  AdventistGiving-style CSV export (`parseGivingCsv`) and matches gifts to PENDING donations
  (`matchGifts`) offline. Treasurer/admin only (`canManageGiving`).

Keep these three concepts distinct and clearly labeled: **pledge** ≠ **fundraising
attribution** ≠ **external donation reconciliation** — and none of them is payment processing.

## What to inspect

- `.env.example` / `src/env.ts` — `ADVENTIST_GIVING_URL` (optional, URL).
- `src/components/DonateForm.tsx`, the `give` route/page.
- `src/lib/fundraising.ts`, `src/lib/giving-reconcile.ts`.
- `prisma/schema.prisma` — `Donation`, `DonationKind`, `DonationStatus`,
  `FundraisingCampaign`, `Fundraiser`.

## Prohibited — reject any change that introduces these

- Stripe, PayPal, Square, Braintree, Adyen, or any payment gateway SDK/API.
- A local checkout flow, cart, or "pay now" that charges money.
- Card number / CVV / expiry fields, or any card input UI.
- Card storage, payment tokens/vaulting, or saved payment methods.
- ACH / bank-account collection or local recurring-payment scheduling.
- Any PCI-scoped infrastructure, webhook, or data model.
- Hard-coding a giving URL instead of reading `ADVENTIST_GIVING_URL`.

Any proposed implementation that crosses this boundary must be **rejected**, not adapted —
route the user to AdventistGiving instead.

## Verification requirements

- Confirm no payment SDK was added to `package.json` and no card/ACH field exists.
- Confirm the Give path is an external link derived from `ADVENTIST_GIVING_URL`.
- `src/lib/fundraising.ts` / `giving-reconcile.ts` changes stay pure and keep their Vitest
  coverage (`src/tests/fundraising.test.ts`, `giving-reconcile.test.ts`). Run `npm run test`.
