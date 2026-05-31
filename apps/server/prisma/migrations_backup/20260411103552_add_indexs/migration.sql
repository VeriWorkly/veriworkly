-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "cloudResumeId" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncStatus" TEXT NOT NULL DEFAULT 'local-only';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MasterProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeCloudSync" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "syncStatus" TEXT NOT NULL DEFAULT 'local-only',
    "cloudResumeId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeCloudSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeShareLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "resumeTitle" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "passwordHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeShareView" (
    "id" TEXT NOT NULL,
    "shareLinkId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeShareView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageMetricDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "event" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageMetricDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubSyncItem" (
    "id" TEXT NOT NULL,
    "syncId" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "insertedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubSyncItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterProfile_userId_key" ON "MasterProfile"("userId");

-- CreateIndex
CREATE INDEX "ResumeCloudSync_userId_idx" ON "ResumeCloudSync"("userId");

-- CreateIndex
CREATE INDEX "ResumeCloudSync_resumeId_idx" ON "ResumeCloudSync"("resumeId");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeCloudSync_userId_resumeId_key" ON "ResumeCloudSync"("userId", "resumeId");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeShareLink_token_key" ON "ResumeShareLink"("token");

-- CreateIndex
CREATE INDEX "ResumeShareLink_userId_idx" ON "ResumeShareLink"("userId");

-- CreateIndex
CREATE INDEX "ResumeShareLink_resumeId_idx" ON "ResumeShareLink"("resumeId");

-- CreateIndex
CREATE INDEX "ResumeShareLink_expiresAt_idx" ON "ResumeShareLink"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeShareLink_userId_resumeId_key" ON "ResumeShareLink"("userId", "resumeId");

-- CreateIndex
CREATE INDEX "ResumeShareView_shareLinkId_idx" ON "ResumeShareView"("shareLinkId");

-- CreateIndex
CREATE INDEX "ResumeShareView_createdAt_idx" ON "ResumeShareView"("createdAt");

-- CreateIndex
CREATE INDEX "UsageMetricDaily_event_date_idx" ON "UsageMetricDaily"("event", "date");

-- CreateIndex
CREATE UNIQUE INDEX "UsageMetricDaily_date_event_key" ON "UsageMetricDaily"("date", "event");

-- CreateIndex
CREATE INDEX "GitHubSyncItem_syncId_idx" ON "GitHubSyncItem"("syncId");

-- CreateIndex
CREATE INDEX "GitHubSyncItem_status_idx" ON "GitHubSyncItem"("status");

-- CreateIndex
CREATE INDEX "GitHubSyncItem_kind_idx" ON "GitHubSyncItem"("kind");

-- CreateIndex
CREATE INDEX "GitHubSyncItem_createdAt_idx" ON "GitHubSyncItem"("createdAt");

-- CreateIndex
CREATE INDEX "GitHubSyncItem_updatedAt_idx" ON "GitHubSyncItem"("updatedAt");

-- CreateIndex
CREATE INDEX "GitHubSyncItem_syncId_updatedAt_idx" ON "GitHubSyncItem"("syncId", "updatedAt");

-- CreateIndex
CREATE INDEX "GitHubSyncItem_syncId_status_updatedAt_idx" ON "GitHubSyncItem"("syncId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "GitHubSyncItem_syncId_kind_updatedAt_idx" ON "GitHubSyncItem"("syncId", "kind", "updatedAt");

-- CreateIndex
CREATE INDEX "GitHubSyncItem_syncId_status_kind_updatedAt_idx" ON "GitHubSyncItem"("syncId", "status", "kind", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubSyncItem_syncId_githubId_key" ON "GitHubSyncItem"("syncId", "githubId");

-- AddForeignKey
ALTER TABLE "MasterProfile" ADD CONSTRAINT "MasterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeCloudSync" ADD CONSTRAINT "ResumeCloudSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeShareLink" ADD CONSTRAINT "ResumeShareLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeShareView" ADD CONSTRAINT "ResumeShareView_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "ResumeShareLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubSyncItem" ADD CONSTRAINT "GitHubSyncItem_syncId_fkey" FOREIGN KEY ("syncId") REFERENCES "GitHubSync"("id") ON DELETE CASCADE ON UPDATE CASCADE;
