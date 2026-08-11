---
name: mckinney-sda-rbac-security
description: >-
  Authorization and RBAC for the McKinney SDA platform. Use whenever code reads,
  writes, or gates access to any protected resource — dashboard routes, server
  actions, API routes, WorkItems, members, documents, governance, transfers,
  giving, search, or roles. Encodes the real authorization architecture in
  src/lib/rbac.ts and enforces the invariant that portal context is presentation
  state, never authorization state. Trigger on: auth, permission, role, RBAC,
  "can this user", IDOR, privilege escalation, portal access, ministry scope.
---

# McKinney SDA — RBAC & Authorization

Authorization is centralized. **`src/lib/rbac.ts` is the ONLY place authorization decisions
are made.** Never re-implement access checks in a page, component, action, or route — call the
shared helpers. Deny by default.

## What to inspect before changing anything

- `src/lib/rbac.ts` — the `Actor` type, `hasRole`/`requireRole`, resource policies, and the
  central `can(actor, action, resource?)` switch (default `return false`).
- `src/lib/roles.ts` — `PortalKey`, `PORTAL_ROLES`, `canAccessPortal`, `portalsForRoles`,
  `primaryPortal`, `ROLE_RANK` (ranking is for default-portal selection only — **not** a
  permission hierarchy).
- `src/lib/user-roles.ts` — the ONLY writers of `UserRole`: `assignRole`, `revokeRole`,
  `activeRolesByUser`.
- `src/lib/rbac-search.ts` — `searchScopesForRoles`, `canSearchScope`.
- `src/auth/actor.ts` — `getActor`, `requireActor(...roles)`, `requirePortal(portal)`.
- `prisma/schema.prisma` — `Role`, `UserRole`, `User`, `WorkItemConfidentiality`.

## The role model

`Role` enum (login roles): `MEMBER`, `MINISTRY_HEAD`, `ELDER`, `CLERK`, `TREASURER`, `ADMIN`,
`PASTOR`. `CLERK` is the **Church Secretary**.

- **`UserRole` is the authoritative source of truth for authorization.** A user may hold many
  active roles (e.g. MEMBER + ELDER + MINISTRY_HEAD). Authorization derives from the **full
  active role set**, obtained via `actorRoles(actor)`.
- `UserRole.active` is the revoked flag; `revokeRole` sets `active:false` + `revokedAt` and
  **keeps the row for history** (never hard-delete role history). Active uniqueness is enforced
  by partial unique indexes (`WHERE active`), not a Prisma `@@unique`.
- Ministry-scoped roles carry a `ministryId`; global roles have `ministryId = null`. A
  `MINISTRY_HEAD` is limited to `ministryScope(actor)` — check `ministryScope(a).includes(res.ministryId)`.
- `User.role` / `User.primaryRole` are **legacy/back-compat + default-portal only**. `getActor`
  falls back to `[user.role]` only when there are no active `UserRole` rows, and always unions
  in `MEMBER`.
- `ELDER`, `DEACON`, `DEACONESS`, etc. as *officer records* are the `OfficerRole` governance
  enum — distinct from login `Role`. `ELDER` is not in `INVITABLE_ROLES`.

## Critical invariant — portal ≠ authorization

**Portal context is presentation state, never authorization state.** Portals (`member`,
`ministry`, `leadership`, `clerk`, `treasurer`, `admin`) are derived from the URL
(`portalFromPath`) and used only to render nav/chrome. Never authorize on "which portal the
user is in." `requirePortal` exists for redirect/UX; real authorization is still enforced in
every page and action via `rbac.ts`. Nav visibility (`portal-nav.ts`) is filtered for
presentation and does not grant access.

## Implementation rules

1. **Every** server action, API route, and dashboard page that touches a protected resource
   calls `getActor()` then a `rbac.ts` gate — no exceptions, no client-trust.
2. Gate by role with `requireRole(actor, ...)` / `hasRole`; gate actions with
   `can(actor, action, resource)`; gate resources with the specific policy
   (`canReadWorkItem`, `canReadMember`, `canManageGiving`, `canManageTransfer`,
   `canManageRoles`, `canManageDependent`, …).
3. Resource reads/writes must pass the actual resource so ownership/scoping is checked —
   `can()` returns `false` when a resource-scoped action is called without a resource.
4. WorkItem confidentiality: `LEADERSHIP_ONLY` narrows the allowed role set to
   `PASTOR`/`ELDER`/`ADMIN` (see `rolesAllowedForItem`). Respect `canReadWorkItem` /
   `canManageWorkItem` / `canMessageWorkItem`; never bypass by loading a WorkItem directly.
5. Search must authorize **before** producing any title, snippet, or count — use
   `searchScopesForRoles` / `canSearchScope` (`src/lib/rbac-search.ts`).
6. Role changes go only through `src/lib/user-roles.ts` (transactional, audited, notifies the
   user). Never write `UserRole` rows ad hoc.
7. MFA (`src/lib/mfa.ts`, TOTP) is for `ADMIN`/`PASTOR`; secrets are encrypted at rest.

## Prohibited patterns (reject in review)

- Authorization logic outside `src/lib/rbac.ts` (inline role string checks in pages/actions).
- Authorizing on active portal, URL segment, cookie, or client-supplied role.
- Trusting `User.role` when active `UserRole` rows exist; ignoring `active`/`revokedAt`
  (stale/revoked-role access).
- Loading a resource by id and returning it without an ownership/scope check (**IDOR**).
- `MINISTRY_HEAD` access without a `ministryScope` check (cross-ministry access).
- Fetching confidential WorkItems, members, documents, or search results and filtering on the
  client.
- Hard-deleting `UserRole` history.
- A new `switch`/policy that returns "allow" by default — deny by default, always.

## Verification requirements

- Add/extend Vitest coverage in `src/tests/rbac*.test.ts`, `roles.test.ts` for any new policy.
- For access-control changes, add a security E2E asserting the negative case (wrong role,
  revoked role, cross-ministry, direct-URL, confidential leakage) — see
  `mckinney-sda-testing-qa`.
- Run `npm run typecheck` and `npm run test`. Never claim an authorization change is safe
  without the negative-path test actually passing.
