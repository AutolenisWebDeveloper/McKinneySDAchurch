---
name: mckinney-sda-code-review
description: >-
  Independent post-implementation review for the McKinney SDA platform. Use
  after code has been written/changed — before considering it done or opening a
  PR — to review the actual diff against the repo's architecture and invariants.
  Reviews correctness, duplication, security/RBAC, data exposure, migration
  safety, concurrency, accessibility, tests, and requirement completeness. The
  implementer's own successful compile is NOT sufficient review. Trigger on:
  code review, review my changes, before PR, is this correct, check the diff.
---

# McKinney SDA — Post-Implementation Code Review

Review the **actual diff** and the surrounding architecture — independently. Successful
compilation is not review. Start from `git diff` (and the diff against the base branch), then
read the changed files in context.

## How to run the review

1. `git status` + `git diff` (and diff vs. the default branch) to see the true change set.
2. For each changed area, load the relevant domain Skill and check the change against its
   invariants and prohibited-patterns list.
3. Read the surrounding code, not just the diff lines — confirm the change composes with
   existing helpers rather than duplicating them.
4. Report findings ranked by severity with file:line and a concrete failure scenario.

## Review checklist

**Correctness**
- Logic matches the requirement; edge cases and error paths handled; no dead/unreachable code.

**Architecture & duplication** (`mckinney-sda-architecture`)
- No parallel system introduced; existing `src/lib` helpers reused; SEARCH→REUSE→EXTEND honored.
- Pure logic stays pure and tested; services reuse `writeAudit`/`notify`.

**Security & RBAC** (`mckinney-sda-rbac-security`)
- Every protected read/write authorizes via `rbac.ts`; deny-by-default; no inline auth.
- No authorization on portal/URL/client input; ministry scope checked; no IDOR.
- Confidential WorkItems / documents / search gated server-side; revoked roles grant nothing.

**Data exposure & privacy** (`mckinney-sda-data-privacy`, `mckinney-sda-safeguarding`)
- Sensitive fields encrypted; no plaintext in logs/URLs/audit metadata/notifications/analytics.
- Minors excluded from directory/search/export/marketing; screening gates work with minors.

**Migration safety** (`mckinney-sda-database-prisma`)
- Additive/backfilled, not destructive; SQL reviewed; enums/constraints/indexes correct;
  idempotency keys and concurrency guards intact.

**Communications** (`mckinney-sda-email-communications`, `mckinney-sda-workflows`,
`mckinney-sda-weekly-communications`)
- One sender/template path; user content escaped; suppression + one-click unsubscribe honored;
  links from configured origin. WorkItem/packet lifecycle uses the shared spine + events.

**Giving** (`mckinney-sda-giving-boundary`)
- No local payment/card/ACH; giving remains an AdventistGiving redirect.

**Error handling & concurrency**
- Failures don't corrupt state; email/notify failures don't void the mutation; hot writes use
  version/unique guards.

**Performance**
- No N+1 in loops (use `include`/`select`/batch); indexes exist for new query paths.

**Accessibility & responsive** (`mckinney-sda-frontend-design`)
- Tokens (no raw hex); labeled forms; visible focus; loading/empty/error states; AA contrast in
  both themes; i18n strings.

**Tests** (`mckinney-sda-testing-qa`)
- Behavior change has a test; security/safeguarding changes have negative-path tests; the
  relevant validation ladder was actually run.

**Maintainability & completeness**
- Matches surrounding style/naming; the requirement is fully met (not partially scaffolded);
  no TODO left where behavior is expected.

## Output

- Findings most-severe first, each with file:line, the concrete failure it causes, and a fix.
- Explicitly confirm which invariants you verified and which checks were run.
- If nothing blocking remains, say so — but only after checking the lists above, not because it
  compiled.
