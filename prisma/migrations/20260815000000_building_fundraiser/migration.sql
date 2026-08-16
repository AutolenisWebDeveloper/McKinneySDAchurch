-- My Building Fundraiser (spec §1–§20).
--
-- Extends the existing peer-to-peer fundraising tables rather than introducing a parallel
-- system: Fundraiser gains a reviewed lifecycle, an owning identity per type, a referral
-- token and a target date; GivingHandoff records candidate (unconfirmed) attribution with no
-- donor identity; Supporter is the non-member carve-out; FundraisingAsset is the admin
-- content library. Verified dollars stay derived from Donation(status = 'CONFIRMED').
--
-- Fundraiser.active is REPLACED by Fundraiser.status. The column is backfilled before it is
-- dropped, so no live fundraiser loses its published state.

-- CreateEnum
CREATE TYPE "FundraiserType" AS ENUM ('PERSONAL', 'FAMILY', 'MINISTRY');

-- CreateEnum
CREATE TYPE "FundraiserStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FundraisingAssetKind" AS ENUM ('MESSAGE', 'GRAPHIC');

-- AlterTable: additive columns first (all nullable or defaulted, so existing rows are valid)
ALTER TABLE "Fundraiser"
  ADD COLUMN "type" "FundraiserType" NOT NULL DEFAULT 'PERSONAL',
  ADD COLUMN "status" "FundraiserStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "supporterId" TEXT,
  ADD COLUMN "householdId" TEXT,
  ADD COLUMN "ministryId" TEXT,
  ADD COLUMN "graphicUrl" TEXT,
  ADD COLUMN "targetDate" TIMESTAMP(3),
  ADD COLUMN "referralToken" TEXT,
  ADD COLUMN "referredByFundraiserId" TEXT,
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "closedAt" TIMESTAMP(3),
  ADD COLUMN "milestoneNotified" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: a fundraiser that was live stays live; anything switched off becomes CLOSED
-- (read-only, already-verified gifts untouched). Approved-at mirrors creation for live rows so
-- the manage view has a sensible history date.
UPDATE "Fundraiser"
   SET "status" = CASE WHEN "active" THEN 'ACTIVE'::"FundraiserStatus" ELSE 'CLOSED'::"FundraiserStatus" END,
       "approvedAt" = CASE WHEN "active" THEN "createdAt" ELSE NULL END,
       "closedAt" = CASE WHEN "active" THEN NULL ELSE "createdAt" END;

-- Backfill referral tokens for existing rows, then enforce NOT NULL + uniqueness.
-- gen_random_uuid() is built into PostgreSQL 13+, so this needs no extension.
UPDATE "Fundraiser" SET "referralToken" = replace(gen_random_uuid()::text, '-', '') WHERE "referralToken" IS NULL;
ALTER TABLE "Fundraiser" ALTER COLUMN "referralToken" SET NOT NULL;

-- The legacy boolean is now fully represented by "status".
ALTER TABLE "Fundraiser" DROP COLUMN "active";

-- The default existed only to backfill existing rows; Prisma always supplies updatedAt.
ALTER TABLE "Fundraiser" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "canManageHouseholdFundraising" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GivingHandoff" (
    "id" TEXT NOT NULL,
    "fundraiserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GivingHandoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supporter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "linkedMemberId" TEXT,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supporter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupporterLoginToken" (
    "id" TEXT NOT NULL,
    "supporterId" TEXT NOT NULL,
    "fundraiserId" TEXT NOT NULL,
    "tokenDigest" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupporterLoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundraisingAsset" (
    "id" TEXT NOT NULL,
    "kind" "FundraisingAssetKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundraisingAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GivingHandoff_fundraiserId_createdAt_idx" ON "GivingHandoff"("fundraiserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Supporter_emailNormalized_key" ON "Supporter"("emailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "SupporterLoginToken_tokenDigest_key" ON "SupporterLoginToken"("tokenDigest");

-- CreateIndex
CREATE INDEX "SupporterLoginToken_supporterId_idx" ON "SupporterLoginToken"("supporterId");

-- CreateIndex
CREATE INDEX "FundraisingAsset_kind_active_sortOrder_idx" ON "FundraisingAsset"("kind", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Fundraiser_referralToken_key" ON "Fundraiser"("referralToken");

-- DropIndex
DROP INDEX "Fundraiser_campaignId_idx";

-- CreateIndex
CREATE INDEX "Fundraiser_campaignId_status_idx" ON "Fundraiser"("campaignId", "status");

-- CreateIndex
CREATE INDEX "Fundraiser_ownerUserId_status_idx" ON "Fundraiser"("ownerUserId", "status");

-- CreateIndex
CREATE INDEX "Fundraiser_householdId_status_idx" ON "Fundraiser"("householdId", "status");

-- CreateIndex
CREATE INDEX "Fundraiser_ministryId_status_idx" ON "Fundraiser"("ministryId", "status");

-- CreateIndex
CREATE INDEX "Fundraiser_supporterId_status_idx" ON "Fundraiser"("supporterId", "status");

-- CreateIndex
CREATE INDEX "Fundraiser_referredByFundraiserId_idx" ON "Fundraiser"("referredByFundraiserId");

-- AddForeignKey
ALTER TABLE "Fundraiser" ADD CONSTRAINT "Fundraiser_supporterId_fkey" FOREIGN KEY ("supporterId") REFERENCES "Supporter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fundraiser" ADD CONSTRAINT "Fundraiser_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fundraiser" ADD CONSTRAINT "Fundraiser_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fundraiser" ADD CONSTRAINT "Fundraiser_referredByFundraiserId_fkey" FOREIGN KEY ("referredByFundraiserId") REFERENCES "Fundraiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingHandoff" ADD CONSTRAINT "GivingHandoff_fundraiserId_fkey" FOREIGN KEY ("fundraiserId") REFERENCES "Fundraiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupporterLoginToken" ADD CONSTRAINT "SupporterLoginToken_supporterId_fkey" FOREIGN KEY ("supporterId") REFERENCES "Supporter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One authorized family fundraiser per household, and one per ministry, while it is live
-- (§10). Expressed as partial unique indexes because the rule only applies to non-retired
-- rows — the same pattern the UserRole active-uniqueness indexes use.
CREATE UNIQUE INDEX "Fundraiser_household_live_key" ON "Fundraiser"("householdId")
  WHERE "householdId" IS NOT NULL AND "status" IN ('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'ACTIVE');

CREATE UNIQUE INDEX "Fundraiser_ministry_live_key" ON "Fundraiser"("ministryId")
  WHERE "ministryId" IS NOT NULL AND "status" IN ('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'ACTIVE');
