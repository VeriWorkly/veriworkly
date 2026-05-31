-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RESUME', 'COVER_LETTER', 'PORTFOLIO', 'LINK_IN_BIO');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INACTIVE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "PortfolioPublicationStatus" AS ENUM ('LIVE', 'GRACE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BillingWebhookStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "PortfolioAssetKind" AS ENUM ('AVATAR', 'PROJECT_COVER', 'SOCIAL_IMAGE');

-- CreateEnum
CREATE TYPE "PortfolioAssetStatus" AS ENUM ('PENDING', 'READY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'RESUME',
    "title" TEXT NOT NULL DEFAULT 'Untitled Document',
    "slug" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "content" JSONB NOT NULL,
    "metadata" JSONB,
    "templateId" TEXT NOT NULL DEFAULT 'modern',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerCustomerId" TEXT,
    "providerPriceId" TEXT,
    "providerSubId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "interval" "BillingInterval",
    "rawStatus" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "graceEndsAt" TIMESTAMP(3),
    "lastWebhookAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioPublication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "status" "PortfolioPublicationStatus" NOT NULL DEFAULT 'LIVE',
    "publishedRevision" INTEGER NOT NULL DEFAULT 1,
    "suspensionReason" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "BillingWebhookStatus" NOT NULL DEFAULT 'PROCESSING',
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "PortfolioAssetKind" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "status" "PortfolioAssetStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioViewDaily" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "referrerHost" TEXT NOT NULL DEFAULT '',
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioViewDaily_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "passwordHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareView" (
    "id" TEXT NOT NULL,
    "shareLinkId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapFeature" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "eta" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedQuarter" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fullDescription" TEXT,
    "whyItMatters" TEXT,
    "timeline" TEXT,
    "details" JSONB,

    CONSTRAINT "RoadmapFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapInteraction_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "UsageMetricFlushBatch" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageMetricFlushBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewFlushBatch" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewFlushBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubSync" (
    "id" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "projectUrl" TEXT NOT NULL,
    "issueCount" INTEGER NOT NULL DEFAULT 0,
    "onlyIssueCount" INTEGER NOT NULL DEFAULT 0,
    "prCount" INTEGER NOT NULL DEFAULT 0,
    "todoCount" INTEGER NOT NULL DEFAULT 0,
    "inProgressCount" INTEGER NOT NULL DEFAULT 0,
    "doneCount" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "etag" TEXT,
    "lastSyncStatus" TEXT,
    "lastError" TEXT,
    "nextSyncAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubSync_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keySuffix" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY['user:read']::TEXT[],
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rateLimit" INTEGER NOT NULL DEFAULT 20,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsed" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE INDEX "Verification_expiresAt_idx" ON "Verification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_identifier_value_key" ON "Verification"("identifier", "value");

-- CreateIndex
CREATE INDEX "Document_userId_type_deletedAt_updatedAt_idx" ON "Document"("userId", "type", "deletedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "Document_userId_deletedAt_updatedAt_idx" ON "Document"("userId", "deletedAt", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Document_userId_slug_key" ON "Document"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerSubId_key" ON "Subscription"("providerSubId");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE INDEX "Subscription_userId_updatedAt_idx" ON "Subscription"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioPublication_userId_key" ON "PortfolioPublication"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioPublication_documentId_key" ON "PortfolioPublication"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioPublication_subdomain_key" ON "PortfolioPublication"("subdomain");

-- CreateIndex
CREATE INDEX "PortfolioPublication_status_updatedAt_idx" ON "PortfolioPublication"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BillingWebhookEvent_providerEventId_key" ON "BillingWebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_type_createdAt_idx" ON "BillingWebhookEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_status_createdAt_idx" ON "BillingWebhookEvent"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioAsset_key_key" ON "PortfolioAsset"("key");

-- CreateIndex
CREATE INDEX "PortfolioAsset_userId_status_idx" ON "PortfolioAsset"("userId", "status");

-- CreateIndex
CREATE INDEX "PortfolioViewDaily_publicationId_date_idx" ON "PortfolioViewDaily"("publicationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioViewDaily_publicationId_date_referrerHost_key" ON "PortfolioViewDaily"("publicationId", "date", "referrerHost");

-- CreateIndex
CREATE UNIQUE INDEX "MasterProfile_userId_key" ON "MasterProfile"("userId");

-- CreateIndex
CREATE INDEX "ShareLink_documentId_idx" ON "ShareLink"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_userId_documentId_key" ON "ShareLink"("userId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_userId_slug_key" ON "ShareLink"("userId", "slug");

-- CreateIndex
CREATE INDEX "ShareView_shareLinkId_idx" ON "ShareView"("shareLinkId");

-- CreateIndex
CREATE INDEX "ShareView_createdAt_idx" ON "ShareView"("createdAt");

-- CreateIndex
CREATE INDEX "RoadmapFeature_status_idx" ON "RoadmapFeature"("status");

-- CreateIndex
CREATE INDEX "RoadmapFeature_createdAt_idx" ON "RoadmapFeature"("createdAt");

-- CreateIndex
CREATE INDEX "RoadmapFeature_status_createdAt_idx" ON "RoadmapFeature"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RoadmapFeature_completedAt_updatedAt_idx" ON "RoadmapFeature"("completedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "RoadmapFeature_status_completedAt_updatedAt_idx" ON "RoadmapFeature"("status", "completedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "RoadmapInteraction_userId_idx" ON "RoadmapInteraction"("userId");

-- CreateIndex
CREATE INDEX "RoadmapInteraction_featureId_idx" ON "RoadmapInteraction"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapInteraction_userId_featureId_type_key" ON "RoadmapInteraction"("userId", "featureId", "type");

-- CreateIndex
CREATE INDEX "UsageMetricDaily_event_date_idx" ON "UsageMetricDaily"("event", "date");

-- CreateIndex
CREATE UNIQUE INDEX "UsageMetricDaily_date_event_key" ON "UsageMetricDaily"("date", "event");

-- CreateIndex
CREATE INDEX "UsageMetricFlushBatch_date_idx" ON "UsageMetricFlushBatch"("date");

-- CreateIndex
CREATE INDEX "ViewFlushBatch_kind_createdAt_idx" ON "ViewFlushBatch"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "GitHubSync_syncedAt_idx" ON "GitHubSync"("syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubSync_projectUrl_key" ON "GitHubSync"("projectUrl");

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

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_userId_isActive_idx" ON "ApiKey"("userId", "isActive");

-- CreateIndex
CREATE INDEX "ApiKey_isActive_idx" ON "ApiKey"("isActive");

-- CreateIndex
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_method_path_idx" ON "AuditLog"("method", "path");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioPublication" ADD CONSTRAINT "PortfolioPublication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioPublication" ADD CONSTRAINT "PortfolioPublication_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioAsset" ADD CONSTRAINT "PortfolioAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioViewDaily" ADD CONSTRAINT "PortfolioViewDaily_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "PortfolioPublication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterProfile" ADD CONSTRAINT "MasterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareView" ADD CONSTRAINT "ShareView_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "ShareLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapInteraction" ADD CONSTRAINT "RoadmapInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapInteraction" ADD CONSTRAINT "RoadmapInteraction_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "RoadmapFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubSyncItem" ADD CONSTRAINT "GitHubSyncItem_syncId_fkey" FOREIGN KEY ("syncId") REFERENCES "GitHubSync"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
