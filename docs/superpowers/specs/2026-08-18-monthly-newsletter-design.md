# Monthly Newsletter — Design & Gap Analysis

Status: design (approved-in-spirit by the master directive; async build)
Date: 2026-08-18
Scope: a church-wide, monthly, editorial, web + email newsletter, department-contributed,
Admin/Communications-controlled, integrated into the existing platform. **Distinct from** the
Weekly Bulletin (`WeeklyPacket`) and the Building/Fundraiser communications.

## 1. Reuse decisions (search-before-create)

The `WeeklyPacket` system is the direct architectural precedent (dated publication + department
submissions + review + readiness + reminders + publish + archive). The newsletter mirrors it —
it does **not** fork it. Everything else reuses existing infrastructure:

| Concern | Reused infrastructure |
|---|---|
| Departments | `Ministry` + active `UserRole{role:MINISTRY_HEAD, ministryId}` (no new contact list) |
| Authorization | `rbac.ts` — gate on `ADMIN`/`PASTOR` (== Communications); `ministryScope` for heads |
| Actor/session | `getActor`, `requireActor` (pages), `requireRole` (actions) |
| In-app notifications | `notify` / `notifyRoles` + `Notification` model |
| Transactional email | `sendEmail` / `sendTemplated`; pure `{subject,html}` builders |
| Member/bulk email | `EmailCampaign`+`EmailMessage`, `sendEmail(type:"MARKETING", listType:"NEWSLETTER")` |
| Audience | `segmentWhere("ACTIVE_MEMBERS")` + `buildRecipientList` (minor-safe) + `NEWSLETTER` subscription/unsubscribe |
| Suppression / RFC 8058 | `shouldSuppress` (re-checked at send) + `unsubscribeToken("...","NEWSLETTER")` |
| Audit | `writeAudit(db,{actorId,action,entity,entityId,metadata})` |
| Images | `uploadPublic(file, prefix)` (blob URL) + paste-https-URL + alt-text convention |
| Calendar | `getUpcomingEvents`, `buildEventLinks`, canonical `/calendar/events/[slug]` (link, never duplicate) |
| Sanitization | `sanitize(html)` on every rich-text write |
| Design system | denim scale (navy `#003B5C`=denim-800), teal/bright-teal, gold; Noto Serif/Sans; `PageHeader`, `Section`, `Container`, `Reveal`; portal kit (`DashboardHeader`,`Panel`,`MetricTile`,`ReviewQueue`,`StatusBadge`,`WorkflowProgress`,`ProgressRing`,`AttentionLayer`) |
| Origin | `env.NEXT_PUBLIC_SITE_URL` (no trailing slash) |
| Cron auth | `Bearer ${CRON_SECRET}` via `timingSafeEqual`; register in `vercel.json` |

**Prohibited (would duplicate):** a second ticketing/submission engine; a second reminder/email
path; a second design system; local payment; a parallel department contact list; writing status
without the FSM + version guard; persisting readiness by hand.

## 2. Data model

New models (all prefixed `Newsletter`), mirroring `WeeklyPacket`/`PacketSubmission` field
conventions (scalar submitter/reviewer ids, `version` optimistic concurrency, cascade on child rows).

- **`NewsletterIssue`** — one per month. `monthStart DateTime @unique` (first-of-month UTC), `slug @unique`
  (`YYYY-MM`), `status NewsletterIssueStatus`, `title`/`coverHeadline`/`theme`, `coverImageUrl`/`coverImageAlt`,
  `pastorMessageHtml`/`pastorMessageBy`, deadlines `requestAt`/`reminderAt`/`submissionDeadlineAt` (configurable),
  `audienceSegment` (default `ACTIVE_MEMBERS`), `scheduledSendAt`/`publishedAt`/`webPublishedAt`/`archivedAt`,
  `testEmailSentAt`, `approvedById`/`approvedAt`, `readinessScore Int`, `version Int`, timestamps.
  Relations: `submissions[]`, `sections[]`, `reminders[]`, `distributions[]`.
- **`NewsletterSubmission`** — a department contribution. `issueId`, `ministryId?`, `submittedById?`,
  `status NewsletterSubmissionStatus`, `version`, `contentType NewsletterContentType`, `title`, `body`,
  `summary?`, `fullContentHtml?`, `eventStartAt?`/`eventId?`/`location?`, `ctaLabel?`/`ctaUrl?`/`externalUrl?`,
  `internalNotes?`, `reviewNote?`/`reviewedById?`, `featured Bool`, `sortOrder Int`, timestamps, `images[]`.
- **`NewsletterSection`** — a controlled builder block. `issueId`, `type NewsletterSectionType`, `title?`,
  `subtitle?`, `bodyHtml?`, `imageUrl?`/`imageAlt?`, `ctaLabel?`/`ctaUrl?`, `sortOrder Int`, `hidden Bool`,
  `submissionId?` (feature an approved submission), `eventId?` (canonical event), `config Json?`, timestamps.
- **`NewsletterImage`** — `submissionId?`/`sectionId?`, `url`, `alt?`, `caption?`, `sortOrder Int`.
- **`NewsletterReminder`** — idempotency ledger `@@unique([issueId, kind, userId])` (`kind`=REQUEST|REMINDER).
- **`NewsletterDistribution`** — send ledger `@@unique([issueId, channel])` (`channel`=EMAIL), counts
  `recipientCount`/`sentCount`/`suppressedCount`, `status`, `scheduledFor?`, `completedAt?`, `error?`.

### Enums & state machines (pure `src/lib/newsletter.ts`)

- **`NewsletterIssueStatus`**: `DRAFT → COLLECTING → IN_REVIEW → READY → APPROVED → SCHEDULED → PUBLISHED → ARCHIVED`.
  Reconciles the directive's 9-state model: `COLLECTING_CONTENT`→`COLLECTING`; `CONTENT_REVIEW`+`DESIGN_REVIEW`→`IN_REVIEW`;
  `READY_FOR_APPROVAL`→`READY`. Allowed edges (step-back permitted):
  `DRAFT→[COLLECTING]`, `COLLECTING→[IN_REVIEW]`, `IN_REVIEW→[READY,COLLECTING]`, `READY→[APPROVED,IN_REVIEW]`,
  `APPROVED→[SCHEDULED,PUBLISHED,READY]`, `SCHEDULED→[PUBLISHED,APPROVED]`, `PUBLISHED→[ARCHIVED]`, `ARCHIVED→[]`.
- **`NewsletterSubmissionStatus`**: `DRAFT → SUBMITTED → UNDER_REVIEW → CHANGES_REQUESTED → APPROVED → ADDED_TO_ISSUE`,
  terminal `DECLINED`. `NOT_STARTED` is derived (no row). Edges:
  `DRAFT→[SUBMITTED]`, `SUBMITTED→[UNDER_REVIEW,APPROVED,CHANGES_REQUESTED,DECLINED]`,
  `UNDER_REVIEW→[APPROVED,CHANGES_REQUESTED,DECLINED]`, `CHANGES_REQUESTED→[SUBMITTED]`,
  `APPROVED→[ADDED_TO_ISSUE,UNDER_REVIEW]`, `ADDED_TO_ISSUE→[APPROVED]`, `DECLINED→[]`.
- **`NewsletterContentType`**: `NEWS,EVENT,ANNOUNCEMENT,MINISTRY_STORY,ACCOMPLISHMENT,VOLUNTEER,TESTIMONY,OUTREACH,OTHER`.
- **`NewsletterSectionType`**: `HERO,PASTOR_MESSAGE,FEATURED_STORY,CHURCH_LIFE,MINISTRY_SPOTLIGHT,MEMBER_HIGHLIGHT,`
  `COMMUNITY_MISSION,UPCOMING_EVENTS,PHOTO_STORY,BUILDING_UPDATE,SERVE_INVOLVED,CTA,STAY_CONNECTED,FOOTER`.
- **Readiness**: required section types present + content, department response rate, approved-submission count,
  hero image present, pastor message present. Weighted, deterministic; persisted only via `recomputeReadiness`.
- **Month helper**: `currentIssueMonth(now)` → first-of-month UTC; `monthSlug(date)`→`YYYY-MM`; `monthLabel`.

## 3. Lifecycle & ownership

```
Admin creates issue (DRAFT) → send content request (→COLLECTING)
  → dept heads submit (DRAFT→SUBMITTED) → reminder to non-submitters
  → Admin reviews (approve/changes/decline) → add approved to issue
  → Admin builds sections (→IN_REVIEW) → readiness → web+email preview → test email
  → final approval (→READY→APPROVED) → schedule (→SCHEDULED) or send now
  → send email + publish web (→PUBLISHED) → archive (→ARCHIVED) → reporting
```

Owners: **Department Head** — submit/edit own draft, respond to change requests (scoped to their
ministry, server-enforced). **Admin/Communications (ADMIN/PASTOR)** — everything else.

## 4. Routes

- Admin: `/dashboard/admin/newsletter` (command center — current issue, readiness, missing depts,
  review queue count, actions), `/dashboard/admin/newsletter/[id]` (detail: review queue + builder +
  readiness + schedule/approve), `/dashboard/admin/newsletter/[id]/preview` (web+email preview).
- Department head: `/dashboard/ministry/newsletter` (list of open issues + their submissions),
  `/dashboard/ministry/newsletter/[issueId]` (submission form, deep-linked from email).
- Public: `/newsletter` (archive by month/year), `/newsletter/[slug]` (web edition, stable URL, OG/JSON-LD).
- Crons: `/api/cron/newsletter-content-request` (monthly request), `/api/cron/newsletter-reminder`
  (reminder to non-submitters), `/api/cron/newsletter-send` (fire scheduled sends).

## 5. Gap analysis — findings & resolutions

Traced the directive against the real repo. Material findings and how the design resolves them:

1. **No `NEWSLETTER` audience segment / subscription filter existed as a resolver.** *(Impact: can't
   target/opt-out.)* `NEWSLETTER` already exists as an `EmailSubscription.type`/`unsubscribeToken` list
   type; audience = `segmentWhere("ACTIVE_MEMBERS")`+`buildRecipientList` and send with
   `listType:"NEWSLETTER"` so suppression + one-click unsubscribe are list-aware. No new list.
2. **Reporting gap: `sendEmail` doesn't return the provider id**, so webhook correlation never matches
   and opens/clicks aren't captured (repo-wide, pre-existing). *(Impact: no true delivery/open stats.)*
   Resolution: record honest aggregate counts (recipients/sent/suppressed) on `NewsletterDistribution`
   and per-recipient `EmailMessage` rows (ACCEPTED/SUPPRESSED); present opens/clicks as **not tracked**
   rather than fabricate them. (Matches directive §28's "interpret opens cautiously.")
3. **Duplicate-send risk** on schedule/cron. Resolution: `NewsletterDistribution @@unique([issueId,channel])`
   claimed before sending (mirrors `BulletinDistribution`); the send transition is version-guarded.
4. **Stale department-head assignment** between request and submission. Resolution: eligibility is
   resolved live from active `UserRole` at each cron/action; deep-link auto-binds the submitter's ministry,
   and a head with multiple ministries chooses among their own only.
5. **Time zone**: church is `America/Chicago`. Deadlines/schedule stored UTC; the send cron gates on the
   intended Central instant (mirrors the Friday-distribution DST pattern) so a scheduled send fires once.
6. **Email ≠ web drift / archive stability.** Resolution: one content model (`NewsletterIssue`+sections);
   email and web render the same dataset via channel-specific renderers. Published issues render from
   their stored rows (snapshot), so archived issues stay stable if defaults change later.
7. **Privacy of member/family highlights.** Resolution: highlights are editorial sections built by Admin
   from approved content only — never auto-published from member data; no minor exposure (safeguarding).
8. **Dead-end states.** Every submission state has a next action for some owner; `CHANGES_REQUESTED`
   deep-links the head back to the same record; `DECLINED` is explicitly terminal with a reason.
9. **Builder scope creep.** Resolution: a *controlled* modular builder (fixed section types, add/remove/
   reorder/hide/edit) — not a freeform page builder. Layout stays system-owned; editors change content.

## 6. Testing

- `src/tests/newsletter.test.ts` (pure): issue + submission FSM validity/rejection, readiness weighting,
  `currentIssueMonth`/`monthSlug`, content-type/section normalization, publish validation.
- Extend `email-safety` coverage implicitly via `listType:"NEWSLETTER"` reuse.
- CI parity: `prisma:validate`, `prisma generate`, `migrate deploy`, `typecheck`, `test`, `build`.

## 7. Phasing

1. Schema + migration. 2. Pure `newsletter.ts` + tests. 3. Service `newsletters.ts`. 4. Email builders.
5. Crons + `vercel.json`. 6. Admin command center + detail (review queue + builder + previews) + actions.
7. Department submission UI. 8. Public web edition + archive. 9. Nav. 10. Validate + review + refine.
