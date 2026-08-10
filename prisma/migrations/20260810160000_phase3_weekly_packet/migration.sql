-- Phase 3: Weekly Communications engine (§22/§23). Additive.

CREATE TYPE "WeeklyPacketStatus" AS ENUM ('COLLECTING', 'IN_REVIEW', 'READY', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "PacketSubmissionKind" AS ENUM ('ANNOUNCEMENT', 'EVENT', 'SABBATH_PROGRAM_ITEM', 'PARTICIPANT', 'MINISTRY_UPDATE', 'NOTHING_THIS_WEEK');
CREATE TYPE "PacketSubmissionStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'NEEDS_INFO');

CREATE TABLE "WeeklyPacket" (
    "id" TEXT NOT NULL,
    "sabbathDate" TIMESTAMP(3) NOT NULL,
    "status" "WeeklyPacketStatus" NOT NULL DEFAULT 'COLLECTING',
    "readinessScore" INTEGER NOT NULL DEFAULT 0,
    "deadlineAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "bulletinId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyPacket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WeeklyPacket_sabbathDate_key" ON "WeeklyPacket"("sabbathDate");
CREATE UNIQUE INDEX "WeeklyPacket_bulletinId_key" ON "WeeklyPacket"("bulletinId");
CREATE INDEX "WeeklyPacket_status_sabbathDate_idx" ON "WeeklyPacket"("status", "sabbathDate");
ALTER TABLE "WeeklyPacket" ADD CONSTRAINT "WeeklyPacket_bulletinId_fkey" FOREIGN KEY ("bulletinId") REFERENCES "Bulletin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PacketSubmission" (
    "id" TEXT NOT NULL,
    "packetId" TEXT NOT NULL,
    "ministryId" TEXT,
    "submittedById" TEXT,
    "kind" "PacketSubmissionKind" NOT NULL,
    "status" "PacketSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "title" TEXT,
    "body" TEXT,
    "participantName" TEXT,
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PacketSubmission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PacketSubmission_packetId_status_idx" ON "PacketSubmission"("packetId", "status");
CREATE INDEX "PacketSubmission_ministryId_idx" ON "PacketSubmission"("ministryId");
CREATE INDEX "PacketSubmission_submittedById_idx" ON "PacketSubmission"("submittedById");
ALTER TABLE "PacketSubmission" ADD CONSTRAINT "PacketSubmission_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "WeeklyPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PacketSubmission" ADD CONSTRAINT "PacketSubmission_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
