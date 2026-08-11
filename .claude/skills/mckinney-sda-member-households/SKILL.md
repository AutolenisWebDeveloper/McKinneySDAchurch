---
name: mckinney-sda-member-households
description: >-
  Protects the canonical Member/Household data model of the McKinney SDA
  platform and the account-request → membership-matching → provisioning flow.
  Use whenever code touches members, households, spouses, children/dependents,
  voluntary member profiles, account registration, membership matching, or the
  member↔login binding. Trigger on: member, household, family, spouse, child,
  dependent, member profile, account request, registration, membership match,
  duplicate member, provision household, member information form.
---

# McKinney SDA — Member & Household Model

Households are groups of **individual** Member records — never one shared profile. Preserve
this model and the matching/provisioning invariants.

## What to inspect

- `prisma/schema.prisma` — `Household`, `Member`, `GuardianConsent`, `AccountRequest`,
  `MemberInfoSubmission`, `MemberInfoInvite`.
- `src/lib/member-info.ts` — the Member Information Form schema + encrypted encode/decode.
- `src/lib/member-provision.ts` — `provisionHousehold` (submission → Household + Members).
- `src/lib/membership-match.ts` — pure matching/scoring.
- `src/lib/account-requests.ts` — submit/approve/reject/needs-info + user creation.

## The model (facts to honor)

- **`Household`** holds family-level data: `familyName`, address, `anniversary`, primary
  `phone`/`email`, and `primaryContactId` (a Member id — an intentional **scalar reference,
  not a FK**). `members Member[]`.
- **`Member`** is one person with their own row: `firstName`/`lastName`, optional
  `email`/`emailNormalized` (`@unique`), `isMinor`, `dateOfBirth`, `baptismDate`,
  `membershipStatus` (mirrors eAdventist — not the official record), `directoryVisible`
  (default false), `showAddress` (default false).
  - Voluntary profile fields (opt-in, from the Member Information Form): `baptismYear`,
    `joinedYear`, `currentMinistries`, `ministryInterests`, `occupation`, `employer`,
    `employmentStatus` (EMPLOYED|SELF_EMPLOYED|RETIRED|STUDENT|UNEMPLOYED), `skills`.
  - **Spouse is implicit**: two adults share a `householdId`; there is no spouse FK. The
    husband/wife distinction lives only in the form payload, not the DB.
  - **Children/dependents**: self-relation `guardianMemberId` → `guardian` /
    `dependents Member[]` (relation `MinorGuardian`). Each child is its own minor Member.
  - **Login binding**: `Member.userId @unique` binds one Member to one login.
- **There is no `emergencyContact` or `communicationPrefs` column on Member** — consent/comms
  are separate models (`GuardianConsent`, `MediaConsent`, `EmailSubscription`/`Suppression`).
  Do not invent these fields; extend the correct model.

## Account request → matching → provisioning

- **`AccountRequest`** (`status`: `PENDING_ADMIN_REVIEW` default, `AUTO_APPROVED`, `APPROVED`,
  `REJECTED`, `NEEDS_INFO`). Password stored as bcrypt hash; **purged on reject**.
- **`matchMembership`** (pure) scores candidates: email +60, last name +20, first name +15,
  phone +20, birth year +10. Bands: EXACT ≥95, HIGH ≥75, MEDIUM ≥50, LOW ≥25, NONE <25.
  Auto-approvable only when the top candidate is `eligible` (`!isMinor && !hasUser`), full-name
  matches, score ≥75, and is clearly ahead (≥20-point lead). **Minors are never matched;
  already-linked members are never auto-bound.**
- **`account-requests.ts`** always returns generic success (no account enumeration). User
  creation binds the Member only when `userId: null` (`updateMany` race guard →
  `DUPLICATE_EMAIL` on conflict), creates a `UserRole` MEMBER, audits, and notifies.
- **`provisionHousehold`** creates one Household then a distinct Member per adult (email-keyed
  `upsertAdult` = duplicate handling) and per child (`isMinor:true`); sets `primaryContactId`.
- **`MemberInfoSubmission.payloadEnc`** is the full form, AES-256-GCM encrypted; provisioning
  happens on approval (`createdHouseholdId`).

## Implementation rules

1. Model a family as one `Household` + N `Member` rows. Never collapse a household into a
   single profile or store multiple people in one Member row.
2. Reuse `matchMembership` for any member-matching; never write a second matcher. Preserve the
   minor and already-linked exclusions.
3. Handle duplicates the existing way: email-keyed upsert in provisioning; `userId:null` guard
   when binding a login. Don't create a duplicate Member for an existing email.
4. Membership verification stays advisory (`verificationData`, `matchBand`) with admin review;
   don't auto-grant beyond the auto-approve rule.
5. Encrypt the raw submission payload (`encryptField`); treat member PII per
   `mckinney-sda-data-privacy` and minors per `mckinney-sda-safeguarding`.
6. `membershipStatus` and member data are an eAdventist convenience mirror, not the system of
   record — see `mckinney-sda-governance`.

## Prohibited patterns (reject in review)

- One shared "household profile" instead of individual Members.
- Inventing `spouseId`, `emergencyContact`, or `commPrefs` columns on Member.
- A second membership-matching implementation, or auto-binding minors / existing logins.
- Creating duplicate Members for a known email; binding a login without the `userId:null` guard.
- Account-enumerating responses on the public request endpoint.
- Storing the member-info payload unencrypted.

## Verification requirements

- Extend `src/tests/membership-match.test.ts`, `member-provision.test.ts`,
  `member-info.test.ts` for matching/provisioning changes (keep matching pure).
- Run `npm run prisma:validate`, `npm run typecheck`, `npm run test`.
