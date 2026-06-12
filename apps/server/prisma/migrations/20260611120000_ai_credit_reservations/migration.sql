ALTER TABLE "CreditWallet" ADD COLUMN IF NOT EXISTS "reserved" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "CreditReservationStatus" AS ENUM ('PENDING', 'COMMITTED', 'RELEASED', 'EXPIRED');

CREATE TABLE "CreditReservation" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "status" "CreditReservationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreditReservation_requestId_key" ON "CreditReservation"("requestId");
CREATE INDEX "CreditReservation_userId_status_expiresAt_idx" ON "CreditReservation"("userId", "status", "expiresAt");
CREATE INDEX "CreditReservation_walletId_status_idx" ON "CreditReservation"("walletId", "status");

ALTER TABLE "CreditReservation" ADD CONSTRAINT "CreditReservation_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "CreditWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditReservation" ADD CONSTRAINT "CreditReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
