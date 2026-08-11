-- AlterEnum
ALTER TYPE "MemberInfoStatus" ADD VALUE IF NOT EXISTS 'APPROVED';

-- AlterTable Household
ALTER TABLE "Household"
  ADD COLUMN "anniversary" TIMESTAMP(3),
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "primaryContactId" TEXT,
  ADD COLUMN "notes" TEXT;

-- AlterTable Member
ALTER TABLE "Member"
  ADD COLUMN "baptismYear" INTEGER,
  ADD COLUMN "joinedYear" INTEGER,
  ADD COLUMN "currentMinistries" TEXT,
  ADD COLUMN "ministryInterests" TEXT,
  ADD COLUMN "occupation" TEXT,
  ADD COLUMN "employer" TEXT,
  ADD COLUMN "employmentStatus" TEXT,
  ADD COLUMN "skills" TEXT;

-- AlterTable MemberInfoSubmission
ALTER TABLE "MemberInfoSubmission"
  ADD COLUMN "invitedEmail" TEXT,
  ADD COLUMN "createdHouseholdId" TEXT;

-- CreateTable
CREATE TABLE "MemberInfoInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "note" TEXT,
    "tokenDigest" TEXT NOT NULL,
    "sentById" TEXT,
    "submissionId" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberInfoInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberInfoInvite_tokenDigest_key" ON "MemberInfoInvite"("tokenDigest");
CREATE INDEX "MemberInfoInvite_emailNormalized_idx" ON "MemberInfoInvite"("emailNormalized");
