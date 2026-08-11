# Safeguarding audit — legacy youth/minor surfaces

**Date:** 2026-08-11 · **Scope:** every surface that could expose, contact, or grant access
involving a minor — routes, server actions, navigation, search, exports, email, and APIs — plus
the legacy `YouthClubRegistration` model and the `canScheduleWithMinors` gate.

This audit answers the standing requirement to either **prove those surfaces are inaccessible**
or **retire unused legacy functionality safely**. It maps to the permanent safeguarding boundary
in `CLAUDE.md` and the `mckinney-sda-safeguarding` skill.

## Summary

| Area | Finding | Status |
|---|---|---|
| `YouthClubRegistration` model + `YouthClub` enum + `Member.youthClubs` | No route/action/query/seed/script ever referenced it — dead schema. Table could never be populated by the app. | **Retired** (migration `20260811140000`) |
| `canScheduleWithMinors` gate | Defensive helper; no runtime scheduler currently calls it. Kept as a guard for future authorized youth work. | Retained (documented) |
| Portal search (`/dashboard/search`) | Filters `isMinor: false`. | Guarded ✓ |
| Public search (`/api/search`) | Public scope only — indexes no members/visitors/transfers/prayer/pastoral/private docs. | Guarded ✓ |
| Directory (`/dashboard/directory`) | `adultWhere()`; minors never included; `directoryVisible` defaults false. | Guarded ✓ |
| Members export (`/api/members/export`) | `adultWhere()` at query **and** `toMemberCsv` throws `MINOR_IN_EXPORT` if any minor slips through. | Guarded ✓ (unit + E2E) |
| Clerk reconcile (`/api/clerk/reconcile`) | `adultWhere()`. | Guarded ✓ |
| Care scan cron (`/api/cron/care-scan`) | `where: { isMinor: false, … }`. | Guarded ✓ |
| Email/marketing (`src/lib/segments.ts`, admin email actions) | Every segment nested under `adultWhere`; `buildRecipientList` also drops minors (defense in depth). | Guarded ✓ |
| Add minor (`/dashboard/household` `addMinor`) | Requires an authenticated member; forces `guardianMemberId = actor.memberId`, `isMinor: true`, `directoryVisible: false`; records `GuardianConsent`; audited. A member can only add a minor under their **own** guardianship. | Guarded ✓ |
| Self-registration (`/auth/register`) | Collects no minor/DOB/age path; accounts are adult and admin-approved. Minors cannot self-register. | Guarded ✓ |

## Retirement: `YouthClubRegistration`

**Evidence of non-use.** A repo-wide search (`src/**`, `prisma/seed.ts`, scripts, and all SQL
except the init migration) found **zero** references to `YouthClubRegistration`, `youthClub`, or
the `YouthClub` enum. The only definitions were in `prisma/schema.prisma` and the table/enum
creation in `00000000000000_init`. Because no code path ever wrote to the table, it cannot have
been populated by this application in any environment.

**Action.** Removed the `YouthClub` enum, `YouthClubRegistration` model, and `Member.youthClubs`
relation from `prisma/schema.prisma`, and added migration
`20260811140000_retire_youth_club_registration` which drops the FK, table, and enum type
(idempotent `IF EXISTS` guards). This aligns with the boundary that youth-club/minor-facing
features are out of scope unless separately authorized, and it removes a latent minor-PII table
(data minimization).

## Regression guard

`src/tests/safeguarding-surfaces.test.ts` fails CI if:
- the `YouthClub` enum/model/relation reappears in the schema,
- any `src/**` file reintroduces a youth-club reference, or
- a minor-exclusion filter is dropped from the directory, search, export, clerk-reconcile,
  care-scan, or email-segment surfaces.

This sits alongside the behavioral coverage in `src/tests/minors.test.ts` (age detection,
`adultWhere`, CSV refusal) and the E2E test that an authorized admin export excludes a seeded
minor (`e2e/api-authz.spec.ts`).

## Not changed

`canScheduleWithMinors` (and `VolunteerScreening` clearance) is retained: it is the *gate* that a
future, separately-authorized youth ministry would use, and removing it would weaken a
safeguarding control. It currently has no caller, so it exposes nothing.
