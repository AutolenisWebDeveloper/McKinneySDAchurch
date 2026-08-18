-- CreateEnum
CREATE TYPE "NewsletterIssueStatus" AS ENUM ('DRAFT', 'COLLECTING', 'IN_REVIEW', 'READY', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NewsletterSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'ADDED_TO_ISSUE', 'DECLINED');

-- CreateEnum
CREATE TYPE "NewsletterContentType" AS ENUM ('NEWS', 'EVENT', 'ANNOUNCEMENT', 'MINISTRY_STORY', 'ACCOMPLISHMENT', 'VOLUNTEER', 'TESTIMONY', 'OUTREACH', 'OTHER');

-- CreateEnum
CREATE TYPE "NewsletterSectionType" AS ENUM ('HERO', 'PASTOR_MESSAGE', 'FEATURED_STORY', 'CHURCH_LIFE', 'MINISTRY_SPOTLIGHT', 'MEMBER_HIGHLIGHT', 'COMMUNITY_MISSION', 'UPCOMING_EVENTS', 'PHOTO_STORY', 'BUILDING_UPDATE', 'SERVE_INVOLVED', 'CTA', 'STAY_CONNECTED', 'FOOTER');

-- CreateTable
CREATE TABLE "NewsletterIssue" (
    "id" TEXT NOT NULL,
    "monthStart" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "NewsletterIssueStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "coverHeadline" TEXT,
    "theme" TEXT,
    "coverImageUrl" TEXT,
    "coverImageAlt" TEXT,
    "pastorMessageHtml" TEXT,
    "pastorMessageBy" TEXT,
    "requestAt" TIMESTAMP(3),
    "reminderAt" TIMESTAMP(3),
    "submissionDeadlineAt" TIMESTAMP(3),
    "audienceSegment" TEXT NOT NULL DEFAULT 'ACTIVE_MEMBERS',
    "scheduledSendAt" TIMESTAMP(3),
    "testEmailSentAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "webPublishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "readinessScore" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubmission" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "ministryId" TEXT,
    "submittedById" TEXT,
    "status" "NewsletterSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 0,
    "contentType" "NewsletterContentType" NOT NULL DEFAULT 'NEWS',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "summary" TEXT,
    "fullContentHtml" TEXT,
    "eventStartAt" TIMESTAMP(3),
    "eventId" TEXT,
    "location" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "externalUrl" TEXT,
    "internalNotes" TEXT,
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSection" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "type" "NewsletterSectionType" NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "bodyHtml" TEXT,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "submissionId" TEXT,
    "eventId" TEXT,
    "config" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterImage" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT,
    "sectionId" TEXT,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterReminder" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ministryId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterDistribution" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "suppressedCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "NewsletterDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterIssue_monthStart_key" ON "NewsletterIssue"("monthStart");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterIssue_slug_key" ON "NewsletterIssue"("slug");

-- CreateIndex
CREATE INDEX "NewsletterIssue_status_monthStart_idx" ON "NewsletterIssue"("status", "monthStart");

-- CreateIndex
CREATE INDEX "NewsletterSubmission_issueId_status_idx" ON "NewsletterSubmission"("issueId", "status");

-- CreateIndex
CREATE INDEX "NewsletterSubmission_ministryId_idx" ON "NewsletterSubmission"("ministryId");

-- CreateIndex
CREATE INDEX "NewsletterSubmission_submittedById_idx" ON "NewsletterSubmission"("submittedById");

-- CreateIndex
CREATE INDEX "NewsletterSection_issueId_sortOrder_idx" ON "NewsletterSection"("issueId", "sortOrder");

-- CreateIndex
CREATE INDEX "NewsletterImage_submissionId_idx" ON "NewsletterImage"("submissionId");

-- CreateIndex
CREATE INDEX "NewsletterImage_sectionId_idx" ON "NewsletterImage"("sectionId");

-- CreateIndex
CREATE INDEX "NewsletterReminder_issueId_kind_idx" ON "NewsletterReminder"("issueId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterReminder_issueId_kind_userId_key" ON "NewsletterReminder"("issueId", "kind", "userId");

-- CreateIndex
CREATE INDEX "NewsletterDistribution_issueId_idx" ON "NewsletterDistribution"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterDistribution_issueId_channel_key" ON "NewsletterDistribution"("issueId", "channel");

-- AddForeignKey
ALTER TABLE "NewsletterSubmission" ADD CONSTRAINT "NewsletterSubmission_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "NewsletterIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterSubmission" ADD CONSTRAINT "NewsletterSubmission_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterSection" ADD CONSTRAINT "NewsletterSection_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "NewsletterIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterImage" ADD CONSTRAINT "NewsletterImage_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "NewsletterSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterImage" ADD CONSTRAINT "NewsletterImage_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "NewsletterSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterReminder" ADD CONSTRAINT "NewsletterReminder_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "NewsletterIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterDistribution" ADD CONSTRAINT "NewsletterDistribution_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "NewsletterIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

