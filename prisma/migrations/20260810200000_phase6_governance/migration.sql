-- Phase 6: Governance — committees, motions, action items, secretary notes, Church Manual (§31–§35). Additive.

CREATE TYPE "MotionResult" AS ENUM ('PENDING', 'CARRIED', 'FAILED', 'TABLED', 'WITHDRAWN');
CREATE TYPE "ActionItemStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- BoardMeeting extensions
ALTER TABLE "BoardMeeting"
  ADD COLUMN "location" TEXT,
  ADD COLUMN "attendees" TEXT,
  ADD COLUMN "excusedAbsences" TEXT,
  ADD COLUMN "committeeId" TEXT;

CREATE TABLE "Committee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Committee_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Committee_slug_key" ON "Committee"("slug");

CREATE TABLE "CommitteeMember" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommitteeMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommitteeMember_committeeId_memberId_key" ON "CommitteeMember"("committeeId", "memberId");
CREATE INDEX "CommitteeMember_committeeId_idx" ON "CommitteeMember"("committeeId");

CREATE TABLE "Motion" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "moverName" TEXT,
    "seconderName" TEXT,
    "result" "MotionResult" NOT NULL DEFAULT 'PENDING',
    "votesFor" INTEGER NOT NULL DEFAULT 0,
    "votesAgainst" INTEGER NOT NULL DEFAULT 0,
    "votesAbstain" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Motion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Motion_meetingId_idx" ON "Motion"("meetingId");

CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ownerMemberId" TEXT,
    "ownerName" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "ActionItemStatus" NOT NULL DEFAULT 'OPEN',
    "meetingId" TEXT,
    "committeeId" TEXT,
    "createdById" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ActionItem_status_idx" ON "ActionItem"("status");
CREATE INDEX "ActionItem_meetingId_idx" ON "ActionItem"("meetingId");
CREATE INDEX "ActionItem_committeeId_idx" ON "ActionItem"("committeeId");

CREATE TABLE "SecretaryNote" (
    "id" TEXT NOT NULL,
    "bodyEncrypted" TEXT NOT NULL,
    "authorId" TEXT,
    "confidential" BOOLEAN NOT NULL DEFAULT true,
    "meetingId" TEXT,
    "committeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecretaryNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SecretaryNote_meetingId_idx" ON "SecretaryNote"("meetingId");
CREATE INDEX "SecretaryNote_committeeId_idx" ON "SecretaryNote"("committeeId");

CREATE TABLE "ChurchManualVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT,
    "documentId" TEXT,
    "externalUrl" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "releaseNotes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChurchManualVersion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChurchManualVersion_active_idx" ON "ChurchManualVersion"("active");

-- FKs
ALTER TABLE "BoardMeeting" ADD CONSTRAINT "BoardMeeting_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommitteeMember" ADD CONSTRAINT "CommitteeMember_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommitteeMember" ADD CONSTRAINT "CommitteeMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Motion" ADD CONSTRAINT "Motion_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "BoardMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "BoardMeeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecretaryNote" ADD CONSTRAINT "SecretaryNote_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "BoardMeeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecretaryNote" ADD CONSTRAINT "SecretaryNote_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
