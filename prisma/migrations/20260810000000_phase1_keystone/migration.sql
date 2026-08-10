-- Phase 1 keystone: multi-role RBAC (UserRole + ELDER), WorkItem spine, notifications.
-- Additive and backfill-safe: existing single-role users are preserved and mirrored into UserRole.

-- ===== Roles =====
-- Add ELDER to the application role set. (PG12+ allows ADD VALUE inside a transaction;
-- the new value is not referenced by any literal in this migration, so it is safe.)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ELDER';

-- Preferred default portal; falls back to the legacy `role` when null.
ALTER TABLE "User" ADD COLUMN "primaryRole" "Role";

-- ===== WorkItem enums =====
CREATE TYPE "WorkItemType" AS ENUM ('CARE', 'PRAYER', 'LEADERSHIP_MESSAGE', 'SUPPORT', 'VOLUNTEER', 'SPONSOR', 'CONTACT');
CREATE TYPE "WorkItemStatus" AS ENUM ('NEW', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'FOLLOW_UP', 'NEEDS_INFO', 'RESOLVED', 'CLOSED');
CREATE TYPE "WorkItemPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "WorkItemConfidentiality" AS ENUM ('NORMAL', 'SENSITIVE', 'LEADERSHIP_ONLY');
CREATE TYPE "WorkItemMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- ===== UserRole =====
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "ministryId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserRole_userId_active_idx" ON "UserRole"("userId", "active");
CREATE INDEX "UserRole_role_active_idx" ON "UserRole"("role", "active");
CREATE INDEX "UserRole_ministryId_idx" ON "UserRole"("ministryId");

-- At most one ACTIVE global assignment per (user, role); at most one ACTIVE ministry-scoped
-- assignment per (user, role, ministry). Revoked rows are unconstrained so history is preserved
-- and roles can be reassigned. Partial predicates cannot be expressed via Prisma @@unique.
CREATE UNIQUE INDEX "UserRole_active_global_key" ON "UserRole"("userId", "role") WHERE "ministryId" IS NULL AND "active" = true;
CREATE UNIQUE INDEX "UserRole_active_ministry_key" ON "UserRole"("userId", "role", "ministryId") WHERE "ministryId" IS NOT NULL AND "active" = true;

ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== WorkItem =====
CREATE TABLE "WorkItem" (
    "id" TEXT NOT NULL,
    "type" "WorkItemType" NOT NULL,
    "status" "WorkItemStatus" NOT NULL DEFAULT 'NEW',
    "priority" "WorkItemPriority" NOT NULL DEFAULT 'NORMAL',
    "confidentiality" "WorkItemConfidentiality" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "category" TEXT,
    "bodyEncrypted" TEXT,
    "requesterUserId" TEXT,
    "requesterName" TEXT,
    "requesterEmail" TEXT,
    "subjectName" TEXT,
    "assigneeUserId" TEXT,
    "ministryId" TEXT,
    "closeReason" TEXT,
    "followUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "WorkItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkItem_type_status_idx" ON "WorkItem"("type", "status");
CREATE INDEX "WorkItem_assigneeUserId_status_idx" ON "WorkItem"("assigneeUserId", "status");
CREATE INDEX "WorkItem_ministryId_status_idx" ON "WorkItem"("ministryId", "status");
CREATE INDEX "WorkItem_status_priority_idx" ON "WorkItem"("status", "priority");

ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== WorkItemNote =====
CREATE TABLE "WorkItemNote" (
    "id" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "bodyEncrypted" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkItemNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkItemNote_workItemId_idx" ON "WorkItemNote"("workItemId");
ALTER TABLE "WorkItemNote" ADD CONSTRAINT "WorkItemNote_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkItemNote" ADD CONSTRAINT "WorkItemNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== WorkItemEvent (append-only history) =====
CREATE TABLE "WorkItemEvent" (
    "id" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "kind" TEXT NOT NULL,
    "fromStatus" "WorkItemStatus",
    "toStatus" "WorkItemStatus",
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkItemEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkItemEvent_workItemId_createdAt_idx" ON "WorkItemEvent"("workItemId", "createdAt");
ALTER TABLE "WorkItemEvent" ADD CONSTRAINT "WorkItemEvent_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkItemEvent" ADD CONSTRAINT "WorkItemEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== WorkItemMessage (requester <-> staff) =====
CREATE TABLE "WorkItemMessage" (
    "id" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "direction" "WorkItemMessageDirection" NOT NULL,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkItemMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkItemMessage_workItemId_createdAt_idx" ON "WorkItemMessage"("workItemId", "createdAt");
ALTER TABLE "WorkItemMessage" ADD CONSTRAINT "WorkItemMessage_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkItemMessage" ADD CONSTRAINT "WorkItemMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== WorkItemAttachment (binds to a secured Document) =====
CREATE TABLE "WorkItemAttachment" (
    "id" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkItemAttachment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkItemAttachment_workItemId_documentId_key" ON "WorkItemAttachment"("workItemId", "documentId");
CREATE INDEX "WorkItemAttachment_workItemId_idx" ON "WorkItemAttachment"("workItemId");
ALTER TABLE "WorkItemAttachment" ADD CONSTRAINT "WorkItemAttachment_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkItemAttachment" ADD CONSTRAINT "WorkItemAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===== Notification =====
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "deepLink" TEXT,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== Backfill =====
-- Mirror every existing user's legacy single role into an active UserRole (authorization
-- source of truth going forward). MINISTRY_HEAD assignments carry the user's ministry scope.
INSERT INTO "UserRole" ("id", "userId", "role", "ministryId", "active", "assignedAt", "createdAt", "updatedAt")
SELECT
    'seedrole_' || "id",
    "id",
    "role",
    CASE WHEN "role" = 'MINISTRY_HEAD' THEN "ministryId" ELSE NULL END,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User";

-- Seed each user's preferred default portal from their legacy role.
UPDATE "User" SET "primaryRole" = "role" WHERE "primaryRole" IS NULL;
