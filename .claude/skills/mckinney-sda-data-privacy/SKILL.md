---
name: mckinney-sda-data-privacy
description: >-
  Protects church and member information across the McKinney SDA platform:
  data minimization, field-level encryption, audit-without-plaintext, and
  preventing sensitive data from leaking into logs, URLs, notifications,
  exports, search, or client state. Use whenever code reads, stores, logs,
  exports, or displays member/pastoral/prayer/care/governance/document data,
  or touches encryption, audit, or search exposure. Trigger on: encryption,
  PII, sensitive data, pastoral note, prayer, board minutes, logging, audit,
  export, retention, confidential, data minimization.
---

# McKinney SDA — Data Privacy & Encryption

Church membership is voluntary and much profile data is optional. Collect the minimum, encrypt
the sensitive, disclose only after authorization, and never leak plaintext into side channels.

## What to inspect

- `src/lib/crypto.ts` — the encryption + token primitives (below).
- `src/lib/audit.ts` — `writeAudit(db, entry)` / `auditWith(actorId)` and the `AuditLog` model.
- `src/lib/rbac-search.ts` — search scope gating (leakage prevention).
- `src/lib/minors.ts` — minor exclusion helpers (see `mckinney-sda-safeguarding`).
- `prisma/schema.prisma` — encrypted-field models and the `Document` visibility enum.

## Encryption (AES-256-GCM) — `src/lib/crypto.ts`

- `encryptField(plain)` / `decryptField(payload)` — AES-256-GCM, random 12-byte IV, stored as
  `iv:tag:ciphertext` (base64, `:`-joined). Key = env **`ENCRYPTION_KEY`** (32 bytes base64).
  **Rotating `ENCRYPTION_KEY` makes existing ciphertext unreadable** — treat it as a
  break-glass secret.
- Sensitive fields already encrypted at rest (follow the pattern for any new sensitive field):
  `PrayerRequest.contentEncrypted`, `PastoralNote.contentEncrypted`,
  `BoardMeeting.minutesEncrypted`, `SecretaryNote.bodyEncrypted`, `WorkItem.bodyEncrypted`,
  `WorkItemNote`, `MemberInfoSubmission.payloadEnc`, and `User.mfaSecret`.
- Tokens: `newToken()` stores only a **SHA-256 digest** (invites/resets — raw shown once);
  `signToken`/`verifyToken` are HMAC-signed (`TOKEN_HMAC_SECRET`) for unsubscribe/transfer
  links. Never store a raw token.
- Passwords: `hashPassword`/`verifyPassword` (bcrypt cost 12). Never log or return a hash.

## Rules

1. **Data minimization** — add a field only if a real requirement needs it; prefer optional.
   Voluntary member fields (occupation, employer, skills, ministries, baptism year) are
   opt-in — never require them and never expose them beyond their audience.
2. **Encrypt new sensitive fields** — pastoral, prayer, care, board/committee minutes, and any
   free-text about a person's health/finances/spiritual state use `encryptField`. Name the
   column `*Encrypted` / `*Enc` to match convention.
3. **Authorize before disclosure** — every read of member/pastoral/prayer/care/governance/
   document data goes through `rbac.ts` (`mckinney-sda-rbac-security`). Documents honor their
   `DocumentVisibility` gate.
4. **Never put sensitive plaintext in side channels:**
   - **Logs** — no PII/decrypted content in `console.*` or server logs.
   - **URLs / query strings** — no names, emails, or secrets in the path or query.
   - **Audit metadata** — `AuditLog.metadata` records *what/who*, never decrypted content
     (the `writeAudit` contract states this explicitly).
   - **Notifications** — `Notification.title/body` are plaintext; keep them non-sensitive and
     link (`deepLink`) to the gated resource instead of embedding content.
   - **Analytics / client state** — never ship decrypted sensitive fields to the browser or a
     third party.
5. **Search** — authorize scopes *before* producing any title/snippet/count
   (`searchScopesForRoles`); never index or return sensitive content to unentitled roles.
6. **Exports** — gate to entitled roles, exclude minors (`toMemberCsv` throws
   `MINOR_IN_EXPORT`), and label member exports as an eAdventist-reconciliation convenience,
   not the system of record.
7. **Retention** — prefer archival/soft-deactivation over destructive deletion for records
   with historical or governance value; don't retain sensitive free-text longer than needed.

## Prohibited patterns (reject in review)

- Storing pastoral/prayer/care/minutes/PII free-text in plaintext columns.
- Logging decrypted content, hashes, tokens, or PII.
- Sensitive data in URLs, `AuditLog.metadata`, notification bodies, or analytics.
- Returning member/confidential data to the client and filtering there.
- Requiring voluntary profile fields, or widening a field's audience without authorization.

## Verification requirements

- New encrypted field: add a round-trip test near `src/tests/crypto.test.ts` and confirm no
  plaintext path leaks it (logs/URL/audit/notify).
- Run `npm run typecheck` and `npm run test`. Never claim data is protected without the test.
