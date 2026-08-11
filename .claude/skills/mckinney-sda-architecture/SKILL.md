---
name: mckinney-sda-architecture
description: >-
  Guards the canonical architecture of the McKinney SDA platform and prevents
  duplicate systems. Use at the START of any structural change — a new model,
  service, route, portal, workflow, notification path, email path, document
  store, or "system" of any kind — to decide whether to reuse/extend existing
  architecture instead of creating a parallel one. Trigger on: new feature,
  new module, "add a system for", architecture, where should this live,
  refactor, portal, workflow engine, notifications, avoid duplication.
---

# McKinney SDA — Architecture Guardian

Protect the canonical shape of the platform:

```
Public Website → Identity/Auth → Multi-Role RBAC → Resource Policy → Six Portals
  → Shared WorkItem / Notification / Email / Document / Search / Audit / Reporting
```

There is exactly **one** of each shared system. New architecture that parallels an existing
system is a defect. Before introducing structure, follow:

```
SEARCH → REUSE → EXTEND → MIGRATE → CREATE
```

Only reach `CREATE` after a real search shows nothing to reuse, extend, or migrate.

## Mandatory discovery before any structural change

1. `grep`/read `src/lib/` — the service layer already has a module for most concerns (see map).
2. Read `prisma/schema.prisma` for an existing model before adding one.
3. Read `src/app/` (routes) and `src/components/` (including `portal/`) for existing UI.
4. Check `IMPLEMENTATION_STATUS.md` and `README.md` for the intended design and what already
   exists vs. is scaffolded.
5. Only then design — and prefer extending a `src/lib` module over creating a sibling.

## The canonical systems (reuse these — do not duplicate)

| Concern | Canonical home | Skill |
|---|---|---|
| Authorization | `src/lib/rbac.ts` (+ `roles.ts`, `user-roles.ts`, `rbac-search.ts`) | `mckinney-sda-rbac-security` |
| Request/ticket workflows | `src/lib/workitems.ts` / `workflow.ts` / `routing.ts` | `mckinney-sda-workflows` |
| Notifications | `src/lib/notify.ts` + `Notification` model | `mckinney-sda-workflows` |
| Email | `src/lib/email*.ts` (Resend + registry) | `mckinney-sda-email-communications` |
| Portal shell / design system | `src/components/portal/*`, `tailwind.config.ts` | `mckinney-sda-frontend-design` |
| Weekly communications | `src/lib/weekly-packets.ts` (Bulletin/OOS inside) | `mckinney-sda-weekly-communications` |
| Documents | `Document` model + visibility gate | `mckinney-sda-data-privacy` |
| Account registration | `src/lib/account-requests.ts` + `membership-match.ts` | `mckinney-sda-member-households` |
| Members/Households | `Member`/`Household` models + `member-*` | `mckinney-sda-member-households` |
| Governance | `src/lib/governance.ts` / `committees.ts` | `mckinney-sda-governance` |
| Giving | external redirect only (`ADVENTIST_GIVING_URL`) | `mckinney-sda-giving-boundary` |
| Audit | `src/lib/audit.ts` + `AuditLog` model | `mckinney-sda-data-privacy` |

## The six portals

`member`, `ministry`, `leadership`, `clerk` (Church Secretary), `treasurer`, `admin`
(`src/lib/roles.ts`). Portals are **presentation state derived from the URL**, never an
authorization boundary. A new area of the app belongs inside an existing portal shell
(`src/components/portal/PortalChrome.tsx` + `portal-nav.ts`), not a bespoke layout.

## Pure-logic convention

Business rules that are risky (state machines, scoring, routing) live in **pure, I/O-free**
`src/lib` modules (`workflow.ts`, `routing.ts`, `weekly-packet.ts`, `transfers.ts`,
`approval.ts`, `baptism.ts`, `membership-match.ts`, parts of `governance.ts`) with Vitest
coverage; the service modules do the DB + audit + notify. Preserve this split when extending.

## Prohibited patterns (reject in review)

Introducing any of these as a *new* parallel system is forbidden — extend the canonical one:

- a second authorization system, or inline authorization outside `rbac.ts`
- a second workflow/ticket engine for a specific category
- a second notification system or table
- a second email pipeline or sender
- a second portal shell / layout system
- a competing Weekly Packet, Bulletin, or Order-of-Service architecture
- a second document store or visibility scheme
- a second account-registration / membership-matching path
- a second audit mechanism

## Verification requirements

- State explicitly which existing module you searched and why reuse/extend was insufficient
  before any `CREATE`.
- New pure logic ships with Vitest tests; new services reuse `writeAudit` and `notify`.
- Run `npm run prisma:validate`, `npm run typecheck`, `npm run test` after structural changes.
