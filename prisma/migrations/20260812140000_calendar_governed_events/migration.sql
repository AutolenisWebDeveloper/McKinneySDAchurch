-- Calendar: governed event lifecycle.
-- Extends the existing Event model (no parallel model) with a richer, server-enforced state
-- machine, board-approval verification, structured location, public contact, registration,
-- media, a stable public slug, and a review-history table. The Event.status column moves from
-- the generic ApprovalStatus to a dedicated EventStatus WITHOUT data loss (in-place backfill).

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'REJECTED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('WORSHIP', 'YOUTH', 'CHILDREN', 'FAMILY', 'OUTREACH', 'HEALTH', 'FELLOWSHIP', 'SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('CHURCH', 'EXTERNAL', 'ONLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "BoardApprovalState" AS ENUM ('PENDING', 'APPROVED', 'NOT_APPROVED');

-- DropIndex (replaced by the composite [ministryId, status] index below)
DROP INDEX "Event_ministryId_idx";

-- AlterTable: additive columns only (status handled separately below to preserve data)
ALTER TABLE "Event" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "adminFeedback" TEXT,
ADD COLUMN     "allDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "boardApprovalDate" TIMESTAMP(3),
ADD COLUMN     "boardApprovalRef" TEXT,
ADD COLUMN     "boardApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "boardApprovalState" "BoardApprovalState",
ADD COLUMN     "boardNoteInternal" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "category" "EventCategory",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "contactPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ctaLabel" TEXT,
ADD COLUMN     "imageAlt" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "infoUrl" TEXT,
ADD COLUMN     "locationInstructions" TEXT,
ADD COLUMN     "locationType" "LocationType" NOT NULL DEFAULT 'CHURCH',
ADD COLUMN     "onlineUrl" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "registrationDeadline" TIMESTAMP(3),
ADD COLUMN     "registrationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "registrationUrl" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "submissionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
ADD COLUMN     "venueName" TEXT,
ADD COLUMN     "zip" TEXT;

-- ---------------------------------------------------------------------------
-- Migrate Event.status: ApprovalStatus -> EventStatus, preserving existing rows.
--   APPROVED  -> PUBLISHED  (previously "published immediately")
--   PENDING   -> SUBMITTED  (awaiting admin review)
--   REJECTED  -> REJECTED
--   WITHDRAWN -> ARCHIVED
-- ---------------------------------------------------------------------------
ALTER TABLE "Event" ADD COLUMN "status_new" "EventStatus" NOT NULL DEFAULT 'DRAFT';

UPDATE "Event" SET "status_new" = (CASE "status"::text
  WHEN 'APPROVED'  THEN 'PUBLISHED'
  WHEN 'PENDING'   THEN 'SUBMITTED'
  WHEN 'REJECTED'  THEN 'REJECTED'
  WHEN 'WITHDRAWN' THEN 'ARCHIVED'
  ELSE 'DRAFT' END)::"EventStatus";

-- Dropping the old column also drops the dependent Event_status_startAt_idx (recreated below).
ALTER TABLE "Event" DROP COLUMN "status";
ALTER TABLE "Event" RENAME COLUMN "status_new" TO "status";

-- Backfill governance timestamps + a stable public slug for events carried over from the old model.
UPDATE "Event" SET "publishedAt" = COALESCE("reviewedAt", "updatedAt") WHERE "status" = 'PUBLISHED';
UPDATE "Event" SET "submittedAt" = "createdAt" WHERE "status" = 'SUBMITTED';
UPDATE "Event" SET "submissionCount" = 1 WHERE "status" IN ('SUBMITTED', 'PUBLISHED', 'APPROVED', 'ARCHIVED', 'REJECTED');

-- Slug: kebab-case of the title + the (unique) id, so the unique constraint can never collide
-- across carried-over rows. New events get clean, deduplicated slugs from src/lib/events.ts.
UPDATE "Event"
SET "slug" = left(trim(both '-' from regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g')), 60) || '-' || "id"
WHERE "slug" IS NULL AND "status" IN ('PUBLISHED', 'APPROVED', 'CANCELLED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "EventReview" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "EventStatus",
    "toStatus" "EventStatus",
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventReview_eventId_createdAt_idx" ON "EventReview"("eventId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_status_startAt_idx" ON "Event"("status", "startAt");

-- CreateIndex
CREATE INDEX "Event_ministryId_status_idx" ON "Event"("ministryId", "status");

-- CreateIndex
CREATE INDEX "Event_startAt_idx" ON "Event"("startAt");

-- AddForeignKey
ALTER TABLE "EventReview" ADD CONSTRAINT "EventReview_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReview" ADD CONSTRAINT "EventReview_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
