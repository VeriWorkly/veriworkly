CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'ANNUAL');
CREATE TYPE "PortfolioPublicationStatus" AS ENUM ('LIVE', 'GRACE', 'SUSPENDED');
CREATE TYPE "BillingWebhookStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED');
CREATE TYPE "PortfolioAssetKind" AS ENUM ('AVATAR', 'PROJECT_COVER', 'SOCIAL_IMAGE');
CREATE TYPE "PortfolioAssetStatus" AS ENUM ('PENDING', 'READY');

ALTER TABLE "Subscription"
ADD COLUMN "interval" "BillingInterval",
ADD COLUMN "rawStatus" TEXT,
ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "graceEndsAt" TIMESTAMP(3),
ADD COLUMN "lastWebhookAt" TIMESTAMP(3);

ALTER TABLE "PortfolioPublication"
ADD COLUMN "status" "PortfolioPublicationStatus" NOT NULL DEFAULT 'LIVE',
ADD COLUMN "publishedRevision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "suspensionReason" TEXT,
ADD COLUMN "suspendedAt" TIMESTAMP(3);

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
    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

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

CREATE UNIQUE INDEX "BillingWebhookEvent_providerEventId_key" ON "BillingWebhookEvent"("providerEventId");
CREATE INDEX "BillingWebhookEvent_type_createdAt_idx" ON "BillingWebhookEvent"("type", "createdAt");
CREATE INDEX "BillingWebhookEvent_status_createdAt_idx" ON "BillingWebhookEvent"("status", "createdAt");
CREATE UNIQUE INDEX "PortfolioAsset_key_key" ON "PortfolioAsset"("key");
CREATE INDEX "PortfolioAsset_userId_status_idx" ON "PortfolioAsset"("userId", "status");
CREATE UNIQUE INDEX "PortfolioViewDaily_publicationId_date_referrerHost_key" ON "PortfolioViewDaily"("publicationId", "date", "referrerHost");
CREATE INDEX "PortfolioViewDaily_publicationId_date_idx" ON "PortfolioViewDaily"("publicationId", "date");
CREATE INDEX "PortfolioPublication_status_subdomain_idx" ON "PortfolioPublication"("status", "subdomain");

ALTER TABLE "PortfolioAsset" ADD CONSTRAINT "PortfolioAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortfolioViewDaily" ADD CONSTRAINT "PortfolioViewDaily_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "PortfolioPublication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
