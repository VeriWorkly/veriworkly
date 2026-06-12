CREATE TYPE "AffiliateStatus" AS ENUM ('NOT_ENROLLED', 'PENDING', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "AffiliateTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');
CREATE TYPE "AffiliateReferralStatus" AS ENUM ('SIGNED_UP', 'CONVERTED', 'REJECTED');
CREATE TYPE "AffiliateCommissionStatus" AS ENUM ('PENDING', 'AVAILABLE', 'REVERSED', 'PAID');
CREATE TYPE "AffiliateWithdrawalStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PAID');

ALTER TABLE "User"
ADD COLUMN "affiliateStatus" "AffiliateStatus" NOT NULL DEFAULT 'NOT_ENROLLED',
ADD COLUMN "affiliateTier" "AffiliateTier" NOT NULL DEFAULT 'TIER_1',
ADD COLUMN "affiliateCode" TEXT,
ADD COLUMN "affiliateEnrolledAt" TIMESTAMP(3);

CREATE TABLE "AffiliateReferral" (
  "id" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "referredUserId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "status" "AffiliateReferralStatus" NOT NULL DEFAULT 'SIGNED_UP',
  "convertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AffiliateReferral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AffiliateClick" (
  "id" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "referrerHost" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AffiliateCommission" (
  "id" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "referralId" TEXT,
  "subscriptionId" TEXT,
  "providerPaymentId" TEXT,
  "amountCents" INTEGER NOT NULL,
  "rateBps" INTEGER NOT NULL,
  "status" "AffiliateCommissionStatus" NOT NULL DEFAULT 'PENDING',
  "availableAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AffiliateCommission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AffiliateWallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "pendingCents" INTEGER NOT NULL DEFAULT 0,
  "availableCents" INTEGER NOT NULL DEFAULT 0,
  "paidCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AffiliateWallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AffiliateWithdrawal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status" "AffiliateWithdrawalStatus" NOT NULL DEFAULT 'REQUESTED',
  "payoutNote" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AffiliateWithdrawal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminAuditEntry" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_affiliateCode_key" ON "User"("affiliateCode");
CREATE UNIQUE INDEX "AffiliateReferral_referredUserId_key" ON "AffiliateReferral"("referredUserId");
CREATE INDEX "AffiliateReferral_affiliateId_status_createdAt_idx" ON "AffiliateReferral"("affiliateId", "status", "createdAt");
CREATE INDEX "AffiliateReferral_code_createdAt_idx" ON "AffiliateReferral"("code", "createdAt");
CREATE INDEX "AffiliateClick_affiliateId_createdAt_idx" ON "AffiliateClick"("affiliateId", "createdAt");
CREATE INDEX "AffiliateClick_code_createdAt_idx" ON "AffiliateClick"("code", "createdAt");
CREATE UNIQUE INDEX "AffiliateCommission_providerPaymentId_key" ON "AffiliateCommission"("providerPaymentId");
CREATE INDEX "AffiliateCommission_affiliateId_status_createdAt_idx" ON "AffiliateCommission"("affiliateId", "status", "createdAt");
CREATE INDEX "AffiliateCommission_referralId_createdAt_idx" ON "AffiliateCommission"("referralId", "createdAt");
CREATE INDEX "AffiliateCommission_subscriptionId_idx" ON "AffiliateCommission"("subscriptionId");
CREATE UNIQUE INDEX "AffiliateWallet_userId_key" ON "AffiliateWallet"("userId");
CREATE INDEX "AffiliateWithdrawal_userId_status_createdAt_idx" ON "AffiliateWithdrawal"("userId", "status", "createdAt");
CREATE INDEX "AffiliateWithdrawal_status_createdAt_idx" ON "AffiliateWithdrawal"("status", "createdAt");
CREATE INDEX "AdminAuditEntry_actorId_createdAt_idx" ON "AdminAuditEntry"("actorId", "createdAt");
CREATE INDEX "AdminAuditEntry_targetType_targetId_createdAt_idx" ON "AdminAuditEntry"("targetType", "targetId", "createdAt");
CREATE INDEX "AdminAuditEntry_action_createdAt_idx" ON "AdminAuditEntry"("action", "createdAt");

ALTER TABLE "AffiliateReferral" ADD CONSTRAINT "AffiliateReferral_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateReferral" ADD CONSTRAINT "AffiliateReferral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateCommission" ADD CONSTRAINT "AffiliateCommission_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateCommission" ADD CONSTRAINT "AffiliateCommission_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "AffiliateReferral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AffiliateWallet" ADD CONSTRAINT "AffiliateWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateWithdrawal" ADD CONSTRAINT "AffiliateWithdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminAuditEntry" ADD CONSTRAINT "AdminAuditEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
