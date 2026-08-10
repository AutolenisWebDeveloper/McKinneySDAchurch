# Implementation Status — McKinney SDA Platform

This is the honest manifest. It exists so nothing is *hidden*, even where it isn't yet *built*.
Read it before assuming any part is production-ready. Aligns to Master Plan v4 phases P0–P8,
now being extended to the merged Master Directive (Phases 1–10) starting with the Phase 1 keystone.

---

## Phase 7 — Email template administration + diagnostics (this pass)

Adds an admin-managed email template system (§38/§39) on top of the existing suppression-aware
Resend pipeline. Templates are safe `{{variable}}` documents — never code. A code **registry** is
the catalog of known keys/defaults; an admin **override** (stored in the DB, versioned) takes
precedence when active. The account-request lifecycle emails are wired through it.

**Verified end-to-end on real Postgres (smoke test):** a key resolves to its registry **default**;
an admin **override** takes precedence; rendering **escapes** variable values (`Jane <b>` →
`&lt;b&gt;`) while substituting links; a **deactivated** override falls back to the default; a
**version** snapshot is recorded; an unknown key resolves to null.

- ✅ `src/lib/email-render.ts` — pure safe renderer: `{{variable}}` substitution only (no expression
  evaluation), HTML-escaped into subject/HTML, verbatim into plain-text, missing vars render empty
  (never leaks `{{…}}`), HTML→text fallback. Table-tested (8 cases: substitution, escaping/injection,
  missing vars, no-eval, text body, variable extraction).
- 🟡 Schema: `EmailTemplate` (key-unique override: subject/html/text, category, channel, active) +
  `EmailTemplateVersion` (edit history). Additive migration.
- 🟡 `src/lib/email-registry.ts` — catalog of transactional templates (account ×4 wired, system.test,
  plus care/transfer/weekly catalog entries) with documented variables and code defaults.
- 🟡 `src/lib/email-templated.ts` — `resolveTemplate(key)` (active DB override → registry default) and
  `sendTemplated(key, to, vars)` through the existing `sendEmail` (suppression + RFC 8058 preserved);
  **best-effort** so an email failure never voids a caller's state change.
- 🟢 Account-request emails (received / approved / needs-info / rejected) now send via
  `sendTemplated` — so editing those templates has a live effect.
- 🟡 **Admin catalog** `/dashboard/admin/email/templates` (grouped by category; In-use / Customized /
  active badges) + **editor** `/[key]` — subject/HTML/text editing, documented variables, **live
  preview** (rendered with sample vars), **send test to me**, activate/deactivate override, reset to
  default, and **version history**. All edits audited.
- 🟡 **Diagnostics** `/dashboard/admin/email/diagnostics` — sent/failure counts (30d), provider
  status, recent per-recipient messages with status (failures highlighted), and a **sender-domain
  check** that warns when `MAIL_FROM` is a `vercel.app` address (SPF/DKIM/DMARC launch-gate, §38/§64).
- 🟡 Nav: Email Templates added to the Admin portal.

**Verified:** typecheck clean; **181/181 tests** (+8); production build clean; migration applies on
real Postgres; template resolution / override / escaping / fallback / versioning smoke-tested end-to-end.

---

## Phase 6 — Governance: committees, motions, action items, Church Manual (this pass)

Extends the existing ChurchOffice/BoardMeeting foundation into a working governance system
(§31–§33, §35): committees with rosters, motions with vote tallies, tracked action items,
encrypted secretary notes, and an authorized Church Manual accessible from every portal.

**Verified end-to-end on real Postgres (smoke test):** committee create with authz (a plain member
is **blocked**), roster add/remove (soft), archive; a motion tally computes **CARRIED** from a 6–2–1
vote; action items and an **encrypted** secretary note round-trip; the Church Manual enforces
**exactly one active version**; audit rows recorded.

- ✅ `src/lib/governance.ts` — added pure `tallyMotion` (majority carries; abstentions don't count;
  tie fails; no votes = pending), `canActionItemTransition` / `isActionItemClosed`, and
  `committeeSlug`. Table-tested (8 governance cases total).
- 🟡 Schema: `Committee` + `CommitteeMember` (archived, not deleted); `Motion` (aggregate vote
  counts + result); `ActionItem` (meeting- or committee-linked, owner, due date, status);
  `SecretaryNote` (encrypted at rest); `ChurchManualVersion`; `BoardMeeting` gains
  location/attendees/excusedAbsences + optional committee link. Additive migration.
- 🟡 `src/lib/committees.ts` — create / archive / add-member / remove-member (soft), gated to
  ADMIN/PASTOR/CLERK, audited.
- 🟡 **Committees** `/dashboard/admin/committees` (+ `/[id]` workspace) — roster (adult picker,
  Chair/Secretary/Member roles), action items (add / mark done / reopen), encrypted notes; archive/restore.
- 🟡 **Board meeting** `/dashboard/admin/board/[id]` rebuilt — meeting details (location/attendees/
  excused), **motions** (add + record for/against/abstain → auto-tally, or table/withdraw), **action
  items**, encrypted **minutes** (approval still locks), and **secretary notes**. CLERK (secretary)
  now has access alongside ADMIN/PASTOR.
- 🟡 **Church Manual** `/dashboard/admin/manual` (add version by official link + effective date +
  release notes; make-current enforces one active) and `/dashboard/manual` viewer available to **every
  authenticated portal** (§35). Copyright-safe: links the authorized PDF, never scrapes text.
- 🟡 Nav: **Church Manual** added to all six portals; **Committees** to Secretary + Admin.

**Deferred (documented):** the full **Document Management Center** (§34) — upload center/browser,
categories/tags/folders, version history, and secure signed downloads via Vercel Blob — is a focused
follow-up. The Church Manual and meeting/committee records use official links / encrypted text for now;
attachment upload + authorized download will layer on the existing `Document` model + `lib/storage`.

**Verified:** typecheck clean; **173/173 tests** (+4); production build clean; migration applies on real
Postgres; committees / motions / action items / secretary notes / Church Manual smoke-tested end-to-end.

---

## Phase 5 — Membership Transfers rework (this pass)

Corrects the transfer intake architecture (§29) and adds member confirmation for on-behalf transfers.
eAdventist stays the record of truth. **Transfer IN** remains public; **Transfer OUT** self-service
moves to the authenticated Member Portal; **leadership-on-behalf** outgoing transfers require a
consent attestation and the member's confirmation before processing.

**Verified end-to-end on real Postgres (smoke test):** public incoming (token issued); member
self-service outgoing (SUBMITTED, initiatedVia MEMBER); leadership on-behalf →
AWAITING_MEMBER_CONFIRMATION with consent attested + confirmation token; member **denies** → DISPUTED,
which **blocks an ordinary clerk** but a **pastor can override** to review; a stranger **cannot**
confirm someone else's transfer; member **confirms** → IN_REVIEW → HANDED_TO_EADVENTIST (ref) →
COMPLETED.

- ✅ `src/lib/transfers.ts` — expanded pure state machine with `AWAITING_MEMBER_CONFIRMATION`,
  `NEEDS_INFO`, `DISPUTED` + guards (`requiresMemberConfirmation`, `initialTransferStatus`,
  `isOrdinaryProcessingLocked`, `isTransferTerminal`). Table-tested (9 cases).
- 🟡 Schema: `TransferStatus` gains the three states; `MembershipTransfer` gains consent-attestation
  fields (`onBehalf`, `consentAttested`, `consentMethod`, `consentDate`, `consentNotes`,
  `consentDocumentId`, `attestedById`), `requesterUserId`, `confirmationTokenDigest` (unique),
  `memberConfirmedAt`, `disputedAt`. Additive migration.
- 🟡 `src/lib/membership-transfers.ts` — service: `createIncomingTransfer` (public), `createOutgoingSelf`
  (member), `createOnBehalf` (leadership + consent → AWAITING + confirm token), `memberConfirmTransfer`
  / `memberDenyTransfer` (portal **or** tokenized link; **requires actor-or-token**; DISPUTED on deny),
  `advanceTransfer` (clerk pipeline; **DISPUTED is leadership-only**). Transactional, audited, notifies
  Secretary/leadership, emails at each step.
- 🟡 **Public `/transfer`** is now INCOMING-only (anonymous outgoing removed) and points members to the
  portal. **Public `/transfer/confirm/[token]`** lets an account-less member confirm/decline.
- 🟡 **Member Portal `/dashboard/member/transfer`** — outgoing self-service, "awaiting your
  confirmation" (confirm/deny), and "my transfers" with status; nav entry.
- 🟡 **Secretary/clerk pipeline** — new statuses in the queue, a **DISPUTED lock** (leadership-only
  override), and a **leadership on-behalf** form with a required consent attestation checkbox +
  method/notes.
- 🟡 Emails: incoming/outgoing received, confirmation request, confirmed, disputed notice, completed —
  HTML-escaped.
- 🟢 **Security fix (found via smoke):** member confirm/deny now requires either a valid confirmation
  token or the member's own session, and a token-only (account-less) confirmation records no audit FK
  (previously a transfer id was mis-used as `actorId`).

**Verified:** typecheck clean; **169/169 tests**; production build clean; migration applies on real
Postgres; all transfer flows (incoming, self-service, on-behalf, confirm, deny/dispute, override,
authorization, completion) smoke-tested end-to-end.

---

## Phase 3 — Weekly Communications engine (this pass)

Implements the §22/§23 weekly bulletin pipeline: one `WeeklyPacket` per Sabbath collects ministry
submissions, a pure readiness score tracks completeness, admins review submissions and assemble the
Sabbath program (the existing **Bulletin** is linked as the order-of-service component, §60), and
the packet moves COLLECTING → IN_REVIEW → READY → PUBLISHED → ARCHIVED.

**Verified end-to-end on real Postgres (smoke test):** a ministry head submits to their own ministry
(cross-ministry submission is **forbidden**); "nothing this week" is recorded; readiness recomputes
(53% with 2/3 ministries responded → 73% once an order-of-service item exists); an admin accepts a
submission and the submitter is notified; the version-guarded lifecycle reaches PUBLISHED (the linked
Bulletin is auto-approved, `publishedAt` set); a stale-version transition is rejected.

- ✅ `src/lib/weekly-packet.ts` — pure `computeReadiness` (department response 80% + order-of-service
  20%; NOTHING_THIS_WEEK counts, REJECTED doesn't, de-dupes) + `canPacketTransition` state machine +
  `upcomingSabbath`. Table-tested (9 cases).
- 🟡 Schema: `WeeklyPacket` (sabbathDate-unique, status, readinessScore, version, optional 1:1
  `Bulletin` link) + `PacketSubmission` (kind, status, ministry, submitter). Additive migration.
- 🟡 `src/lib/weekly-packets.ts` — service: `getOrCreatePacket`, `submitToPacket` (ministry-scoped,
  audited, notifies admins), `reviewSubmission` (accept/reject/needs-info → notify + email submitter),
  `markNothingThisWeek`, `linkBulletinForPacket`, `recomputeReadiness`, `transitionPacket`
  (version-guarded; publish approves the Bulletin + emails ministry heads). All transactional/audited.
- 🟡 **Ministry Head:** `/dashboard/ministry/submit` — submit announcement/event/Sabbath-program-item/
  participant/ministry-update or "nothing this week"; "my submissions this week" with status; home
  quick action + nav.
- 🟡 **Admin console:** `/dashboard/admin/weekly` (list + readiness bars) and `/dashboard/admin/weekly/[id]`
  — readiness meter, **department checklist** (missing highlighted), per-submission accept/reject/
  needs-info, create/link order-of-service, bulletin preview of accepted items, and the lifecycle
  buttons. Nav + admin home stat card ("Bulletin readiness").
- 🟡 **Weekly request cron:** `ministry-head-reminder` now ensures the packet exists and emails active
  ministry heads a link to submit (uses `weeklyRequestEmail`; queries the multi-role `UserRole`).
- 🟡 Emails: weekly request, submission accepted/rejected/needs-info, packet published — HTML-escaped.

**Remaining:** professional **PDF brochure generation** (§37, P1) — the console shows a web preview of
the assembled program; PDF export is a focused follow-up. Public brochure rendering stays on the
existing `/bulletin` page (order of service) for now.

**Verified:** typecheck clean; **157/157 tests** (+9); production build clean; migration applies on
real Postgres; full submit → review → assemble → publish lifecycle smoke-tested end-to-end.

---

## Phase 4 — Care, Contact, Message Leadership on the WorkItem spine (this pass)

Activates the WorkItem spine end-to-end (§25/§27/§28): public/member submission forms create
WorkItems, and a leadership **triage inbox** works them through their lifecycle. No schema change —
this is pure wiring onto the Phase-1 spine. The WorkItem deep links the portal homes already
pointed at now resolve to real, actionable pages.

**Verified end-to-end on real Postgres (smoke test):** a CARE intake creates a NEW item, encrypts
the body, and notifies the pastor; triage runs TRIAGED → ASSIGNED (assign-to-me) → note → RESOLVED;
a member's LEADERSHIP_MESSAGE is visible only to them as requester and a staff reply notifies them;
a member attempting to triage someone else's care item is denied.

- 🟡 **Care (§25):** public `/care` "Report a Care Need" (categories, urgency→priority, who-needs-care,
  optional contact; honeypot). Sensitive detail is encrypted at rest via the spine; confidentiality
  = SENSITIVE (pastor/elders only). Acknowledgement email + confirmation journey (§43). Fixes the
  previously-dead `/care` links from the member/leadership homes; added to the public "Connect" nav.
- 🟡 **Attendance → Care (§25):** the weekly `care-scan` cron now mirrors each new `CareAlert` into a
  CARE WorkItem (silent, to avoid a per-member notification flood) and sends **one summary
  notification** to pastor/elders linking the inbox.
- 🟡 **Contact (§28):** `/contact` gains a real form → CONTACT WorkItem (routed to Admin),
  acknowledgement email, confirmation state.
- 🟡 **Message Leadership (§27):** member portal `/dashboard/member/message` → LEADERSHIP_MESSAGE
  WorkItem tied to the member; "My messages" list; nav + home quick action.
- 🟡 **Leadership triage inbox:** `/dashboard/leadership/workitems` (type/status filters, read
  authorization enforced per item, confidentiality-aware) + an inline **Triage panel** on the shared
  `WorkItemDetail` — assign-to-me, mark triaged / start, schedule follow-up, needs-info, resolve,
  close, add encrypted internal note, and reply to the requester. Only shown to staff who
  `canManageWorkItem`; requesters see only status + their message thread. Every action goes through
  the tested `transitionWorkItem`/`addWorkItemNote`/`addWorkItemMessage` (guards + optimistic
  concurrency + immutable events + audit + notifications). Resolution emails the requester when an
  address is on file.
- 🟢 `createWorkItem` gains a `silent` option (bulk auto-generated items skip the role fan-out).

**Remaining:** Prayer's operational management is still on the existing encrypted `PrayerRequest`
model (public wall + approval intact); backing it additionally with a PRAYER WorkItem inbox is a
focused follow-up. The leadership inbox reads care/prayer/messages; prayer items appear once that
wiring lands.

**Verified:** typecheck clean; **148/148 tests**; production build clean (new routes present);
full intake→triage→resolve + messaging + authorization smoke-tested on real Postgres.

---

## Phase 2 — member account request + membership matching (this pass)

Adds the §20 request-and-match flow on top of the existing open registration: a public request
no longer creates a login directly — it creates an `AccountRequest`, runs a conservative membership
matcher, and either **auto-approves** a single confident match to an eligible member or routes to an
**admin exception queue**. A `User` is created and bound to the `Member` only on approval.

**Verified end-to-end on real Postgres (smoke test):**
- AUTO_APPROVED: an exact match creates + activates the user and binds the member automatically.
- PENDING: no confident match creates **no** user until an admin approves; approval then creates +
  activates the user and carries the chosen password across.
- REJECT: status REJECTED, the stored password hash is **purged**, no user created.
- 3 audit rows written; admins with an active role receive the in-app "new request" notification.

- ✅ `src/lib/membership-match.ts` — pure `matchMembership(request, members)` → confidence (0–100),
  band (EXACT/HIGH/MEDIUM/LOW/NONE), reasons, ranked candidates, and `autoApprovable`. **Conservative:**
  auto-approve requires a full first+last name match, HIGH+ score, a clear lead over the runner-up,
  and an *eligible* member (adult, no existing login). **Safeguarding:** minors are never
  auto-matched (§6). Table-tested — exact / high / medium / low / ambiguous / duplicate / no-match /
  minor / already-linked / clear-winner (11 cases).
- 🟡 Schema: `AccountRequest` + `AccountRequestStatus` (AUTO_APPROVED, PENDING_ADMIN_REVIEW, APPROVED,
  REJECTED, NEEDS_INFO). Password captured at request time, stored hashed, moved to the User on
  approval and purged on rejection — never a plaintext password at rest, and no orphan pending Users.
  Additive migration.
- 🟡 `src/lib/account-requests.ts` — `submitAccountRequest` (match → auto/queue, generic response =
  no account enumeration, notifies admins, emails the requester), `approveAccountRequest` (creates +
  binds the user, dedupe-guards existing emails), `rejectAccountRequest` (purges the hash),
  `needsInfoAccountRequest`. All transactional + audited.
- 🟡 `/auth/register` reworked to the §20 form (first/last name, email, phone, optional verification,
  password) with a clear confirmation journey (§43); honeypot preserved.
- 🟡 Admin exception queue `/dashboard/admin/account-requests` — live candidate matches per request,
  approve-and-link (choose the member), ask-for-info, reject; wired into admin nav + a home stat card.
- 🟡 Emails: request received, approved (auto + admin), needs-info, rejected — HTML-escaped, tested.
- 🟢 **Phase-1 integration fix:** `acceptInvite` now creates the matching active `UserRole` (+ MEMBER)
  and sets `primaryRole`, so invited leaders are visible to `notifyRoles`/role-management instead of
  relying only on the legacy `role` fallback. `account-requests` does the same for new members.

**Verified:** typecheck clean; **148/148 tests** (+13); production build clean; migration applies on
real Postgres; full request lifecycle smoke-tested.

---

## Phase 1 keystone — data + logic + integration layer (this pass)

Implements the foundation every later phase depends on (Directive §13–§17): multi-role RBAC,
the shared WorkItem communication spine, and the shared notification service. **Fully verified
in this environment against a real Postgres 16 instance** (not just compiled).

**Verified (evidence executed here):**
- ✅ `prisma migrate deploy` applies BOTH migrations to a fresh Postgres 16 cleanly
  (`00000000000000_init` → `20260810000000_phase1_keystone`). Confirmed `Role` enum now has
  `ELDER`; tables `UserRole`, `WorkItem`, `WorkItemNote`, `WorkItemEvent`, `WorkItemMessage`,
  `WorkItemAttachment`, `Notification` created; partial unique indexes present.
- ✅ **Partial unique indexes proven with real data:** a duplicate *active* global role is
  rejected (`UserRole_active_global_key`), while revoke-then-reassign succeeds and preserves
  history — the exact PostgreSQL nullable-uniqueness trap called out in §13A is handled.
- ✅ **Backfill proven:** existing single-role users mirror into an active `UserRole`
  (MINISTRY_HEAD carries ministry scope); `primaryRole` seeded from `role`.
- ✅ `npm run typecheck` clean; `npm test` **131/131 green** (was 86; +45 new: roles, workflow,
  routing, multi-role RBAC + WorkItem authorization); `npm run build` clean; `npx prisma validate`
  clean; `npx prisma generate` clean.

**1A — Multi-role RBAC (§13A/§14):**
- 🟡 Schema: `ELDER` added to `Role`; new `UserRole { userId, role, ministryId?, active,
  assignedById?, assignedAt, revokedAt? }`; `User.primaryRole` (default-portal preference,
  never the security decision). Migration is additive + backfilled.
- ✅ `src/lib/rbac.ts` — Actor is now multi-role (`roles[]`, `ministryIds[]`) and **back-compat**
  (legacy single-`role` callers still work). `hasRole`/`ministryScope` are multi-role aware.
  Central `can(actor, action, resource)` policy, **deny by default**. New WorkItem policies
  (`canReadWorkItem`/`canManageWorkItem`/`canMessageWorkItem`) enforce requester/assignee/
  routing-role access + confidentiality (LEADERSHIP_ONLY excludes non-leadership).
- 🟡 `src/auth/actor.ts` — resolves the FULL active role set from `UserRole` (revoked excluded);
  active rows are authoritative (revocation actually drops a role); MEMBER always included.
- ✅ `src/lib/roles.ts` — pure role→portal mapping, portal eligibility, primary-portal
  selection, role ranking. **Portal context ≠ authorization** is encoded as a pure function.

**1B — WorkItem spine (§15/§16):**
- 🟡 Schema: `WorkItem` (+ `Note`/`Event`/`Message`/`Attachment`) with type/status/priority/
  confidentiality; sensitive bodies + notes encrypted at rest (AES-256-GCM). Attachments bind to
  the secured `Document` model.
- ✅ `src/lib/workflow.ts` — pure lifecycle state machine (NEW→…→CLOSED) with guards (assignee
  required for ASSIGNED, date for FOLLOW_UP, reason for NEEDS_INFO, close reason for
  RESOLVED/CLOSED), fully table-tested.
- ✅ `src/lib/routing.ts` — pure `routeWorkItem(type, ctx)` policy (CARE/PRAYER→Pastor+Elders,
  SUPPORT/CONTACT/SPONSOR→Admin, LEADERSHIP_MESSAGE→Pastor/Elder/Admin, ministry-scoped
  VOLUNTEER→ministry head). A future care-specific role is a one-line table edit.
- 🟡 `src/lib/workitems.ts` — transactional server service: create (routes + CREATED event +
  role fan-out), transition (authz + guards + optimistic concurrency + immutable event + audit +
  notifications), encrypted notes, requester↔staff messages.

**1C — Notifications (§17):**
- 🟡 Schema: `Notification { userId, category, title, body, deepLink, readAt?, archivedAt? }`.
- 🟡 `src/lib/notify.ts` — one shared service: `notify`, `notifyRoles` (role-/ministry-scoped
  fan-out, de-duped, self-excludable), `unreadCount`, `markRead`, `markAllRead`, `archive`.

> Service-times seed is now a clearly-marked **placeholder** (`placeholder: true`, values `TBD`)
> per §67.3 — the previous 9:30/11:00 values were unverified and must not be treated as fact.

**Verified end-to-end on real Postgres (smoke test):** `createWorkItem` encrypts the body (never
plaintext), routes an URGENT CARE item to the Pastor and creates the notification; the pastor then
triages → assigns → resolves (close reason persisted); 4 lifecycle events + 3 audit rows recorded;
an illegal transition (RESOLVED→NEW) is rejected.

---

## Phase 1D — six portal shells, notifications UI, role management (this pass)

Replaces the "Use the sidebar" dashboard with one shared portal design system across all six
portals (§18), wires the notification bell to the shared service, and ships admin role management.

**Structural fix (repairs a pre-existing bug):** the dashboard lived in a `(dashboard)` route
group, which emits **no** `/dashboard` URL prefix — yet 29 in-app links pointed at `/dashboard/…`,
so they were dead (§57). Converted the group to a real `dashboard/` segment (git renames, history
preserved): every dashboard page now resolves under `/dashboard/*`, matching those 29 links, the
directive's `/dashboard/{portal}` scheme, the `PORTAL_ROUTE` map, and the middleware matcher — and
resolving the `/leadership` public-vs-portal collision (`/leadership` = officers, `/dashboard/leadership`
= portal). Verified in the build route table.

**Shared portal system:**
- 🟡 `components/portal/PortalShell.tsx` (server) + `PortalChrome.tsx` (client): responsive shell —
  fixed sidebar on desktop, slide-over drawer on mobile, header with notification bell. The active
  portal is derived from the URL, so the **PortalSwitcher is plain navigation** and nav never
  desyncs. Accessible: labelled nav, `aria-current`, focus-visible, Escape/outside-click on menus.
- 🟡 `components/portal/portal-nav.ts`: per-portal navigation, filtered to the actor's roles, **only
  routes that exist** (no dead links).
- 🟡 `components/portal/NotificationBell.tsx` (client) + `GET /api/notifications`,
  `POST /api/notifications/[id]/read`, `POST /api/notifications/read-all`: unread badge, list,
  mark-read / mark-all, deep-link navigation. All scoped to the caller (no IDOR).
- 🟡 `components/portal/home-ui.tsx`: shared `PortalPage`/`StatCard`/`QuickAction`/`TaskRow`/
  `EmptyState`/`PortalSection` primitives.
- ✅ `lib/portal.ts` — pure `portalFromPath` (URL→portal), unit-tested (4 cases).

**Six portal homes** (`/dashboard/{member,ministry,leadership,clerk,treasurer,admin}`), each with a
purpose statement (§65), live status cards, quick actions, recent-work lists, and empty states —
gated by `requirePortal` (portal access is presentation; records/actions still enforce policy):
- 🟡 Member ("My Church"), Ministry ("This Week"), Leadership ("Pastoral Overview"),
  Church Secretary, Treasurer (with the no-payment-processing notice), Admin ("Operations").
- 🟡 `/dashboard` now redirects to each user's primary portal (`primaryPortal`).
- 🟡 Read-only `WorkItemDetail` view at `/dashboard/member/requests/[id]` and
  `/dashboard/leadership/workitems/[id]` (gated by `canReadWorkItem`; internal notes only to
  managers; `notFound()` hides existence) — resolves the notification deep links from `workitems.ts`.

**Admin role management (§13A):**
- 🟡 `lib/user-roles.ts` — `assignRole`/`revokeRole` (transactional, audited, notifies the user,
  respects the active-uniqueness invariant) + `activeRolesByUser`.
- 🟡 `/dashboard/admin/accounts` now shows each account's active roles as removable chips and an
  "add role (+ ministry)" form; server actions double-gate on `admin()` and `canManageRoles`.
- CLERK now displays as **"Church Secretary"** everywhere (§18/§30); `ELDER` labelled.

**Retired:** `DashboardShell` + `dashboard-nav.ts` deleted after confirming zero remaining consumers.

**Verified:** typecheck clean; **135/135 tests** (+4 portal); production build clean (route table
shows all `/dashboard/*` routes + public `/leadership` coexisting).

**Remaining in Phase 1:** none blocking. Portal homes surface counts; the full WorkItem **inbox with
inline triage actions** and public **submission forms** that create WorkItems arrive with the Phase-4
domain wiring (Care/Prayer/Contact/Attendance → WorkItem). Portal switching is navigation today;
a per-user default-portal preference toggle is a later nicety.

---

## Legend
- ✅ **Verified** — built here and proven by an executed check in this repo.
- 🟡 **Implemented, not run** — real code, but the authoritative check needs your environment.
- 🟦 **Scaffold / representative** — one working instance of a pattern; siblings not yet written.
- ⬜ **Not built** — specified in v4, still to implement.

## Verified in this repo (evidence)
- ✅ Prisma schema is structurally sound — 40 models, 27 enums, all 27 named relation pairs matched, all field types resolve, all relation FK scalars present. (Run: `python3` structural check + `src/tests/schema.test.ts`.)
- ✅ Test suite passes — 76/76 green (`npm run test`): authorization matrix (9) ministry-scoped content ownership, review/prayer restricted to admin/pastor, minors manageable only by a same-household guardian, the **safeguarding gate blocks unscreened/expired volunteers**, giving is treasurer/admin only, `requireRole` denies wrong roles; plus token-digest, HMAC (tamper-rejected), AES-256-GCM (tamper-rejected), TOTP MFA, HTML sanitization (strips scripts/handlers/js-URLs/disallowed tags); and the approval state machine (allowed transitions, no self-approval, reject-needs-reason, illegal-transition + stale-version rejection, reviewer-role enforcement, and withdraw); the approval email templates (render + HTML-escaping); and the email-safety layer — suppression decisions (transactional-bypasses-marketing, honors GLOBAL), unsubscribe tokens, RFC 8058 headers, Resend webhook signature verify (accept + tamper-reject), and event->suppression mapping.

## Could NOT run in this sandbox (network-restricted) — run locally/CI
The sandbox blocks Prisma's engine host (`binaries.prisma.sh`), so these did not execute here.
They are wired and expected to pass; **you must run them** as the authoritative gate:
- 🟡 `npm run prisma:validate` — official schema validation.
- 🟡 `npm run prisma:generate` — generate the typed client (`@prisma/client`).
- 🟡 `npm run typecheck` — full TypeScript check (needs the generated client).
- 🟡 `npm run build` — Next.js production build.
- 🟡 `prisma migrate dev` — first migration + the FTS `tsvector` column/GIN index (see README).

## Foundation implemented (Phase 0)
- 🟡 `prisma/schema.prisma` — complete data model for the whole platform (all v4 modules).
- 🟡 `src/lib/crypto.ts` — bcrypt passwords; single-use invite/reset tokens (digest-only storage); HMAC unsubscribe/status tokens; AES-256-GCM field encryption.
- ✅ `src/lib/rbac.ts` — roles + resource policies + safeguarding gate (unit-tested).
- 🟡 `src/lib/audit.ts` — append-only audit, transaction-aware.
- 🟡 `src/lib/email.ts` — Resend wrapper + send-time suppression check (transactional vs marketing).
- 🟡 `src/lib/search.ts` — Postgres FTS over reference content, public-scope only.
- 🟡 `src/auth/invite.ts` — transactional invite acceptance (hash → verify → activate → invalidate → audit).
- 🟡 `src/auth/reset.ts` — single-use reset + session revocation via `sessionVersion`.
- 🟡 `src/auth/options.ts` — NextAuth credentials; session re-checks `sessionVersion` for revocation.
- ✅ `src/lib/mfa.ts` — RFC 6238 TOTP for ADMIN/PASTOR (secret + verify), unit-tested.
- 🟡 `src/middleware.ts` — dashboard session gate (fine-grained checks live in handlers).
- 🟡 `prisma/seed.ts` — seeds 28 belief **titles + official source URL** (NOT the copyrighted text — church supplies `bodyHtml`) + service-time settings.
- ✅ `src/tests/*` — schema + authorization tests. 🟡 `.github/workflows/ci.yml` — validate → generate → typecheck → test → build.

## P1 progress (this pass — P1-1, P1-2, P1-4)
- ✅ `src/lib/sanitize.ts` — XSS sanitizer for stored content (unit-tested).
- 🟡 `src/components/PublicShell.tsx` + `SearchBox`/`ThemeToggle`/`nav.ts` — public shell: header/nav/footer, search box, dark/light (no-flash via cookie), skip-link + landmarks. Nav lists only existing routes (no dead links).
- 🟡 Tailwind tokens (`tailwind.config.ts`, `globals.css`) — SDA palette (navy/green/gold), readable defaults.
- 🟡 `src/app/(public)/page.tsx` (home) — hero + service times + Watch Live/Give (rendered only when configured) + approved-only previews with empty states.
- 🟡 `src/lib/public-content.ts` — APPROVED + PUBLIC + publishAt<=now read contract (read side of P2-6).
- 🟡 `src/app/(public)/beliefs`, `church-manual`, `reference/[slug]` (sanitized render), `search` — reference library + search UI over the existing `/api/search` FTS.
- Verify locally: `npm run build` + `npm run db:seed` (belief titles) + add the FTS `tsvector` column (README) before search returns hits.

## P2 progress (this pass — approval engine)
- ✅ `src/lib/approval.ts` — pure transition/decision state machine (unit-tested, 6 cases).
- 🟡 `src/auth/actor.ts` — session -> Actor resolver + `requireActor(roles)` route guard.
- 🟡 `src/components/DashboardShell.tsx` + `dashboard-nav.ts` + `(dashboard)/layout.tsx` — role-based dashboard shell (nav lists only existing routes).
- 🟡 Ministry submit: `announcements/new` + list, `events/new` (end>=start) + list; server actions create PENDING scoped to the actor's own ministry, content sanitized on store, audited.
- 🟡 Admin `admin/approvals`: pending queue for announcements + events; approve/reject(reason) via server actions that are transactional, version-guarded (optimistic concurrency at the write), and audited; approve revalidates public feeds.
- ✅ **P2-6 complete** — public feeds already read APPROVED+PUBLIC+publishAt<=now (`public-content.ts`) and rich text is sanitized on store and render.
- 🟡 **P2-5 emails:** submit notifies ADMIN/PASTOR (pending); approve/reject notifies the submitter. Sent AFTER commit, best-effort, so an email failure never corrupts an approval. Templates HTML-escape user input.
- 🟡 **Withdraw/unpublish:** approvals page has a Published section; withdraw uses the same version-guarded, audited path (APPROVED -> WITHDRAWN).
- ✅ Templates unit-tested; ⬜ deferred (polish only): a WYSIWYG rich-text editor — current input is sanitized HTML in a textarea.
- Verify locally: seed a Ministry + a MINISTRY_HEAD user, then submit -> approve -> confirm it appears on the home page, and check the notification emails (Resend key set).

## P3 email-safety progress (this pass — P3-2, P3-4, P3-5)
- ✅ `src/lib/suppression.ts`, `email-identity.ts`, `unsubscribe.ts`, `webhooks.ts` — pure, unit-tested (7 cases).
- 🟡 `src/lib/email.ts` — refactored: normalized identity, send-time suppression (`shouldSuppress`), RFC 8058 `List-Unsubscribe` headers on marketing mail, and `addSuppression` (idempotent upsert).
- 🟡 `POST/GET /api/email/unsubscribe/[token]` — RFC 8058 one-click POST (auth-free, idempotent, no redirect) + human confirmation GET; flips the list subscription to UNSUBSCRIBED.
- 🟡 `POST /api/webhooks/resend` — verifies the Svix signature, is idempotent on the delivery id (P2002 dedupe), updates `EmailMessage`/`EmailEvent` lifecycle, and hard-suppresses on bounce/complaint.
- Verify locally: set RESEND_WEBHOOK_SECRET; send a marketing email (headers present), click unsubscribe (subscription flips), replay a webhook (deduped).

## P3 visitor lifecycle (this pass — P3-1 core, P3-3, P3-6)
- ✅ `src/lib/visitors.ts` — invite eligibility + visitor->member draft (unit-tested); welcome/invite/dept-reminder templates added + tested.
- 🟡 Visitor QR: `/visitor/new` form + `submitVisitor` action (creates Visitor, upserts EmailIdentity, opt-in -> subscription, sends welcome transactional email). Completes P1-10.
- 🟡 `GET /api/cron/visitor-weekly-invite` — idempotent lease; ACTIVE+opted-in only; per-recipient EmailMessage before send; suppression re-checked in sendEmail; visible + header unsubscribe.
- 🟡 `GET /api/cron/ministry-head-reminder` — now queries ministry heads and sends (idempotent lease).
- 🟡 Visitor admin `/dashboard/admin/visitors` — active/inactive filter; mark inactive (drops from invite pool); convert-to-member (transactional, deduped by email, NO auto-account, audited).

## P1 public pages (this pass — P1-3/5/6/7/8/9/10/16/17)
- ✅ `src/lib/ics.ts` (ICS + Google Calendar link) and `src/lib/structured-data.ts` (schema.org) — unit-tested (4 cases).
- 🟡 Ministries directory + `/ministries/[slug]` (approved announcements/events per ministry).
- 🟡 `/calendar` (approved upcoming events) + `GET /api/calendar/[id]` ICS download (approved+public only) + Google Calendar links. (FullCalendar month-grid can replace the list later; the approved-only + add-to-calendar behavior is done.)
- 🟡 `/sermons` + `/sermons/[id]` (safe YouTube/Vimeo embed allowlist; falls back to a link).
- 🟡 `/prayer` — request form: content **encrypted at rest**, always saved PENDING (publish requires approval), honeypot anti-spam; optional wall shows only APPROVED+wantsPublish and never renders bodies.
- 🟡 `/give` — AdventistGiving redirect (no card handling / no PCI) + offering calendar + categories.
- 🟡 `/plan-a-visit`, `/about`, `/contact`, `/privacy`, `/terms`, `/accessibility`, plus `not-found.tsx` (404) and `error.tsx` (500).
- 🟡 SEO: `sitemap.ts` (static + belief/ministry/sermon slugs), `robots.ts` (disallow /dashboard,/api,/auth), church JSON-LD on the home page.
- 🟡 Public nav expanded to the built routes (still no dead links).

## P4 members + minor safeguarding (this pass)
- ✅ `src/lib/minors.ts` — age/minor detection, `adultWhere()` (excludes flagged minors AND sub-18 DOB), guardian gate, and a CSV builder that THROWS if a minor is present. Unit-tested (6 cases).
- 🟡 **Add child (frictionless):** any signed-in parent adds their kids from `/dashboard/household`; a household is auto-created if they don't have one. Creates Member + GuardianConsent atomically, flags `isMinor`, and creates **no login account** (the parent manages the record). No eligibility gate, no consent checkbox.
- 🟡 **Directory** `/dashboard/directory` — adults-only (`adultWhere`) AND opt-in (`directoryVisible`), name search, "not the official membership list" disclaimer.
- 🟡 **Profile** `/dashboard/profile` — self-service directory opt-in / city visibility / phone.
- 🟡 **Export** `GET /api/members/export` — CLERK/ADMIN/PASTOR only; adults-only query + the throw-on-minor CSV safeguard; eAdventist-reconciliation disclaimer header.
- Minors are excluded from directory, search, and export; they appear only in their own guardian's household view. (Email exclusion enforced via suppression + no address for minors.)
- Verify locally: seed a household + adult member; add a child (consent row created, no User); confirm the child is absent from directory and export.

## P5 comms + care (this pass — email center, attendance, care)
- ✅ `src/lib/segments.ts` + `src/lib/care.ts` — recipient/segment resolution (minors always excluded, normalized, deduped) and missing-member detection with stable weekly dedupe. Unit-tested (5 cases).
- 🟡 **Member email** `/dashboard/admin/email` (ADMIN/PASTOR) — send to Active/All/Directory segments; recipients built via `buildRecipientList` (adults only) and each send goes through `sendEmail` so suppression + one-click unsubscribe apply; EmailCampaign + per-recipient EmailMessage recorded; recent-sends list.
- 🟡 **Attendance** `/dashboard/admin/attendance` (ADMIN/PASTOR/CLERK) — batch record present members for a service date; updates `lastAttendance`.
- 🟡 **Care scan** `GET /api/cron/care-scan` — weekly idempotent lease; flags members with no attendance in 6 weeks (NULL excluded, minors excluded, skips members with an open alert); CareAlert deduped by `memberId+week`.
- 🟡 **Care dashboard** `/dashboard/admin/care` (ADMIN/PASTOR) — open alerts, resolve, and **encrypted** pastoral notes.
- Verify locally: record attendance, back-date one member, run care-scan (alert appears), resolve it, add a note.

## P7 SDA modules — batch 1 (this pass: officers + bulletin)
- ✅ `src/lib/governance.ts` — office currency predicate + WHERE fragment + role ranking (unit-tested, 4 cases).
- 🟡 **Officers/Board** `/dashboard/admin/officers` (ADMIN/PASTOR) — add officer (role/title/member/term), end term; adult member picker.
- 🟡 **Leadership public page** `/leadership` (was deferred P1-12) — current officers only, ranked by office.
- 🟡 **Bulletin builder** `/dashboard/admin/bulletin` (+`/[id]` editor) — create bulletin, add order-of-service items, publish (PENDING -> APPROVED).
- 🟡 **Bulletin public page** `/bulletin` (was deferred P1-14) — latest APPROVED bulletin + order of service + archive.
- Nav: public Leadership + Bulletin added; dashboard Officers + Bulletins added.
- NOTE: youth-club and volunteer-screening-gate modules intentionally NOT built (minor-facing; per owner's scope decision). Sabbath School, baptism, treasurer/giving, board minutes remain.

## P7 SDA modules — batch 2 (this pass: Sabbath School + baptism + offerings)
- ✅ `src/lib/baptism.ts` — baptism pipeline transitions (unit-tested, 3 cases).
- 🟡 **Sabbath School** admin `/dashboard/admin/sabbath-school` (classes + quarterly lesson links) + public `/sabbath-school` (was deferred P1-13). Class listings are informational only — no rosters.
- 🟡 **Baptism** public request `/baptism` (was deferred P1-15; honeypot, creates REQUESTED) + admin `/dashboard/admin/baptism` (REQUESTED->IN_CLASS->SCHEDULED->COMPLETED / WITHDRAWN, transition-guarded + audited).
- 🟡 **Offering calendar** admin `/dashboard/admin/offerings` (ADMIN/PASTOR/TREASURER) -> feeds the public `/give` schedule.
- NOTE: no local giving/contribution ledger exists or was built — giving stays external via AdventistGiving (no funds processed/stored, no PCI). "Treasurer" scope here = the offering *schedule* only.
- Nav: public Sabbath School + Baptism; dashboard Sabbath School + Baptism + Offerings.

## P7 board minutes + P6 launch hardening (this pass)
- 🟡 **Board minutes** `/dashboard/admin/board` (+`/[id]`) — ADMIN/PASTOR only; create meeting (agenda sanitized), minutes **encrypted at rest**, approve locks (PENDING->APPROVED). Not public. Completes P7.
- 🟡 **Security headers** (`next.config.mjs`) — CSP, HSTS (preload), nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy; x-powered-by off.
- 🟡 **Health check** `GET /api/health` (DB ping, 503 on failure) for uptime monitoring.
- 🟡 **Crons scheduled** (`vercel.json`): visitor-invite (Wed), ministry reminder (Mon), care-scan (Mon). Vercel injects the CRON_SECRET bearer.
- 🟡 **A11y**: visible keyboard focus styles added (on top of existing landmarks/skip-link/labels).
- 📄 **`LAUNCH.md`** — full go-live guide: env vars, DB + FTS + backups, SPF/DKIM/DMARC, cron setup, security, monitoring, accessibility pass, pre-launch checklist. Items needing your environment are marked [verify].

## P8 reconciliation + transfers + consent + i18n (this pass)
- ✅ `src/lib/reconcile.ts` + `src/lib/transfers.ts` — eAdventist diff (with CSV parser) and transfer state machine. Unit-tested (4 cases) incl. **export -> parse -> reconcile round-trips to zero differences**.
- 🟡 **Public transfer intake** `/transfer` (INCOMING/OUTGOING, honeypot, tokenized) + `/transfer/status/[token]` (public status via hashed token) + clerk pipeline `/dashboard/clerk/transfers` (SUBMITTED->IN_REVIEW->HANDED_TO_EADVENTIST[+eadventistRef]->COMPLETED, guarded+audited).
- 🟡 **eAdventist reconciliation** `POST /api/clerk/reconcile` + `/dashboard/clerk/reconcile` — paste the official export, get a read-only diff (only-local / only-eAdventist / status mismatches). Never writes; eAdventist stays record of truth.
- 🟡 **Cookie notice** — informational (essential cookies only: session + theme; no tracking).
- 🟡 **i18n foundation** — locale cookie + dictionary + `t()` + EN/ES toggle, applied to shell + home hero as the reference. NOTE: full page-body translation is a remaining mechanical extraction (each page's strings -> dictionary); scaffold is in place.
- Nav: public Transfer; dashboard Transfers + Reconcile (CLERK/ADMIN/PASTOR).

## Building / construction module (this pass — was the missed P1-11)
- ✅ `src/lib/construction.ts` — raised-% (clamped), USD formatting, timeline labels (unit-tested, 2 cases).
- 🟡 **Public** `/construction` — project overview, fundraising progress bar (raised/goal, informational only — no funds processed), timeline milestones, monthly updates (video link), and a BUILDING_PROJECT email opt-in (honeypot).
- 🟡 **Admin** `/dashboard/admin/construction` (ADMIN/PASTOR) — create/edit project + goal/raised, add timeline milestones, post monthly updates with an optional "email subscribers" (marketing send via the tested suppression + unsubscribe path).
- 🟡 `constructionUpdateEmail` template added; BUILDING_PROJECT list wired into subscribe + unsubscribe.
- Nav: public Building; dashboard Building Project.
- NOTE: update photos use `photoKeys` (object-storage keys) — image rendering needs blob storage wired (not yet configured); text + video render now.

## Construction section — expanded to a full capital-campaign hub (this pass)
- ⚠️ **Schema change:** added models `ConstructionPhase`, `BuildingPledge`, `GivingLevel`, `ProjectFaq`, `ProjectPhoto` + enums `PhaseStatus`/`PledgeStatus`/`PledgeFrequency`, and fields on `ConstructionProject` (heroImageUrl, targetCompletion, publicPledgeEnabled, active). **Run `npx prisma migrate dev` before use.** Relations validate via schema test.
- ✅ `src/lib/construction.ts` — rollups + display: raised%, campaignRollup (pledged/received/avg/fulfillment), phaseRollup (budget/spent/completion), qualifyingLevel, pledgePerPeriod. Unit-tested (6 cases).
- 🟡 **Public hub** `/construction` — hero + image, fundraising thermometer (raised + pledged + count), renderings gallery, phases with budget bars, giving levels, **public pledge form** (commitment only, no payment; honeypot; anonymous/recognition options), progress-photo gallery, timeline, monthly updates, documents, FAQ, email subscribe.
- 🟡 **Admin console** `/dashboard/admin/construction` (ADMIN/PASTOR) — campaign stat cards; project settings; phase add/update (status + spent); **pledge lifecycle** (confirm / record payment -> rolls into "raised" + auto-FULFILLED / cancel); giving levels; photos/renderings (by URL); FAQ; timeline; monthly update (+ notify subscribers via tested suppression/unsubscribe path).
- NOTE: money is display-only (pledges = commitments, no processing); giving stays external (AdventistGiving). Photo direct-upload needs blob storage (URL entry works now).

## Peer-to-peer fundraising platform + blob uploads (this pass)
- ⚠️ **Schema change:** added `FundraisingCampaign`, `Fundraiser`, `Donation` + enums `CampaignStatus`/`DonationStatus`/`DonationKind` + Member back-relation. **Run `npx prisma migrate dev`.**
- ✅ `src/lib/fundraising.ts` — slugify, confirmed/campaign totals, per-fundraiser totals, leaderboard ranking (ties). Unit-tested (3 cases).
- 🟡 **Multiple campaigns:** admin `/dashboard/admin/campaigns` (create, ranked by raised — "which raised most"), `/[id]` detail (donations confirm/cancel, Wall of Fame, status). Confirmed gifts on a construction-linked campaign roll into the building total.
- 🟡 **Member fundraising links:** `/dashboard/fundraisers` — a member creates a personal fundraiser, gets a shareable `/f/<slug>` link; their confirmed gifts credit their total.
- 🟡 **Public:** `/fundraising` (active campaigns ranked), `/fundraising/[slug]` (progress + Wall of Fame + member fundraisers + donate), `/f/[slug]` (personal page + donate).
- 🟡 **Donations = attribution + tracking only** (no card data). Donor records a pledge/"already gave"; treasurer confirms receipt (that's when it counts). Prominent AdventistGiving link for the actual gift. Honeypot on all forms.
- 🟡 **Blob storage:** `src/lib/storage.ts` (@vercel/blob) + direct construction photo upload when `BLOB_READ_WRITE_TOKEN` is set (URL entry otherwise).

## AdventistGiving reconciliation + expanded Wall of Fame (this pass)
- ✅ `src/lib/giving-reconcile.ts` (parse + one-to-one gift matching by amount + email/name) and `raiserBadge` tiers. Unit-tested (3 cases).
- 🟡 **Reconciliation:** `POST /api/admin/giving-reconcile` (preview) + `/dashboard/admin/campaigns/[id]/reconcile` — paste the AdventistGiving export → matched pledges / unmatched gifts / unmatched pledges. "Confirm all matched" batch-confirms (rolls into a linked project); "Import as confirmed" records unmatched gifts. So confirmed totals stop being fully manual.
- 🟡 **Church-wide Wall of Fame:** `/fundraising/leaders` — all-time top raisers aggregated per person across campaigns, ranked, with Bronze/Silver/Gold/Cornerstone badges. Linked from `/fundraising`.
- Still no card processing: reconciliation confirms gifts already made on AdventistGiving; it never charges.

## Scaffold / representative (pattern shown, siblings not written)
- 🟦 `src/app/api/health/route.ts`, `src/app/api/search/route.ts` — API-route pattern.
- 🟦 `src/app/api/cron/ministry-head-reminder/route.ts` — idempotent, secret-gated cron pattern (DB-lease dedupe). Other crons (visitor invite, construction update, care alerts, screening-expiry) follow this shape.
- 🟦 `src/app/layout.tsx`, `src/app/page.tsx` — app shell only.

## Not yet built (by phase) — the bulk of the app
- 🟡 **P1 Public site:** DONE — shell, home, beliefs, church-manual, reference, search, about, ministries(+detail), calendar(+ICS), sermons(+detail), prayer, give, plan-a-visit, visitor/new, contact, legal, 404/500, SEO/sitemap/robots/JSON-LD. DEFERRED to ship with P7 admin (so they aren't empty shells): construction, leadership, sabbath-school, bulletin, baptism.
- 🟡/⬜ **P2 Approval engine:** DONE — dashboards, submit→approve/reject state machine (version-guarded + audited), sanitization, approved-only feeds. REMAINING — P2-5 decision/pending emails (needs P3-1 email templates); rich-text editor UI polish; withdraw/unpublish UI.
- 🟡 **P3 Visitor lifecycle: COMPLETE** — suppression, RFC 8058 unsubscribe, webhook ingestion, welcome+invite+reminder crons, visitor admin + convert-to-member. (Minor: reset/campaign/construction-update templates still to add under P3-1.)
- ⬜ **P4 Members/households/minors:** household + dependent management UI, guardian-consent capture, directory.
- ⬜ **P5 Email center & care:** campaigns, audience snapshots, care-alert queue.
- ⬜ **P6 Launch:** SPF/DKIM/DMARC, backups + restore test, monitoring, a11y audit.
- ⬜ **P7 SDA modules:** volunteer screening admin + assignment gating UI, Sabbath School, bulletin builder, officers/board/minutes, baptism/profession-of-faith, offering calendar/treasurer, youth clubs.
- ⬜ **P8 eAdventist boundary & discovery:** CSV reconciliation export, sitemap.xml/robots.txt, schema.org service times, Google Business Profile, cookie-consent analytics, i18n.

## Deltas from v4 §5 (introduced while building)
- Added `User.activatedAt DateTime?` (set on invite acceptance) — a real gap the invite flow surfaced. Fold back into the plan's §5 on next revision.

## Verified-vs-claimed boundary
Everything under ✅ was executed here. Everything under 🟡/🟦/⬜ is code or spec that **you must verify in your environment** (`npm ci && npm run prisma:validate && npm run typecheck && npm run test && npm run build`). Do not treat this as production-ready until those pass and Phases P1–P8 are implemented and gated.
