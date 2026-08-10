-- Phase 5: transfer rework — new lifecycle states + leadership-on-behalf consent + member confirmation (§29). Additive.

ALTER TYPE "TransferStatus" ADD VALUE IF NOT EXISTS 'AWAITING_MEMBER_CONFIRMATION';
ALTER TYPE "TransferStatus" ADD VALUE IF NOT EXISTS 'NEEDS_INFO';
ALTER TYPE "TransferStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';

ALTER TABLE "MembershipTransfer"
  ADD COLUMN "requesterUserId" TEXT,
  ADD COLUMN "onBehalf" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consentAttested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consentMethod" TEXT,
  ADD COLUMN "consentDate" TIMESTAMP(3),
  ADD COLUMN "consentNotes" TEXT,
  ADD COLUMN "consentDocumentId" TEXT,
  ADD COLUMN "attestedById" TEXT,
  ADD COLUMN "confirmationTokenDigest" TEXT,
  ADD COLUMN "memberConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "disputedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "MembershipTransfer_confirmationTokenDigest_key" ON "MembershipTransfer"("confirmationTokenDigest");
CREATE INDEX "MembershipTransfer_requesterUserId_idx" ON "MembershipTransfer"("requesterUserId");
