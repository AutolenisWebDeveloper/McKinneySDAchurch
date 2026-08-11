---
name: mckinney-sda-database-prisma
description: >-
  Database integrity and migration safety for the McKinney SDA platform
  (Prisma + PostgreSQL). Use whenever changing prisma/schema.prisma, writing or
  reviewing a migration, adding a model/field/index/constraint, backfilling
  data, editing the seed, or writing queries with concurrency/uniqueness/
  performance concerns. Trigger on: Prisma, schema, migration, model, index,
  unique, foreign key, cascade, transaction, race condition, backfill, seed,
  tsvector, query performance.
---

# McKinney SDA — Database & Prisma

`prisma/schema.prisma` is the authoritative schema; `prisma/migrations/*` are the applied
history. CI runs `prisma validate` → `generate` → `migrate deploy` against a real Postgres.
Protect data integrity and make migrations safe.

## What to inspect

- `prisma/schema.prisma` — models, enums, indexes, and the schema comments (they document
  intentional design choices).
- `prisma/migrations/` — the committed, ordered migrations (phase-named).
- `prisma/seed.ts` — must stay idempotent (titles/settings only, no copyrighted text).
- `src/env.ts` — `DATABASE_URL`. `.github/workflows/ci.yml` — the exact DB gate.

## Conventions this schema uses (honor them)

- **Enums are the vocabulary** — statuses/types/roles are Postgres enums (Role, WorkItemStatus,
  TransferStatus, etc.). Extend the enum; don't stuff free strings.
- **Active-uniqueness via partial indexes** — e.g. one active `UserRole` per (user, role) is
  enforced by a partial unique index (`WHERE active`) created in a migration, not a Prisma
  `@@unique`. Follow this pattern for "one active X" rules.
- **Intentional scalar (non-FK) references** — several links are deliberately plain ids, not
  relations, to keep coupling simple: `Household.primaryContactId`,
  `MembershipTransfer.consentDocumentId`/`attestedById`, `ChurchManualVersion.documentId`,
  `ActionItem.ownerMemberId`, and the `PacketSubmission` submitter/reviewer ids. Don't
  "fix" these into FKs without a reason.
- **Encrypted columns** are `String` holding AES-256-GCM ciphertext (`*Encrypted`/`*Enc`) — the
  DB never sees plaintext (see `mckinney-sda-data-privacy`).
- **Idempotency keys** are `@unique` (`EmailEvent.providerEventId`,
  `EmailMessage.providerMessageId`, `EmailCampaign.idempotencyKey`) — preserve them.
- **Optimistic concurrency** — hot aggregates carry a `version`/`updatedAt` guard used by
  `updateMany` (WorkItem, WeeklyPacket, reviewable content). Keep the guard when adding writes.

## Migration safety rules

1. **Additive by default** — add tables/columns/indexes; make new columns nullable or give a
   safe default. Generate migrations with `prisma migrate dev` and commit the SQL.
2. **Never destructively drop or rewrite populated data without an explicit migration +
   backfill strategy.** A rename that drops+recreates a populated column needs a backfill step.
3. **Review the generated SQL by hand** — Prisma's diff can produce a destructive step
   (drop/alter type) you didn't intend. Confirm what actually runs against Postgres.
4. **Backfills are idempotent and batched** for large tables; run them before enforcing a new
   `NOT NULL`/unique constraint.
5. **Indexes & constraints** — add indexes for new query paths and foreign keys; use
   `@@unique`/partial unique indexes for real invariants. Nullable-unique semantics: multiple
   NULLs are allowed in Postgres — rely on that intentionally, don't assume it blocks dupes.
6. **Cascade behavior** — set `onDelete` deliberately. Structural children (`CommitteeMember`,
   `Motion`, `PacketSubmission`) cascade; governance/records are archived, not deleted, at the
   service layer.
7. **Full-text search** — `ReferenceDocument.searchVector` (tsvector + GIN) is a **manual SQL
   migration** (Prisma can't express it); keep it in a migration, not app code.
8. **Concurrency** — guard against races with unique constraints + `updateMany`-on-guard (e.g.
   the `userId:null` bind in account provisioning), not read-then-write.

## Prohibited patterns (reject in review)

- Destructive migrations (drop column/table, type change) on populated data with no backfill.
- Editing an already-applied migration instead of adding a new one.
- Free-text where an enum exists; dropping `@unique` idempotency keys.
- Relying on TypeScript types alone for data integrity (add DB constraints).
- Read-modify-write on hot rows without a version/unique guard.
- Non-idempotent seeds or seeding copyrighted content.

## Verification requirements

- Run `npm run prisma:validate`, `npx prisma generate`, and apply the migration
  (`npx prisma migrate deploy` / `migrate dev`) against a real Postgres — the CI gate.
- Add/extend `src/tests/schema.test.ts` where a structural invariant matters.
- Run `npm run typecheck`, `npm run test`, and `npm run build` (it prerenders DB-backed pages).
  Never claim a migration is safe without having run it.
