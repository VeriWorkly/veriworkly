-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('SUBSCRIPTION', 'MANUAL', 'PROMOTION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('GRANT', 'DEBIT', 'REFUND', 'ADJUSTMENT', 'EXPIRATION');

-- AlterTable
ALTER TABLE "Subscription"
ADD COLUMN "productKey" TEXT NOT NULL DEFAULT 'portfolio_pro';

-- CreateTable
CREATE TABLE "EntitlementGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "source" "EntitlementSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntitlementGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeCredited" INTEGER NOT NULL DEFAULT 0,
    "lifetimeDebited" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "action" TEXT,
    "requestId" TEXT,
    "documentId" TEXT,
    "referenceId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- Backfill the current Portfolio Pro read model into the new entitlement source of truth.
INSERT INTO "EntitlementGrant" (
    "id", "userId", "key", "source", "sourceId", "startsAt", "endsAt", "createdAt", "updatedAt"
)
SELECT
    'migration-' || entitlement."key" || '-' || users."id",
    users."id",
    entitlement."key",
    'SYSTEM',
    'legacy-portfolio-access',
    users."createdAt",
    users."portfolioAccessEndsAt",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User" AS users
CROSS JOIN (
    VALUES
        ('portfolio_publish'),
        ('custom_subdomain'),
        ('seo_controls'),
        ('analytics'),
        ('watermark_removal')
) AS entitlement("key")
WHERE users."portfolioCanPublish" = true
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE INDEX "Subscription_userId_productKey_status_idx" ON "Subscription"("userId", "productKey", "status");
CREATE UNIQUE INDEX "EntitlementGrant_userId_key_source_sourceId_key" ON "EntitlementGrant"("userId", "key", "source", "sourceId");
CREATE INDEX "EntitlementGrant_userId_key_startsAt_endsAt_revokedAt_idx" ON "EntitlementGrant"("userId", "key", "startsAt", "endsAt", "revokedAt");
CREATE INDEX "EntitlementGrant_source_sourceId_idx" ON "EntitlementGrant"("source", "sourceId");
CREATE UNIQUE INDEX "CreditWallet_userId_key" ON "CreditWallet"("userId");
CREATE INDEX "CreditWallet_updatedAt_idx" ON "CreditWallet"("updatedAt");
CREATE UNIQUE INDEX "CreditTransaction_requestId_key" ON "CreditTransaction"("requestId");
CREATE INDEX "CreditTransaction_userId_createdAt_idx" ON "CreditTransaction"("userId", "createdAt");
CREATE INDEX "CreditTransaction_walletId_createdAt_idx" ON "CreditTransaction"("walletId", "createdAt");
CREATE INDEX "CreditTransaction_referenceId_idx" ON "CreditTransaction"("referenceId");

-- AddForeignKey
ALTER TABLE "EntitlementGrant" ADD CONSTRAINT "EntitlementGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditWallet" ADD CONSTRAINT "CreditWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "CreditWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
