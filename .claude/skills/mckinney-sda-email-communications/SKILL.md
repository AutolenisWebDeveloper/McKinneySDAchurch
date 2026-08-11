---
name: mckinney-sda-email-communications
description: >-
  Protects the unified email/communication pipeline of the McKinney SDA
  platform (Resend + template registry + suppression + one-click unsubscribe +
  webhook idempotency). Use whenever code sends email, adds/edits a template,
  handles delivery webhooks, manages subscriptions/suppression/unsubscribe, or
  builds links inside email. Prevents duplicate senders, unescaped user content,
  suppression bypass, and hard-coded URLs. Trigger on: email, Resend, template,
  transactional, marketing, unsubscribe, suppression, bounce, complaint, webhook,
  SPF, DKIM, DMARC, mail from.
---

# McKinney SDA — Email & Communications

All email flows through **one** pipeline. Do not add a second sender, template system, or
suppression path. Send only through the shared helpers.

## What to inspect

- `src/lib/email.ts` — `sendEmail({to, subject, html, type, listType?})` (the only transport).
- `src/lib/email-templated.ts` — `resolveTemplate(key)`, `sendTemplated(key, to, vars)`.
- `src/lib/email-registry.ts` — `EMAIL_REGISTRY` (keyed templates, `wired` flag),
  `registryEntry(key)`.
- `src/lib/email-render.ts` — `escapeHtml`, `substitute`, `renderTemplate` (`{{var}}` only).
- `src/lib/email-identity.ts` — `normalizeEmail`. `src/lib/suppression.ts` — `shouldSuppress`.
- `src/lib/unsubscribe.ts` — RFC 8058 one-click headers. `src/lib/webhooks.ts` —
  `verifyResendSignature`, `mapResendEvent`. `src/lib/preferences.ts` — opt-out prefs.
- `prisma/schema.prisma` — `EmailIdentity`, `EmailSubscription`, `Suppression`,
  `EmailCampaign`, `EmailMessage`, `EmailEvent`, `EmailTemplate`, `EmailTemplateVersion`.

## The pipeline (facts to honor)

- **One transport**: `sendEmail` normalizes the recipient, loads the `EmailIdentity` with
  suppressions/subscriptions, calls `shouldSuppress`, and only then sends via Resend
  (`from: env.MAIL_FROM`). No `RESEND_API_KEY` → it safely skips (`{sent:false}`), never crashes.
- **Templated sends**: `sendTemplated(key, to, vars)` → `resolveTemplate` (active DB
  `EmailTemplate` override if present, else the code registry default) → `renderTemplate` →
  `sendEmail`, wrapped in try/catch so **an email failure never voids the caller's state
  change**.
- **Escaping**: templates use `{{variable}}` substitution only — **no expression evaluation**.
  `renderTemplate` HTML-escapes into subject + HTML; unknown/null vars render empty (never leak
  `{{…}}`). All user-supplied content must go through this — never string-concatenate user
  input into HTML.
- **Sender identity**: `MAIL_FROM` must be an address on the verified sending domain. Identity
  key is `normalizeEmail` (`trim().toLowerCase()`).
- **Suppression**: `shouldSuppress` — `GLOBAL` scope hard-blocks all mail (bounce/complaint/
  admin/minor/missing-consent); `MARKETING`/`subscribed===false` blocks marketing only;
  transactional bypasses MARKETING but still honors GLOBAL. **Marketing re-checks suppression
  at send time.**
- **Unsubscribe (RFC 8058)**: marketing mail with a `listType` gets `List-Unsubscribe` +
  `List-Unsubscribe-Post: One-Click` headers (`listUnsubscribeHeaders`), pointing at
  `/api/email/unsubscribe/{token}` where the token is HMAC-signed (`TOKEN_HMAC_SECRET`).
- **Webhook idempotency**: `verifyResendSignature` (Svix-style HMAC, `RESEND_WEBHOOK_SECRET`);
  `mapResendEvent` maps events (bounce/complaint → GLOBAL suppress). Idempotency is enforced at
  the DB via unique keys: `EmailEvent.providerEventId`, `EmailMessage.providerMessageId`,
  `EmailCampaign.idempotencyKey`. Preserve these constraints.
- **Preferences** (`preferences.ts`) are opt-out and **never bypass suppression, one-click
  unsubscribe, or transactional rules.**

## URLs — configured origin, never hard-coded

Email links derive from **`NEXT_PUBLIC_SITE_URL`** (validated in `env.ts`). Never hard-code a
production URL or send transactional/marketing mail whose links point at a raw `*.vercel.app`
host — use the configured origin. When adding a new link builder, interpolate
`env.NEXT_PUBLIC_SITE_URL` (consider a shared helper rather than repeating the base inline).

## Implementation rules

1. Send only via `sendEmail` / `sendTemplated`. Never instantiate a second Resend client or a
   parallel mailer.
2. New templates: add a keyed entry to the registry (and a DB `EmailTemplate` where admin-
   editable); render through `renderTemplate`. Keep template keys stable and set `wired`.
3. Never place raw, unescaped user content in email HTML — only `{{var}}` through the escaper.
4. Respect suppression and unsubscribe on every send; marketing must include the RFC 8058
   headers. Never send marketing to a GLOBAL/MARKETING-suppressed or unsubscribed address.
5. Webhook ingestion must verify the signature and stay idempotent via the unique DB keys.
6. Do not let an email error roll back the primary mutation (mirror the existing try/catch).

## Prohibited patterns (reject in review)

- A second email sender / mailer / template engine.
- Unescaped user content or template expression evaluation.
- Bypassing `shouldSuppress`, one-click unsubscribe, or the transactional/marketing rules.
- Hard-coded production URLs, or transactional mail from an unauthenticated `vercel.app` sender.
- Dropping the `@unique` idempotency keys or re-processing webhook events non-idempotently.

## Verification requirements

- Extend `src/tests/email-render.test.ts`, `email-safety.test.ts`, `email-templates.test.ts`
  for escaping/suppression/template changes.
- Run `npm run typecheck` and `npm run test`. For deliverability (SPF/DKIM/DMARC/webhook),
  follow `mckinney-sda-production-readiness` — those are `[verify]` steps, not code.
