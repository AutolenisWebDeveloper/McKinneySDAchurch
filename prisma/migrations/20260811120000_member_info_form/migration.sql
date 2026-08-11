-- CreateEnum
CREATE TYPE "MemberInfoStatus" AS ENUM ('NEW', 'REVIEWED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "MemberInfoSubmission" (
    "id" TEXT NOT NULL,
    "householdName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "status" "MemberInfoStatus" NOT NULL DEFAULT 'NEW',
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "payloadEnc" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberInfoSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberInfoSubmission_status_createdAt_idx" ON "MemberInfoSubmission"("status", "createdAt");
