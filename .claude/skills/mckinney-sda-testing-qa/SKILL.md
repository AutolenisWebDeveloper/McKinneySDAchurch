---
name: mckinney-sda-testing-qa
description: >-
  The regression and verification strategy for the McKinney SDA platform. Use
  after implementing or changing any logic to decide what to validate and to
  run the right checks — Prisma validate/generate, migrations, typecheck,
  Vitest unit/integration, production build, and security-focused Playwright
  E2E. Enforces that no check is claimed as passing unless it actually ran.
  Trigger on: test, validate, verify, QA, regression, vitest, playwright, E2E,
  typecheck, build, "does it pass", coverage.
---

# McKinney SDA — Testing & QA

Completion requires evidence. Never claim a check passed unless it actually executed and
succeeded. Match the check to the change.

## The validation ladder (CI parity — `.github/workflows/ci.yml`)

Run the ones relevant to your change, in this order:

```bash
npm run prisma:validate      # schema correctness (after any schema edit)
npx prisma generate          # client regen (after schema edit)
npx prisma migrate deploy    # apply committed migrations to a real Postgres
npm run typecheck            # tsc --noEmit — the REAL type gate
npm run test                 # vitest run (unit + integration + state machines)
npm run build                # prerenders DB-backed pages (needs DATABASE_URL + env)
```

Notes:
- `npm run build` has `typescript.ignoreBuildErrors: true` — it does **not** gate types.
  `npm run typecheck` is the type gate. `npm run lint` is a no-op stub.
- CI provisions an ephemeral Postgres and generates throwaway secrets (`NEXTAUTH_SECRET`,
  `ENCRYPTION_KEY`, `TOKEN_HMAC_SECRET`, `CRON_SECRET`). Locally you need a `DATABASE_URL` and
  those env vars for `test`/`build`.

## What to test, by change type

- **Pure logic** (state machines, scoring, routing) — Vitest unit tests. These modules are
  deliberately I/O-free so they're directly testable: `workflow.ts`, `routing.ts`,
  `weekly-packet.ts`, `transfers.ts`, `approval.ts`, `baptism.ts`, `membership-match.ts`,
  `governance.ts`. Existing suites live in `src/tests/*.test.ts` — extend the matching one.
- **Authorization** — extend `rbac*.test.ts` / `roles.test.ts` and assert the **negative**
  case (denied), not just the allowed case.
- **Data/schema** — `schema.test.ts`; run `prisma validate` + apply the migration.
- **Email safety** — `email-render.test.ts`, `email-safety.test.ts`, `email-templates.test.ts`
  (escaping, suppression, unsubscribe).
- **Privacy/safeguarding** — `crypto.test.ts`, `minors.test.ts`.

## Security-focused E2E (Playwright)

Access-control and safeguarding changes require an E2E asserting the **negative path** — that
the wrong actor is blocked. Cover, where relevant:

- cross-role access (a role that must not reach a resource)
- cross-ministry access (a `MINISTRY_HEAD` outside their `ministryScope`)
- direct-URL access (hitting a route/id without going through the UI)
- revoked/stale roles (an `active:false` UserRole grants nothing)
- private documents (`DocumentVisibility` respected)
- confidential WorkItems (`LEADERSHIP_ONLY` / `SENSITIVE` not leaked)
- member ownership (a member can't read another member's data — IDOR)
- search leakage (unentitled scopes produce no title/snippet/count)
- minor-data leakage (no minor in directory/search/export)

Playwright is a dev dependency; browsers are pre-provisioned in this environment
(`/opt/pw-browsers`) — do not run `playwright install`.

## Rules

1. Add or extend a test with every behavior change; risky lifecycle/authorization/safeguarding
   changes are not "done" without a test that would fail on regression.
2. Prefer testing the pure module directly over an integration test when logic is pure.
3. Assert negative/denied paths for anything security-related.
4. Run the relevant ladder rungs and paste/verify real output. If a check couldn't run
   (e.g. no DB locally), say so explicitly — never imply it passed.

## Prohibited patterns (reject in review)

- Claiming typecheck/test/build/migration passed without running it.
- Shipping an authorization or safeguarding change with only a happy-path test.
- Moving risky logic out of a pure module in a way that makes it untestable.
- Treating a green `next build` as proof of type safety.

## Verification requirements

- The change's relevant ladder rungs are green, with the negative-path tests present for
  security-sensitive changes. State exactly which commands you ran and their result.
