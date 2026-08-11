-- Phase 2: member account requests + membership matching (§20). Additive; no data migration.

CREATE TYPE "AccountRequestStatus" AS ENUM ('AUTO_APPROVED', 'PENDING_ADMIN_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_INFO');

CREATE TABLE "AccountRequest" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "phone" TEXT,
    "verificationData" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "AccountRequestStatus" NOT NULL DEFAULT 'PENDING_ADMIN_REVIEW',
    "matchedMemberId" TEXT,
    "matchConfidence" INTEGER,
    "matchBand" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AccountRequest_status_createdAt_idx" ON "AccountRequest"("status", "createdAt");
CREATE INDEX "AccountRequest_emailNormalized_idx" ON "AccountRequest"("emailNormalized");

ALTER TABLE "AccountRequest" ADD CONSTRAINT "AccountRequest_matchedMemberId_fkey" FOREIGN KEY ("matchedMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountRequest" ADD CONSTRAINT "AccountRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
