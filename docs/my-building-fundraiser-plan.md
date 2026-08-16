# My Building Fundraiser — implementation plan

Spec of record: `SPEC_Member_Dashboard_My_Building_Fundraiser.md` (§ references below).
This document is the Phase‑1 deliverable: the repo reconciliation map, the data-model delta,
the authorization matrix, the slicing, and the open decisions.

## 1. What already exists (search result)

A peer‑to‑peer fundraising system is already in the repository. **Everything below extends it;
nothing parallel is created.**

| Concern | Existing home |
|---|---|
| Campaign / fundraiser / gift models | `prisma/schema.prisma` — `FundraisingCampaign`, `Fundraiser`, `Donation` (`DonationStatus PENDING\|CONFIRMED\|CANCELLED`, `DonationKind PLEDGE\|GIVEN`) |
| Fundraising math | `src/lib/fundraising.ts` (`confirmedTotal`, `campaignTotals`, `rankFundraisers`, `raiserBadge`, `slugify`) + `src/lib/construction.ts` (`raisedPct`, `formatUsd`) |
| Member fundraiser surface | `src/app/dashboard/fundraisers/` (route already mapped to the member portal in `src/lib/portal.ts` and linked from `src/components/portal/portal-nav.ts`) |
| Public fundraiser page | `src/app/(public)/f/[slug]/page.tsx` |
| Public campaign pages | `src/app/(public)/fundraising/` |
| Admin campaign surface | `src/app/dashboard/admin/campaigns/` |
| Building Project admin | `src/app/dashboard/admin/construction/` |
| AdventistGiving reconciliation | `src/lib/giving-reconcile.ts`, `src/app/api/admin/giving-reconcile/route.ts`, `src/app/dashboard/admin/campaigns/[id]/reconcile/` |
| Authorization | `src/lib/rbac.ts` (+ `roles.ts`) |
| Notifications | `src/lib/notify.ts` + `Notification` |
| Email | `src/lib/email-templated.ts` + `src/lib/email-registry.ts` |
| Audit | `src/lib/audit.ts` + `AuditLog` |
| Tokens | `src/lib/crypto.ts` — `newToken()`/`sha256` (single‑use, digest‑only) and `signToken`/`verifyToken` (HMAC) |
| QR | `src/lib/qr.ts` |
| Design system | `tailwind.config.ts` + `src/app/globals.css` tokens; `src/components/portal/home-ui.tsx`, `src/components/page-ui.tsx`, `src/components/ui.tsx` |

The brand palette named in the brief is already the token set in `globals.css`
(`#003B5C` denim‑800, `#008B95` teal, `#00A3AD` bright‑teal, `#D86018` orange,
`#F2B441` gold, `#53636E` slate, `#F6F9FA` canvas, AA‑safe link teal `#007A85`,
AA‑safe orange fill `--orange-strong`). No new brand colors are introduced.

## 2. Reconciliation map (§20 checklist → real paths)

| §20 item | Path | New/Extend |
|---|---|---|
| Member Dashboard container | `src/app/dashboard/member/page.tsx` | extend (mount widget) |
| Widget + all status states | `src/components/portal/FundraiserWidget.tsx` | new component, existing shell |
| Routes: Building Project / My Fundraiser | `src/components/portal/portal-nav.ts` → `/construction`, `/dashboard/fundraisers` | extend |
| Manage workspace (Overview/Share/Activity) | `src/app/dashboard/fundraisers/[id]/page.tsx` | new page on existing route root |
| Creation flow | `src/app/dashboard/fundraisers/new/page.tsx` | new page on existing route root |
| Public fundraiser page | `src/app/(public)/f/[slug]/page.tsx` | extend |
| Giving handoff | `src/app/(public)/f/[slug]/give/route.ts` | new route handler |
| Public start (referral‑aware) | `src/app/(public)/fundraising/start/` | new page under existing group |
| Status enum + guards | `src/lib/fundraiser-workflow.ts` (pure) + `src/lib/fundraisers.ts` (service) | new modules in existing `src/lib` convention |
| Edit rules / goal floor | `src/lib/fundraiser-workflow.ts` | new (pure, tested) |
| Type eligibility | `src/lib/fundraiser-workflow.ts` + `src/lib/rbac.ts` | extend rbac |
| Household "manage fundraising" | `Member.canManageHouseholdFundraising` + `Household.primaryContactId` | extend |
| Primary‑fundraiser rule | `src/lib/fundraiser-workflow.ts` `pickPrimary()` | new (pure, tested) |
| Notification events | `src/lib/notify.ts` (category `fundraiser`) + `src/lib/email-registry.ts` keys `fundraiser.*` | extend |
| Verified amounts | `Donation.status = CONFIRMED` only; `src/lib/fundraising.ts` | extend |
| Referral token capture | `Fundraiser.referralToken` / `referredByFundraiserId` | extend |
| Admin queue / campaign view | `src/app/dashboard/admin/construction/fundraisers/` | new page under the existing Building Project admin |
| Content library | `src/app/dashboard/admin/construction/library/` + `FundraisingAsset` | new |
| Attribution confirmation | `src/app/dashboard/admin/campaigns/[id]/reconcile/` + `src/lib/giving-reconcile.ts` | extend |
| Supporter identity | `Supporter`, `SupporterLoginToken` | new models |
| Supporter auth | `src/lib/supporter-auth.ts` using existing `crypto.ts` | new module, existing primitives |
| Supporter → Member migration | admin action in `src/lib/fundraisers.ts` | new action |

## 3. Data-model delta

New enums: `FundraiserType (PERSONAL|FAMILY|MINISTRY)`,
`FundraiserStatus (DRAFT|PENDING_REVIEW|CHANGES_REQUESTED|REJECTED|ACTIVE|CLOSED|ARCHIVED)`,
`FundraisingAssetKind (MESSAGE|GRAPHIC)`.

`Fundraiser` gains: `type`, `status`, `supporterId`, `householdId`, `ministryId`, `targetDate`,
`graphicUrl`, `referralToken` (unique), `referredByFundraiserId` (self‑relation), `reviewNote`,
`submittedAt`/`reviewedAt`/`reviewedById`/`approvedAt`/`closedAt`, `milestoneNotified`,
`updatedAt`. The legacy boolean `active` is **replaced** by `status` with a backfill
(`active → ACTIVE`, `!active → CLOSED`) inside the migration before the column is dropped.

New models: `Supporter` (email‑keyed, no `User`, no `Member`), `SupporterLoginToken`
(digest‑only, single‑fundraiser scope), `GivingHandoff` (candidate attribution — **no donor
identity, no amount**), `FundraisingAsset` (approved share copy + campaign graphics).

`Member` gains `canManageHouseholdFundraising`.

**No denormalized `verifiedRaised` column.** Verified dollars are always derived from
`Donation` rows with `status = CONFIRMED`, so there is one source of truth and no drift.

## 4. Authorization matrix (enforced in `src/lib/rbac.ts` + service guards)

| Actor | Create PERSONAL | Create FAMILY | Create MINISTRY | Edit | Share/view | Approve/Reject | Close/Archive |
|---|---|---|---|---|---|---|---|
| Member (active, adult, authenticated) | yes | only with `canManageHouseholdFundraising` or household primary contact | no | own fundraisers | own + household + ministry ones they belong to | no | own → Close only |
| Household member without the permission | — | no | — | no | view/share the family fundraiser | no | no |
| MINISTRY_HEAD (in scope) | yes | per household rule | yes, for a ministry in scope | ministry fundraisers in scope | yes | no | Close in scope |
| Supporter | yes (own, PERSONAL only) | no | no | own only, via magic‑link scope | own only | no | no |
| ADMIN / PASTOR | yes | yes | yes | any | any | yes | yes |
| TREASURER | as member | as member | as member | no | yes (admin campaign view) | no | no; owns attribution confirmation |

Minors can never own or manage a fundraiser (`Member.isMinor` → denied), and a fundraiser's
public page never renders minor data.

## 5. Open decisions (§5, §15) — defaults applied, flagged for sign‑off

1. **Member eligibility to create a Personal fundraiser (§5).** Default applied: *any
   authenticated, non‑minor member whose Member record is not deactivated.* Implemented in one
   place (`canCreateFundraiser`) so it can be tightened without touching UI.
2. **Supporter → Member migration trigger (§15).** Default applied: *admin‑initiated.* An email
   match is surfaced to the admin as a suggestion; nothing migrates automatically, because
   silently transferring ownership on an email match is an account‑takeover risk.

## 6. Slices

1. Data model + status engine + pure math (+ tests)
2. Service layer + rbac + notifications/email registry
3. Member dashboard widget + manage workspace
4. Creation flow + approval
5. Public page + share/QR/referral + giving handoff
6. Supporter identity + magic link
7. Admin queue + content library + attribution confirmation
