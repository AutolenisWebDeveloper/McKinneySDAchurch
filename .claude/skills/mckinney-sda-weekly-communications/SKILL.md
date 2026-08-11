---
name: mckinney-sda-weekly-communications
description: >-
  The canonical weekly church communications workflow for the McKinney SDA
  platform — WeeklyPacket, ministry submissions, review/approval, readiness,
  publishing, Bulletin and Order of Service. Use whenever building or changing
  the weekly packet, ministry-head submissions, announcements/events collection,
  Sabbath program, bulletin, order of service, publication, or the reminder
  crons. Trigger on: weekly packet, bulletin, order of service, Sabbath program,
  ministry submission, announcement collection, publish bulletin, weekly review.
---

# McKinney SDA — Weekly Communications (WeeklyPacket)

The weekly cycle runs on **one** architecture: `WeeklyPacket`. Bulletin and Order of Service
live **inside** the packet — they are not competing systems. Canonical flow:

```
SABBATH WEEK → MINISTRY CHECKLIST → SUBMISSIONS → MISSING INFO → APPROVALS
  → SABBATH PROGRAM → BROCHURE → PREVIEW → FINAL APPROVAL → PUBLISH → ARCHIVE
```

## What to inspect before changing anything

- `src/lib/weekly-packet.ts` — **pure**: `ALLOWED` packet-status graph,
  `canPacketTransition`, `computeReadiness`, `upcomingSabbath`.
- `src/lib/weekly-packets.ts` — the DB service: `getOrCreatePacket`, `recomputeReadiness`,
  `submitToPacket`, `reviewSubmission`, `markNothingThisWeek`, `linkBulletinForPacket`,
  `transitionPacket`.
- `prisma/schema.prisma` — `WeeklyPacket`, `PacketSubmission`, `Bulletin`,
  `OrderOfServiceItem`, and the packet enums.
- Reminder cron: `src/app/api/cron/ministry-head-reminder`.

## The model (use these exact values)

- **`WeeklyPacketStatus`**: `COLLECTING` → `IN_REVIEW` → `READY` → `PUBLISHED` → `ARCHIVED`
  (transitions only per `ALLOWED`; `READY`/`IN_REVIEW` can step back one). One packet per
  Sabbath (`WeeklyPacket.sabbathDate @unique`).
- **`PacketSubmissionKind`**: `ANNOUNCEMENT`, `EVENT`, `SABBATH_PROGRAM_ITEM`, `PARTICIPANT`,
  `MINISTRY_UPDATE`, `NOTHING_THIS_WEEK`.
- **`PacketSubmissionStatus`**: `SUBMITTED`, `ACCEPTED`, `REJECTED`, `NEEDS_INFO`.
- **Bulletin** is linked 1:1 via `WeeklyPacket.bulletinId @unique` (relation `PacketBulletin`),
  matched on the shared `sabbathDate`; its `OrderOfServiceItem[]` are the order of service.
  `Bulletin.status` is `ApprovalStatus` — it publishes (→APPROVED) when the packet publishes.

## How readiness / publishing work

- `computeReadiness` scores a packet: a department "responded" if it has ≥1 non-REJECTED
  submission (`NOTHING_THIS_WEEK` counts). Score = `deptScore*0.8 + oosScore*0.2`; the order of
  service contributes the 20% (`hasOrderOfService` = the linked bulletin has ≥1 item).
  Persist it only via `recomputeReadiness`.
- `transitionPacket` is version-guarded (`updateMany` on `{id, version}`, increments `version`);
  on `PUBLISHED` it stamps `publishedAt`, publishes the linked Bulletin, notifies ministry
  heads/leadership, and emails ministry heads (`packetPublishedEmail`). Authorized by
  `canReviewContent`.

## Implementation rules

1. Get/create the current packet with `getOrCreatePacket` (defaults to `upcomingSabbath`) —
   never construct packets ad hoc or key them on anything but the Sabbath date.
2. Ministry heads submit only through `submitToPacket` (authorized: ADMIN/PASTOR, or
   MINISTRY_HEAD within `ministryScope`). `NOTHING_THIS_WEEK` replaces a ministry's prior
   marker. Every submit recomputes readiness and notifies ADMIN/PASTOR.
3. Admin review goes through `reviewSubmission` (`accept`/`reject`/`needs_info`) — it audits,
   recomputes, notifies, and emails the submitter. MISSING INFO = `NEEDS_INFO`.
4. Attach the bulletin/order of service with `linkBulletinForPacket`; keep Order of Service as
   `OrderOfServiceItem` rows under the packet's Bulletin.
5. Move through the lifecycle only with `transitionPacket` + `canPacketTransition`. PUBLISH
   and ARCHIVE are packet transitions, not separate flows.
6. All packet notifications/emails use the shared `notify.ts` + email registry — see
   `mckinney-sda-workflows` and `mckinney-sda-email-communications`.

## Prohibited patterns (reject in review)

- A separate bulletin or order-of-service system that competes with `WeeklyPacket` (Bulletin
  must remain the packet's linked component).
- Announcement/event/participant collection that bypasses `PacketSubmission`.
- Writing packet status directly, skipping `canPacketTransition` or the version guard.
- Persisting `readinessScore` by hand instead of via `recomputeReadiness`.
- A second reminder/notification/email path for weekly comms.

## Verification requirements

- Extend `src/tests/weekly-packet.test.ts` for packet-status and readiness changes (keep
  `weekly-packet.ts` pure). Assert the 80/20 weighting, `NOTHING_THIS_WEEK` counting, REJECTED
  exclusion, and `upcomingSabbath`.
- Run `npm run test` and `npm run typecheck` before claiming done.
