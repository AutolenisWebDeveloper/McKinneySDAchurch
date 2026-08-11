---
name: mckinney-sda-governance
description: >-
  Protects the church governance and Church Secretary (Clerk) architecture of
  the McKinney SDA platform — membership transfers, board/business meetings,
  committees, motions, votes, action items, secretary notes, governance
  documents, the Church Manual, and the eAdventist boundary. Use whenever code
  touches transfers, the Board, committees, minutes, motions, action items, or
  official membership records. Trigger on: transfer, eAdventist, clerk, church
  secretary, board meeting, committee, motion, vote, action item, minutes,
  church manual, governance record.
---

# McKinney SDA — Governance & Church Secretary

Governance records are historical and often confidential. Prefer archival over deletion,
encrypt minutes/notes, and respect the eAdventist boundary. The Church Secretary is the
`CLERK` role; governance writes require ADMIN, PASTOR, or CLERK (`assertGov`).

## What to inspect

- `src/lib/governance.ts` — pure: `isCurrentOffice`, `OFFICER_ORDER`, `tallyMotion`,
  `ACTION_ITEM_ALLOWED` / `canActionItemTransition`, `committeeSlug`.
- `src/lib/committees.ts` — service: `createCommittee`, `setCommitteeArchived`,
  `addCommitteeMember`, `removeCommitteeMember` (all audited).
- `src/lib/membership-transfers.ts` + `src/lib/transfers.ts` — transfer orchestration + pure
  lifecycle.
- `prisma/schema.prisma` — `MembershipTransfer`, `ChurchOffice`, `BoardMeeting`, `Committee`,
  `CommitteeMember`, `Motion`, `ActionItem`, `SecretaryNote`, `ChurchManualVersion`.

## Membership transfers

- **`TransferDirection`**: `INCOMING`, `OUTGOING`. **`TransferStatus`**: `SUBMITTED`,
  `AWAITING_MEMBER_CONFIRMATION`, `IN_REVIEW`, `NEEDS_INFO`, `HANDED_TO_EADVENTIST`,
  `COMPLETED`, `DECLINED`, `WITHDRAWN`, `DISPUTED`.
- Transitions are governed by the pure `ALLOWED` map in `transfers.ts` (`canTransferTransition`).
  Terminal: `COMPLETED`/`DECLINED`/`WITHDRAWN`. `DISPUTED` locks ordinary processing and is
  resolvable only by PASTOR/ADMIN/ELDER.
- **Consent & confirmation**: a transfer created *on behalf of* a member
  (`createOnBehalf`, requires `consentMethod`) starts at `AWAITING_MEMBER_CONFIRMATION`; the
  member confirms (`memberConfirmTransfer` → IN_REVIEW) or denies (`memberDenyTransfer` →
  DISPUTED) via a confirmation token or their own session. Self-initiated transfers
  (`createOutgoingSelf`) and public intake (`createIncomingTransfer`) skip confirmation.
- Advance the pipeline only via `advanceTransfer` (requires `canManageTransfer`, audits
  `transfer.<status>`). Only the digest of status/confirmation tokens is stored.

## eAdventist boundary (do not cross)

**eAdventist is the system of record; it is a manual/external boundary with NO integration.**
There is no API or sync. The only ties are the pipeline status `HANDED_TO_EADVENTIST` and the
manually entered string `MembershipTransfer.eadventistRef`. `Member.membershipStatus` and local
member/attendance data are a **convenience mirror, not the official record**. Do not build an
eAdventist API client or treat local data as authoritative.

## Board, committees, motions, action items

- **`ChurchOffice`** uses `OfficerRole` (ELDER, DEACON, DEACONESS, CLERK, TREASURER,
  SS_SUPERINTENDENT, MINISTRY_LEADER, OTHER) with terms (`termStart`/`termEnd`/`active`) —
  officer *records*, distinct from login roles.
- **`BoardMeeting`** (`type`: BOARD | BUSINESS) holds `agendaHtml`, `minutesEncrypted`
  (AES-256-GCM, access-restricted), `status` (draft → approved), and relations to `Motion`,
  `ActionItem`, `SecretaryNote`.
- **`Motion`** results via pure `tallyMotion`: total 0 → PENDING; `votesFor > votesAgainst` →
  CARRIED else FAILED (ties fail; abstentions don't count). `MotionResult`: PENDING, CARRIED,
  FAILED, TABLED, WITHDRAWN.
- **`ActionItem`** (`OPEN`, `IN_PROGRESS`, `DONE`, `CANCELLED`) transitions via
  `canActionItemTransition`.
- **`SecretaryNote`** — `bodyEncrypted`, `confidential` default true.
- **`ChurchManualVersion`** — authorized PDF (`documentId`) or official `externalUrl`, exactly
  one `active`; **never scrape copyrighted Church Manual text** (General Conference work).

## Implementation rules

1. Governance writes require `assertGov` (ADMIN/PASTOR/CLERK) and `writeAudit`.
2. Minutes and secretary notes are encrypted; access is gated (`canReadBoardMinutes`).
3. **Archive/deactivate, never hard-delete** governance records: committees use `archived`;
   `removeCommitteeMember` sets `active:false`. Preserve history.
4. Use the pure helpers (`tallyMotion`, `canActionItemTransition`, `canTransferTransition`) —
   don't re-derive vote/transition logic inline.
5. Respect the several intentional scalar (non-FK) references
   (`MembershipTransfer.consentDocumentId`/`attestedById`, `ChurchManualVersion.documentId`,
   `ActionItem.ownerMemberId`) — see `mckinney-sda-database-prisma`.

## Prohibited patterns (reject in review)

- Hard-deleting committees, members, meetings, motions, or transfer history.
- Building an eAdventist sync/API or treating local membership data as the record of truth.
- Storing minutes/secretary notes in plaintext.
- Re-implementing motion tally or transfer/action-item transitions inline.
- Reproducing copyrighted Church Manual body text.
- Processing a transfer past member confirmation when confirmation is required, or resolving a
  DISPUTED transfer as an ordinary clerk.

## Verification requirements

- Extend `src/tests/governance.test.ts`, `transfers-reconcile.test.ts` for tally/transition
  changes (keep the logic pure).
- Run `npm run prisma:validate`, `npm run typecheck`, `npm run test`.
