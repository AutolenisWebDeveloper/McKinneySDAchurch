---
name: mckinney-sda-workflows
description: >-
  The single shared WorkItem workflow spine for the McKinney SDA platform. Use
  whenever building or changing any request/ticket/lifecycle feature — Care,
  Prayer, Message Leadership, Contact, Support, Volunteer, or Sponsor — or their
  routing, assignment, status transitions, notes, messages, or notifications.
  Prevents building a second ticketing engine. Trigger on: WorkItem, ticket,
  request lifecycle, triage, assignment, status transition, routing, follow-up,
  care request, prayer request, support request, volunteer application.
---

# McKinney SDA — Shared WorkItem Workflow

All request-style communications run on **one** WorkItem spine. Do **not** create a parallel
ticket/workflow engine for any category. The canonical lifecycle:

```
REQUEST → ACKNOWLEDGEMENT → ROUTING → ASSIGNMENT → NOTIFICATION
  → ACTION → STATUS → FOLLOW-UP → RESOLUTION → HISTORY
```

## What to inspect before changing anything

- `src/lib/workflow.ts` — **pure** lifecycle: `ALLOWED` transition graph, `canTransition`,
  `evaluateTransition`, `assertTransition`, `WorkflowError`, `TERMINAL_STATUSES`.
- `src/lib/routing.ts` — **pure** routing: `BASE_ROUTES`, `routeWorkItem`.
- `src/lib/workitems.ts` — the DB-bound service: `createWorkItem`, `transitionWorkItem`,
  `addWorkItemNote`, `addWorkItemMessage`, `staffWorkItemLink`, `labelForType`.
- `src/lib/notify.ts` — `notify`, `notifyRoles`, `unreadCount`, `markRead`, `markAllRead`.
- `src/components/portal/WorkItemDetail.tsx` — the shared read/triage UI.
- `prisma/schema.prisma` — `WorkItem`, `WorkItemNote`, `WorkItemEvent`, `WorkItemMessage`,
  `WorkItemAttachment`, `Notification`, and the WorkItem enums.

## The model (use these exact values)

- **`WorkItemType`**: `CARE`, `PRAYER`, `LEADERSHIP_MESSAGE`, `SUPPORT`, `VOLUNTEER`,
  `SPONSOR`, `CONTACT`. Every request category maps to one of these — do not add a new
  parallel model for a new category; add a type or reuse one.
- **`WorkItemStatus`**: `NEW`, `TRIAGED`, `ASSIGNED`, `IN_PROGRESS`, `FOLLOW_UP`,
  `NEEDS_INFO`, `RESOLVED`, `CLOSED` (CLOSED is terminal). Transitions are governed by the
  `ALLOWED` graph in `workflow.ts` — never bypass it.
- **`WorkItemPriority`**: `LOW`, `NORMAL`, `HIGH`, `URGENT`.
- **`WorkItemConfidentiality`**: `NORMAL`, `SENSITIVE`, `LEADERSHIP_ONLY`.
- Request bodies are AES-256-GCM encrypted into `WorkItem.bodyEncrypted`; notes into
  `WorkItemNote`. Messages (`WorkItemMessage`, `INBOUND`/`OUTBOUND`) are plaintext by design.
- Every change appends a `WorkItemEvent` (`CREATED`, `STATUS_CHANGE`, `ASSIGNED`,
  `NOTE_ADDED`, `MESSAGE`) — that event log **is** the HISTORY step. Never mutate state
  without recording an event.

## Implementation rules

1. Create requests only via `createWorkItem` — it routes (`routeWorkItem`), encrypts the body,
   writes the `CREATED` event, and fans out `notifyRoles` (ACKNOWLEDGEMENT + NOTIFICATION).
2. Change status only via `transitionWorkItem` — it authorizes (`canManageWorkItem`), validates
   through `assertTransition`, applies optimistic concurrency (`updateMany` on `{id, updatedAt}`;
   `STALE` on conflict), appends the event, writes an audit entry, and notifies. Respect the
   transition guards: `ASSIGNEE_REQUIRED` (→ASSIGNED), `FOLLOW_UP_DATE_REQUIRED` (→FOLLOW_UP),
   `REASON_REQUIRED` (→NEEDS_INFO), `CLOSE_REASON_REQUIRED` (→RESOLVED/CLOSED).
3. Routing is policy, not ad hoc: `CARE`/`PRAYER` → PASTOR/ELDER (URGENT adds PASTOR);
   `LEADERSHIP_MESSAGE` → PASTOR/ELDER/ADMIN; `SUPPORT`/`CONTACT`/`SPONSOR` → ADMIN;
   `VOLUNTEER` → ADMIN, ministry-scoped (adds MINISTRY_HEAD when a ministry is set). Change
   routing only in `routing.ts`.
4. Access is enforced by `mckinney-sda-rbac-security` — use `canReadWorkItem`,
   `canManageWorkItem`, `canMessageWorkItem`. `LEADERSHIP_ONLY` narrows to PASTOR/ELDER/ADMIN.
5. Notifications flow only through `notify.ts` + the `Notification` model — never a second
   notification table or channel. Include a `deepLink` (use `staffWorkItemLink`).

## Prohibited patterns (reject in review)

- A new model/table/service that re-implements tickets, routing, or notifications for one
  category (Care, Support, Volunteer, etc.).
- Direct status writes that skip `assertTransition` / the `ALLOWED` graph.
- Mutating a WorkItem without appending a `WorkItemEvent`.
- Storing sensitive request bodies or notes in plaintext (must use `encryptField`).
- Re-deriving routing roles inline instead of calling `routeWorkItem`.
- A second notification mechanism.

## Verification requirements

- Risky lifecycle/routing changes require **pure** state-machine tests — extend
  `src/tests/workflow.test.ts`, `src/tests/routing.test.ts`. Keep `workflow.ts`/`routing.ts`
  I/O-free so they stay unit-testable.
- Assert the guard codes and terminal-state behavior; assert routing per type including
  URGENT and ministry-scoped VOLUNTEER.
- Run `npm run test` and `npm run typecheck` before claiming done.
