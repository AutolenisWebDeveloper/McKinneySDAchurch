# McKinney SDA Platform — Launch & Hardening Guide (P6)

This is the pre-production checklist. The app is built; this covers the configuration,
DNS, and operational steps required to run it safely in production. Items marked **[verify]**
must be confirmed in your own environment (they can't be checked in a sandbox).

---

## 1. Environment variables

Set every key from `src/env.ts` (validated at boot; the app refuses to start if any required one is missing):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | App runtime connection. On serverless use the **pooled** URL (Supabase PgBouncer, port 6543). |
| `DIRECT_URL` | yes | **Direct** (non-pooled) connection for Prisma migrate/validate/db push (Supabase port 5432). PgBouncer cannot run migrations. Locally/CI, same value as `DATABASE_URL`. |
| `NEXT_PUBLIC_SITE_URL` | yes | e.g. `https://mckinneysda.org` (no trailing slash). |
| `NEXTAUTH_SECRET` | yes | 32+ random bytes: `openssl rand -base64 32`. |
| `ENCRYPTION_KEY` | yes | 32+ chars; encrypts prayer requests, pastoral notes, board minutes, MFA secrets. **Rotating it makes existing ciphertext unreadable — store it safely.** |
| `TOKEN_HMAC_SECRET` | yes | Signs invite/reset/unsubscribe tokens. |
| `CRON_SECRET` | yes | Bearer token for cron routes. On Vercel, set this and Vercel auto-sends it as `Authorization: Bearer` on scheduled invocations. |
| `RESEND_API_KEY` | for email | From Resend. Without it, sends are skipped (no crash). |
| `RESEND_WEBHOOK_SECRET` | for webhooks | `whsec_…` from the Resend webhook config. |
| `MAIL_FROM` | default set | Must be an address on your verified sending domain. |
| `ADVENTIST_GIVING_URL` | optional | Your AdventistGiving link; the Give button/page hide if unset. |
| `BLOB_READ_WRITE_TOKEN` | for uploads | Vercel Blob token. Enables direct photo upload; without it, add images by URL. |

Generate secrets: `openssl rand -base64 32` (run once each; never reuse across environments).

---

## 2. Database

0. **Migrations apply automatically on deploy.** Set the Vercel **Build Command** to
   `prisma generate && prisma migrate deploy && next build` so every deploy applies committed
   migrations before building. This requires `DIRECT_URL` to be set (the pooled `DATABASE_URL`
   cannot run migrations). Prisma's build-time client generation reads `DATABASE_URL`; the
   migrate step reads `DIRECT_URL`. Without this step the schema drifts behind the code —
   pages that query new columns then error in production.
   - The production database has been **baselined**: `_prisma_migrations` records all migrations
     through `20260812140000_calendar_governed_events` as applied, so `migrate deploy` is a no-op
     against current prod and only *future* migrations run.
1. **[verify]** Run migrations manually if not on the automated build: `npx prisma migrate deploy`
   (needs `DIRECT_URL`).
2. **[verify]** Add the full-text search index the search feature needs (see `README`):
   a `tsvector` GENERATED column on `ReferenceDocument` + a GIN index. Search returns no
   hits until this exists.
3. **[verify]** Seed reference content: `npm run db:seed` (loads the 28 belief titles + source URLs;
   the church supplies the licensed body text).
   - **Bootstrap the first administrator** (no other path can create it — the public flow only
     makes MEMBER accounts, and invites need an existing admin):
     ```
     ADMIN_EMAIL="admin@yourchurch.org" ADMIN_PASSWORD="a-strong-password" \
       [ADMIN_NAME="Church Administrator"] npm run db:seed:admin
     ```
     Idempotent — re-run it to reset a locked-out admin's password (this also revokes the
     admin's existing sessions). Sign in at `/auth/login`, then enable MFA (see §138).
4. **Backups:** enable your provider's automated backups / point-in-time recovery (Neon, Supabase,
   RDS all support this). Target: daily full + PITR. **Test a restore before launch.**
5. Encrypted fields (prayer, pastoral notes, board minutes) are only as recoverable as
   `ENCRYPTION_KEY` — back the key up in a secrets manager, separately from the database.

---

## 3. Email deliverability (Resend + DNS)

Add these DNS records for your sending domain, then verify in Resend:

- **SPF** — a TXT record authorizing Resend to send: `v=spf1 include:resend.com ~all`
  (merge with any existing SPF record — you may only have one).
- **DKIM** — add the CNAME/TXT records Resend generates for your domain (they sign each message).
- **DMARC** — a TXT record at `_dmarc.<domain>`: start monitoring-only, then tighten:
  `v=DMARC1; p=none; rua=mailto:dmarc@mckinneysda.org` → after reviewing reports, move to
  `p=quarantine` then `p=reject`.
- **Webhook:** point Resend's webhook at `POST /api/webhooks/resend` and set `RESEND_WEBHOOK_SECRET`.
  Bounces/complaints then auto-suppress addresses.
- One-click unsubscribe (RFC 8058) headers are already sent on marketing mail.

**[verify]** Send a test to a Gmail + an Outlook address and confirm SPF/DKIM/DMARC all pass
(check the message "show original" / headers).

---

## 4. Scheduled jobs (crons)

`vercel.json` schedules three jobs (all idempotent via a DB lease, so a double-fire is safe):

- `visitor-weekly-invite` — Wed 13:00 UTC — opted-in visitors only.
- `ministry-head-reminder` — Mon 14:00 UTC.
- `care-scan` — Mon 06:00 UTC — flags members with no attendance in 6 weeks.

On Vercel, set `CRON_SECRET` and the platform sends it automatically. On other hosts, call the
GET endpoints from your scheduler with header `Authorization: Bearer $CRON_SECRET`.

---

## 5. Security (configured in this codebase)

- **Security headers** (`next.config.mjs`): CSP, HSTS (2-year, preload), `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`. `x-powered-by` disabled.
  - **Hardening path:** the CSP allows `'unsafe-inline'` for scripts because two app-controlled
    inline scripts exist (no-flash theme, JSON-LD). Upgrade to nonce-based CSP when you have time;
    all rendered HTML is already sanitized server-side.
- **Auth:** credentials + optional TOTP MFA; session revocation via `sessionVersion`.
- **Encryption at rest:** prayer requests, pastoral notes, board minutes, MFA secrets (AES-256-GCM).
- **RBAC** on every dashboard route + server action; audit log on privileged mutations.
- **[verify]** Force HTTPS + set the auth cookie `Secure`/`SameSite` (default on Vercel prod).
- **[verify]** Consider a WAF / rate limiting at the edge for the public form endpoints
  (visitor, prayer, baptism) beyond the built-in honeypots.

---

## 6. Monitoring & health

- **Health check:** `GET /api/health` returns `{ ok, db }` and 503 if the DB is unreachable.
  Point an uptime monitor (BetterStack, Pingdom, or Vercel's) at it.
- **Errors:** wire an error tracker (e.g. Sentry) for server + client. **[verify]**
- **Logs:** review Resend delivery events and the in-app `AuditLog` periodically.

---

## 7. Accessibility (WCAG 2.1 AA target)

Built in: semantic landmarks, skip-to-content link, labeled form controls, visible keyboard
focus, `lang="en"`, dark/light with sufficient contrast, larger body text for readability.

**[verify] pre-launch pass:**
- Run Lighthouse + axe DevTools on the home, calendar, and a form page; fix any criticals.
- Tab through every form with the keyboard only; confirm focus order and visible focus.
- Check color contrast on the navy/gold on white and in dark mode (target ratio ≥ 4.5:1).
- Test one screen reader (VoiceOver/NVDA) on the home page and the visitor form.

---

## 8. Pre-launch checklist

- [ ] All env vars set; secrets generated fresh per environment.
- [ ] `prisma migrate deploy` run; FTS column added; seed run.
- [ ] Backups enabled **and a restore tested**; `ENCRYPTION_KEY` backed up separately.
- [ ] SPF + DKIM + DMARC verified; test email passes all three.
- [ ] Resend webhook connected; a test bounce suppresses correctly.
- [ ] Crons visible in the Vercel dashboard; a manual trigger returns `ok`.
- [ ] Security headers present (check with `curl -I` or securityheaders.com).
- [ ] `/api/health` green from an external monitor.
- [ ] Accessibility pass done.
- [ ] First ADMIN user created and MFA enabled.
- [ ] Legal pages (privacy/terms) finalized with church leadership.
