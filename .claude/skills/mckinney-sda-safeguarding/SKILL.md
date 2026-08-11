---
name: mckinney-sda-safeguarding
description: >-
  HIGH-PRIORITY minor-safeguarding controls for the McKinney SDA platform. Use
  whenever code touches Member, Household, a child/dependent/minor, Volunteer
  screening, Search, Export, Email/marketing, Directory, Documents, Care, or
  Prayer — anything that could expose, contact, or grant access involving a
  minor. Requires an explicit safeguarding review on any such change. Trigger
  on: minor, child, dependent, youth, guardian, consent, volunteer screening,
  background check, directory, export, marketing to minors, Adventurer, Pathfinder.
---

# McKinney SDA — Minor Safeguarding (high priority)

Protecting minors is a non-negotiable, non-weakenable requirement. If a change touches
`Member`, `Household`, a child/dependent, `VolunteerScreening`, Search, Export, Email,
Directory, Documents, Care, or Prayer, perform an **explicit safeguarding review** before
implementing and again before claiming done.

## What to inspect

- `src/lib/minors.ts` — `MINOR_AGE = 18`, `isMinorMember`, `adultWhere(asOf)`,
  `toMemberCsv` (throws `MINOR_IN_EXPORT`).
- `src/lib/rbac.ts` — `canManageDependent`, `isScreeningCurrent`, `canScheduleWithMinors`.
- `prisma/schema.prisma` — `Member.isMinor` / `dateOfBirth` / `guardianMemberId`,
  `GuardianConsent`, `VolunteerScreening`, `MediaConsent`, `YouthClubRegistration`.
- `src/lib/membership-match.ts` — minors are never auto-matched to a login.

## Non-negotiable rules

1. **No independent minor login.** Minors cannot self-register and are never auto-matched to
   an account (`membership-match.ts`: `eligible = !isMinor && !hasUser`). Only a same-household
   guardian may create/manage a dependent (`canManageDependent`: admin OR guardian MEMBER in
   the same household). A minor Member is created only inside household provisioning.
2. **Minimal minor data.** Store only what is necessary for a child record. Do not add
   optional profile fields to minors that exist for adults.
3. **No minor in the directory.** Directory queries use `adultWhere(...)` / respect
   `directoryVisible`; a minor must never appear in a member directory or public listing.
4. **No minor in search results.** Member search excludes minors — filter with `adultWhere`
   before producing any result. Never surface a minor via search leakage.
5. **No minor in exports.** `toMemberCsv` hard-throws `MINOR_IN_EXPORT` if any row is a minor —
   never bypass or "fix" this by removing the guard; fix the caller to pass adults only.
6. **No independent marketing to minors.** Minors are not marketing recipients. Marketing
   suppression treats missing/guardian-gated consent as a hard block; never email a minor
   directly for marketing.
7. **Guardian/household controls & consent.** Actions affecting a minor's contact, directory,
   or email visibility require `GuardianConsent` (scope string e.g.
   `"store-contact:yes; directory:no; email:no"`), recorded with method + recorder. Media use
   requires `MediaConsent` (`forMinor`).
8. **Adult-facing volunteer screening gates any work with minors.** No one is scheduled with
   minors unless their `VolunteerScreening` is `CLEARED` and unexpired
   (`canScheduleWithMinors` / `isScreeningCurrent`; provider "Adventist Screening
   Verification", renew every 3 years). The volunteer *application* system is adult-facing.
9. **No unauthorized youth-club expansion.** `YouthClubRegistration` ties a minor to a club
   via a `guardianConsentId`. Do not add clubs, self-enrollment, or minor-facing club features
   without guardian consent and an explicit safeguarding decision.
10. **Never weaken a safeguard to simplify implementation.** If a safeguard makes a feature
    harder, keep the safeguard.

## Prohibited patterns (reject in review)

- Any path that lets a minor self-register, log in, or be auto-linked to an account.
- Minors appearing in directory, search, exports, or marketing sends.
- Removing/bypassing the `MINOR_IN_EXPORT` guard or `adultWhere` filters.
- Scheduling anyone with minors without a current `CLEARED` screening.
- Managing a dependent as a non-guardian, or cross-household dependent access.
- Adding minor-facing features or youth clubs without guardian consent.

## Verification requirements

- Extend `src/tests/minors.test.ts` for any change to minor detection/exclusion.
- Add negative-path E2E for minor leakage (directory/search/export) — see
  `mckinney-sda-testing-qa`.
- Every change touching the surfaces above must include a written safeguarding note in the PR
  describing what was checked. Run `npm run test`; never claim safe without the guard tests
  passing.
