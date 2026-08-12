-- Weekly Bulletin Publishing System (§3-§21). Additive & backward-compatible.
-- Extends the existing WeeklyPacket → PacketSubmission (announcements) + Bulletin
-- (worship/order-of-service) spine; adds idempotency ledgers for the M/W/F crons.

-- ===== Governed submission lifecycle: extend PacketSubmissionStatus additively =====
ALTER TYPE "PacketSubmissionStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "PacketSubmissionStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "PacketSubmissionStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';
ALTER TYPE "PacketSubmissionStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "PacketSubmissionStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TYPE "PacketSubmissionStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- ===== Bulletin: slug + worship/duty metadata + PDF artifact versioning =====
ALTER TABLE "Bulletin"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "welcomeMessage" TEXT,
  ADD COLUMN "theme" TEXT,
  ADD COLUMN "sabbathSchoolLesson" TEXT,
  ADD COLUMN "sabbathSchoolTime" TEXT,
  ADD COLUMN "divineWorshipTime" TEXT,
  ADD COLUMN "healthNugget" TEXT,
  ADD COLUMN "sermonTitle" TEXT,
  ADD COLUMN "speaker" TEXT,
  ADD COLUMN "scripture" TEXT,
  ADD COLUMN "offeringToday" TEXT,
  ADD COLUMN "elderOnDuty" TEXT,
  ADD COLUMN "nurseOnDuty" TEXT,
  ADD COLUMN "sundownTonight" TEXT,
  ADD COLUMN "sundownNext" TEXT,
  ADD COLUMN "nextSabbathSpeaker" TEXT,
  ADD COLUMN "nextSabbathOffering" TEXT,
  ADD COLUMN "heroImageUrl" TEXT,
  ADD COLUMN "pdfVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "pdfGeneratedAt" TIMESTAMP(3);

-- Backfill the permanent-edition slug from the Sabbath date (YYYY-MM-DD).
UPDATE "Bulletin" SET "slug" = to_char("sabbathDate", 'YYYY-MM-DD') WHERE "slug" IS NULL;

CREATE UNIQUE INDEX "Bulletin_slug_key" ON "Bulletin"("slug");

-- OrderOfServiceItem: cascade delete with its bulletin + ordering index.
ALTER TABLE "OrderOfServiceItem" DROP CONSTRAINT "OrderOfServiceItem_bulletinId_fkey";
ALTER TABLE "OrderOfServiceItem" ADD CONSTRAINT "OrderOfServiceItem_bulletinId_fkey" FOREIGN KEY ("bulletinId") REFERENCES "Bulletin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "OrderOfServiceItem_bulletinId_sortOrder_idx" ON "OrderOfServiceItem"("bulletinId", "sortOrder");

-- ===== PacketSubmission: full announcement fields + edit/review concurrency =====
ALTER TABLE "PacketSubmission"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "fullContentHtml" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "eventStartAt" TIMESTAMP(3),
  ADD COLUMN "eventEndAt" TIMESTAMP(3),
  ADD COLUMN "location" TEXT,
  ADD COLUMN "recurring" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "recurrence" TEXT,
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "registrationUrl" TEXT,
  ADD COLUMN "externalUrl" TEXT,
  ADD COLUMN "ctaLabel" TEXT,
  ADD COLUMN "ctaUrl" TEXT,
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "includeInPrint" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "includeOnline" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "requestedPriority" TEXT,
  ADD COLUMN "internalNotes" TEXT;

CREATE UNIQUE INDEX "PacketSubmission_packetId_slug_key" ON "PacketSubmission"("packetId", "slug");

-- ===== BulletinReminder: Monday/Wednesday reminder idempotency ledger =====
CREATE TABLE "BulletinReminder" (
    "id" TEXT NOT NULL,
    "packetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ministryId" TEXT,
    "state" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulletinReminder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BulletinReminder_packetId_kind_userId_key" ON "BulletinReminder"("packetId", "kind", "userId");
CREATE INDEX "BulletinReminder_packetId_kind_idx" ON "BulletinReminder"("packetId", "kind");
ALTER TABLE "BulletinReminder" ADD CONSTRAINT "BulletinReminder_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "WeeklyPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== BulletinDistribution: Friday 5PM member-email idempotency ledger =====
CREATE TABLE "BulletinDistribution" (
    "id" TEXT NOT NULL,
    "bulletinId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "suppressedCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "BulletinDistribution_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BulletinDistribution_bulletinId_channel_key" ON "BulletinDistribution"("bulletinId", "channel");
CREATE INDEX "BulletinDistribution_bulletinId_idx" ON "BulletinDistribution"("bulletinId");
ALTER TABLE "BulletinDistribution" ADD CONSTRAINT "BulletinDistribution_bulletinId_fkey" FOREIGN KEY ("bulletinId") REFERENCES "Bulletin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
