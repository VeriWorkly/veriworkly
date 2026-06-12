CREATE TABLE "CreditGrant" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "remaining" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditUsageAllocation" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "grantId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditUsageAllocation_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CreditGrant" ("id", "walletId", "userId", "amount", "remaining", "source", "sourceId", "createdAt")
SELECT
  'legacy-' || "id",
  "id",
  "userId",
  "balance",
  "balance",
  'legacy_balance',
  "id",
  "createdAt"
FROM "CreditWallet"
WHERE "balance" > 0;

CREATE UNIQUE INDEX "CreditGrant_userId_source_sourceId_key" ON "CreditGrant"("userId", "source", "sourceId");
CREATE INDEX "CreditGrant_userId_expiresAt_remaining_idx" ON "CreditGrant"("userId", "expiresAt", "remaining");
CREATE INDEX "CreditGrant_walletId_expiresAt_remaining_idx" ON "CreditGrant"("walletId", "expiresAt", "remaining");
CREATE UNIQUE INDEX "CreditUsageAllocation_transactionId_grantId_key" ON "CreditUsageAllocation"("transactionId", "grantId");
CREATE INDEX "CreditUsageAllocation_grantId_createdAt_idx" ON "CreditUsageAllocation"("grantId", "createdAt");

ALTER TABLE "CreditGrant" ADD CONSTRAINT "CreditGrant_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "CreditWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditGrant" ADD CONSTRAINT "CreditGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditUsageAllocation" ADD CONSTRAINT "CreditUsageAllocation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "CreditTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditUsageAllocation" ADD CONSTRAINT "CreditUsageAllocation_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "CreditGrant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
