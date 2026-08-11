-- Phase 9: lightweight CMS (§44). Additive.
CREATE TABLE "ContentBlock" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContentBlock_key_locale_key" ON "ContentBlock"("key", "locale");
CREATE INDEX "ContentBlock_key_idx" ON "ContentBlock"("key");
