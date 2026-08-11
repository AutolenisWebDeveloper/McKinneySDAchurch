---
name: mckinney-sda-production-readiness
description: >-
  Final launch-verification for the McKinney SDA platform. Use to verify the
  whole application against the launch requirements before go-live — NOT to add
  features. Checks database/backups, auth/MFA, secrets/encryption, Resend +
  SPF/DKIM/DMARC + webhooks, cron, Blob storage, AdventistGiving config,
  security headers, monitoring, accessibility, and production smoke tests.
  Trigger on: launch, go-live, production readiness, pre-launch checklist,
  deploy checklist, is it ready to ship, hardening.
---

# McKinney SDA — Production Readiness

This is a **verification** skill. Do not implement new features under it. Verify the built
application against `LAUNCH.md` and the launch requirements, and report evidence.
**Never declare production-ready from local tests alone** — many items are `[verify]` in the
real environment.

## Authoritative reference

`LAUNCH.md` is the pre-production checklist; `src/env.ts` validates required env at boot (the
app refuses to start if a required var is missing). Verify against those, not memory.

## Verification matrix

**Environment & secrets** — all required vars set per environment, generated fresh, never
reused: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL` (no trailing slash), `NEXTAUTH_SECRET`,
`ENCRYPTION_KEY`, `TOKEN_HMAC_SECRET`, `CRON_SECRET`, `RESEND_API_KEY`,
`RESEND_WEBHOOK_SECRET`, `MAIL_FROM`, `ADVENTIST_GIVING_URL` (optional), `BLOB_READ_WRITE_TOKEN`.

**Database** — migrations applied (`prisma migrate deploy`); the `ReferenceDocument`
tsvector + GIN full-text index added (manual SQL); seed run. Automated backups / PITR enabled
**and a restore actually tested**. `ENCRYPTION_KEY` backed up in a secrets manager, separate
from the DB (rotating it destroys ciphertext).

**Auth & authorization** — credentials + TOTP MFA available; **first ADMIN created with MFA
enabled**; session revocation via `sessionVersion` works; RBAC enforced on every dashboard
route + server action; audit log on privileged mutations.

**Encryption & secrets** — prayer/pastoral/board-minutes/MFA secrets encrypted (AES-256-GCM);
HMAC token secret set; no secrets in the repo.

**Email deliverability** — SPF (`include:resend.com`), DKIM (Resend CNAMEs), DMARC
(`_dmarc`, start `p=none` → tighten). Resend webhook → `POST /api/webhooks/resend` with
`RESEND_WEBHOOK_SECRET`; a test bounce auto-suppresses. RFC 8058 one-click unsubscribe present.
Test send to Gmail + Outlook passes all three.

**Cron** — `vercel.json` schedules `visitor-weekly-invite`, `ministry-head-reminder`,
`care-scan`; all secret-gated (`CRON_SECRET`) and idempotent via the `ScheduledJobRun` lease;
a manual trigger returns `ok`.

**Storage & documents** — `BLOB_READ_WRITE_TOKEN` set for uploads; document access respects
`DocumentVisibility`; secure documents not publicly reachable.

**Giving** — `ADVENTIST_GIVING_URL` configured; Give path is an external redirect; **no local
card handling** (see `mckinney-sda-giving-boundary`).

**Security headers & edge** — CSP, HSTS (2-year preload), `X-Content-Type-Options`,
`X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `x-powered-by` off
(`next.config.mjs`); HTTPS forced; auth cookie `Secure`/`SameSite`. Consider WAF / rate
limiting on public form endpoints beyond the built-in honeypots. (Hardening path: nonce-based
CSP to remove `'unsafe-inline'`.)

**Monitoring & logging** — `GET /api/health` returns `{ok, db}` / 503, wired to an uptime
monitor; error tracker (e.g. Sentry) wired; Resend events + in-app `AuditLog` reviewed.

**Accessibility** — WCAG AA pass (Lighthouse + axe on home/calendar/a form; keyboard-only;
contrast in light + dark; one screen-reader pass). Target 2.2 AA for new work.

**Communication preferences & legal** — preferences/unsubscribe work and never bypass
suppression; privacy/terms pages finalized with church leadership.

**Build & tests** — `npm run prisma:validate`, `npm run typecheck`, `npm run test`,
`npm run build` all green in CI. Production smoke test the deployed app (login/MFA, a public
form, the Give redirect, a WorkItem, an email send).

## Rules

1. Verify, don't build. If something is missing, report it as a gap — implementing it is a
   separate task under the relevant domain Skill.
2. Distinguish **code-verified** (headers, encryption, RBAC, cron gating, health route) from
   **`[verify]` environment** items (DNS, backups/restore, monitors, WAF) — the latter must be
   confirmed in the real deployment and cannot be certified from a sandbox.
3. Report each item as pass / fail / not-verifiable-here with evidence. Never mark an item
   passed without evidence.

## Output

A checklist mapped to the matrix above: ✅ verified (with evidence), ⚠️ needs environment
`[verify]`, ❌ gap (with the owning Skill). Conclude with an explicit, evidence-based
readiness statement — or the list of blockers preventing one.
