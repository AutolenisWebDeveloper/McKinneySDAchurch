# CLAUDE.md — McKinney Seventh-day Adventist Church Platform

Operational guide for working in this repository. Read this before implementing anything.

## What this is

A Next.js 16 (App Router) · TypeScript · PostgreSQL + Prisma · NextAuth · Resend platform
for the McKinney SDA Church: a public website plus an authenticated, multi-role, six-portal
member/leadership application. See `README.md`, `LAUNCH.md`, and `IMPLEMENTATION_STATUS.md`
for what is built vs. remaining.

## Source of truth

- The **Authoritative Master Implementation Directive** (Master Plan v4, tracked in
  `IMPLEMENTATION_STATUS.md` and `README.md`) governs the *target* product.
- The **actual repository state must always be inspected before implementation.** Skills and
  docs describe intent; the code in `src/`, `prisma/schema.prisma`, and the migrations are the
  ground truth. When a doc and the code disagree, trust the code and flag the drift.

## Required execution pattern

```
DISCOVER → TRACE REQUIREMENT → SELECT RELEVANT SKILLS → DESIGN
  → TEST RISKY LOGIC → IMPLEMENT → VALIDATE → REVIEW → FIX → REVALIDATE
```

Do not skip DISCOVER. Do not declare completion at IMPLEMENT.

## Search-before-create

Before creating any model, component, service, route, helper, workflow, notification
mechanism, or email path:

```
SEARCH → REUSE → EXTEND → MIGRATE → CREATE
```

Only `CREATE` when a search of `src/lib`, `src/app`, `src/components`, and
`prisma/schema.prisma` shows nothing to reuse or extend. New architecture that parallels an
existing system is a defect, not a feature.

## Architectural invariants (exactly one of each)

- **One authorization architecture** — `src/lib/rbac.ts` (+ `roles.ts`, `user-roles.ts`,
  `rbac-search.ts`). No authorization logic anywhere else.
- **One WorkItem architecture** — `src/lib/workitems.ts` / `workflow.ts` / `routing.ts` for
  CARE, PRAYER, LEADERSHIP_MESSAGE, CONTACT, SUPPORT, VOLUNTEER, SPONSOR. No second ticketing
  engine.
- **One notification architecture** — `src/lib/notify.ts` + the `Notification` model.
- **One email architecture** — `src/lib/email*.ts` (Resend + the template registry).
- **One portal design system** — `src/components/portal/*` + the design tokens in
  `tailwind.config.ts` / `src/app/globals.css`.
- **One Weekly Packet architecture** — `src/lib/weekly-packets.ts`; Bulletin and
  OrderOfService live *inside* it, not beside it.
- **One document architecture** — the `Document` model + its visibility gate.
- **One audit architecture** — `src/lib/audit.ts` + the `AuditLog` model.

## Permanent boundaries — never weaken

- **Safeguarding** — minors cannot self-register; no minor exposure in directory, search,
  export, or marketing; volunteer screening (`VolunteerScreening = CLEARED`, unexpired) gates
  any scheduling with minors. See skill `mckinney-sda-safeguarding`.
- **Privacy** — data minimization; sensitive fields encrypted (`src/lib/crypto.ts`,
  AES-256-GCM); never log/URL/audit plaintext sensitive data.
- **RBAC** — server-side, deny-by-default; **portal context is presentation state, never
  authorization state**; authorize from the full active role set.
- **Encryption** — prayer requests, pastoral notes, board minutes, MFA secrets are encrypted
  at rest; `ENCRYPTION_KEY` rotation destroys existing ciphertext.
- **Auditing** — privileged mutations write an `AuditLog` entry (without sensitive plaintext).
- **Email safety** — suppression re-checked at send time; RFC 8058 one-click unsubscribe;
  webhook idempotency; escape user content; links derive from the configured origin.
- **AdventistGiving-only payment boundary** — giving is an external redirect to
  `ADVENTIST_GIVING_URL`; **no card/ACH/payment processing is ever added locally.** See skill
  `mckinney-sda-giving-boundary`.

## Project Skills

Domain invariants are encoded as project Skills in `.claude/skills/`. Select the relevant
ones during the SELECT step above:

| Concern | Skill |
|---|---|
| Canonical architecture / anti-duplication | `mckinney-sda-architecture` |
| Authorization & RBAC | `mckinney-sda-rbac-security` |
| Data privacy & encryption | `mckinney-sda-data-privacy` |
| Member/Household model | `mckinney-sda-member-households` |
| Minor safeguarding | `mckinney-sda-safeguarding` |
| WorkItem workflows | `mckinney-sda-workflows` |
| Weekly communications | `mckinney-sda-weekly-communications` |
| Governance / Church Secretary | `mckinney-sda-governance` |
| Email pipeline | `mckinney-sda-email-communications` |
| Giving boundary | `mckinney-sda-giving-boundary` |
| Frontend / UX / a11y | `mckinney-sda-frontend-design` |
| Database / Prisma | `mckinney-sda-database-prisma` |
| Testing / QA | `mckinney-sda-testing-qa` |
| Post-implementation review | `mckinney-sda-code-review` |
| Launch verification | `mckinney-sda-production-readiness` |

These encode **domain-specific invariants only**. Generic Next.js/React/TypeScript/Prisma/
debugging/accessibility engineering is covered by Claude Code's built-in capabilities — use
those alongside these Skills rather than expecting the Skills to repeat generic advice.

## Capability hierarchy & Skill composition

Work here draws on layered capabilities. Higher layers set **intent**; the **bottom layer is
the only one that actually enforces anything.**

1. **Authoritative Master Implementation Directive** — defines the target product (see *Source
   of truth*).
2. **Project invariants & requirements** — the boundaries/architecture in this file and the
   McKinney SDA Skills. Govern **what** must be preserved.
3. **Superpowers** — engineering execution layer (repo exploration, requirements analysis,
   planning, TDD, systematic debugging, root-cause analysis, implementation, verification/
   independent review). Governs **how** engineering work is executed. **Not installed in this
   environment as of 2026-08-11** — a session must **re-verify** (search `~/.claude/skills`,
   project `.claude/skills`, `~/.claude/plugins`) and use it only if actually present, per its
   own instructions. Never invent its Skill names or claim to have used it when absent.
4. **Impeccable** — frontend/UX/design-quality layer (information architecture, visual
   hierarchy, layout, typography, spacing, responsive, navigation, forms, tables, dialogs,
   states, a11y, critique). Governs **frontend/UX execution quality**, working **inside** the
   McKinney SDA design system and tokens. **Not installed in this environment as of
   2026-08-11** — re-verify each session; use only if present. It may raise implementation
   quality but must never change brand tokens, portal architecture, navigation
   responsibilities, RBAC, workflows, communication architecture, safeguarding, the
   AdventistGiving boundary, or approved terminology — and must not change business logic for
   visual convenience.
5. **McKinney SDA project Skills** (`.claude/skills/`) — repository-specific architecture,
   RBAC, privacy, safeguarding, workflows, communications, governance, database, testing, and
   production rules.
6. **Automated controls** — TypeScript (`npm run typecheck`), tests (`npm run test`), Prisma
   schema constraints + migrations, server-side authorization (`src/lib/rbac.ts`), and CI
   (`.github/workflows/ci.yml`). **This layer is the actual enforcement.**

Superpowers and Impeccable govern *execution quality*; they do **not** override McKinney
invariants. When installed, compose them **with** the project Skills — they are not mutually
exclusive.

### Skill selection (before every substantial task)

1. **Classify** the task. 2. **Inspect** which verified Skills apply. 3. **Read** the applicable
Skill instructions when needed. 4. **Select the smallest effective combination.** 5. **Execute.**
6. Use a **separate review/verification** capability where available. Don't invoke every Skill
mechanically; don't skip a relevant security, safeguarding, database, or verification Skill just
because an execution-layer package is active.

Common combinations (add the relevant Superpowers/Impeccable Skills **when installed**):

| Task | Project Skills to compose |
|---|---|
| Portal implementation/redesign | `architecture` + `rbac-security` + `frontend-design` + `testing-qa` |
| Care / Prayer / Leadership Messages | `workflows` + `rbac-security` + `data-privacy` + `safeguarding` + `email-communications` + `testing-qa` |
| Weekly comms / Sabbath brochure | `weekly-communications` + `email-communications` + `frontend-design` + `testing-qa` |
| Prisma / schema migration | `architecture` + `database-prisma` + `rbac-security` (if authz data) + `testing-qa` |
| Production-readiness review | `code-review` + `rbac-security` + `safeguarding` + `testing-qa` + `production-readiness` |

### Enforcement honesty

This file and the Skills are **guidance that shapes how work is done** — they do not by
themselves block anything. Real enforcement lives in code, database constraints, tests,
server-side authorization checks, and CI. Never describe a Skill or a CLAUDE.md instruction as
an enforcement mechanism.

## Validation commands (CI parity — `.github/workflows/ci.yml`)

```bash
npm run prisma:validate     # authoritative schema check
npx prisma generate
npx prisma migrate deploy    # apply committed migrations
npm run typecheck            # tsc --noEmit (quality gate; build has ignoreBuildErrors)
npm run test                 # vitest (schema + authorization + state-machine tests)
npm run build                # prerenders DB-backed pages
```

Note: `next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so **the build does not
gate types** — `npm run typecheck` is the real type gate. `npm run lint` is a no-op stub.

## Completion

Claude may **not** claim completion merely because code was generated or compiled. Completion
requires: the relevant validation commands actually executed and passing, security/safeguarding
review where the change touches protected surfaces, and concrete repository evidence. Never
claim a check passed unless it was actually run and succeeded.

## Scope discipline for this session's Skills work

Installing or editing Skills, CLAUDE.md, or `.claude/` config must **not** change application
runtime behavior. Do not commit, push, merge, or deploy unless explicitly authorized.
