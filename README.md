# McKinney SDA Church — Platform (Master Plan v4)

Next.js 16 (App Router) · TypeScript · PostgreSQL + Prisma · NextAuth · Resend · FullCalendar.

This repository is the **verified foundation (Phase 0)** of the platform described in
`Master Plan v4`. It is not the finished application — read **`IMPLEMENTATION_STATUS.md`**
for exactly what is built, verified, scaffolded, and remaining.

## Quickstart
```bash
cp .env.example .env            # then fill in real values
openssl rand -base64 32         # for NEXTAUTH_SECRET, ENCRYPTION_KEY, TOKEN_HMAC_SECRET, CRON_SECRET
npm install
npm run prisma:validate         # authoritative schema check
npm run prisma:migrate          # create the DB + first migration
npm run db:seed                 # belief titles + settings (NOT copyrighted text)
npm run test                    # schema + authorization tests
npm run dev
```

> Version note: Next.js 16 is the current Active LTS (verified). Pin exact dependency
> versions to the latest stable at install time and apply Next.js coordinated security releases.

## Full-text search migration (manual step)
Prisma can't express `tsvector` natively. After the first migration, add a generated column + GIN index:
```sql
ALTER TABLE "ReferenceDocument"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce("bodyHtml",''))) STORED;
CREATE INDEX reference_search_idx ON "ReferenceDocument" USING GIN ("searchVector");
```

## Architecture
- **Authorization** lives only in `src/lib/rbac.ts` (role + resource policies + the minors safeguarding gate). Never trust the client; call these in every handler.
- **Sensitive data** (pastoral notes, prayer content, board minutes) is AES-256-GCM encrypted via `src/lib/crypto.ts`; never logged or placed in audit metadata.
- **Tokens**: invite/reset store only a SHA-256 digest; unsubscribe/transfer-status use HMAC-signed tokens.
- **Email**: marketing sends re-check suppression at send time; unsubscribe is RFC 8058 one-click (endpoint to build in P3).
- **Cron**: secret-gated + idempotent via a `ScheduledJobRun` DB lease.
- **eAdventist boundary**: local member/transfer/attendance data is a convenience mirror, not the system of record (see Master Plan §2A).

## Security & compliance guardrails (enforced in code, not just docs)
- Minors cannot self-register; only a same-household guardian may create/manage a dependent.
- No one may be scheduled with minors unless their `VolunteerScreening` is `CLEARED` and unexpired (NAD Adventist Screening Verification; renew every 3 years).
- Giving is an external redirect (AdventistGiving); no card data is ever handled here.

## Copyright
The 28 Fundamental Beliefs and the Church Manual are copyrighted General Conference works.
Seed data contains titles + official source URLs only. Supply licensed body text or link out,
and confirm reproduction permission with your conference.
