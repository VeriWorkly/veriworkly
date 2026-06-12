-- CreateEnum
CREATE TYPE "PortfolioPlan" AS ENUM ('FREE', 'PORTFOLIO_PRO');

-- AlterEnum
ALTER TYPE "BillingInterval" ADD VALUE IF NOT EXISTS 'SEVEN_DAY';

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "portfolioPlan" "PortfolioPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN "portfolioCanPublish" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "portfolioAccessEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BillingWebhookEvent" ADD COLUMN "userId" TEXT;

-- Backfill current entitlements from the newest active or trialing subscription.
UPDATE "User" AS u
SET
  "portfolioPlan" = 'PORTFOLIO_PRO',
  "portfolioCanPublish" = true,
  "portfolioAccessEndsAt" = (
    SELECT s."currentPeriodEnd"
    FROM "Subscription" AS s
    WHERE s."userId" = u."id"
      AND s."status" IN ('ACTIVE', 'TRIALING')
      AND (s."currentPeriodEnd" IS NULL OR s."currentPeriodEnd" > CURRENT_TIMESTAMP)
    ORDER BY s."updatedAt" DESC
    LIMIT 1
  )
WHERE EXISTS (
  SELECT 1
  FROM "Subscription" AS s
  WHERE s."userId" = u."id"
    AND s."status" IN ('ACTIVE', 'TRIALING')
    AND (s."currentPeriodEnd" IS NULL OR s."currentPeriodEnd" > CURRENT_TIMESTAMP)
);

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_userId_createdAt_idx"
ON "BillingWebhookEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "BillingWebhookEvent"
ADD CONSTRAINT "BillingWebhookEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
