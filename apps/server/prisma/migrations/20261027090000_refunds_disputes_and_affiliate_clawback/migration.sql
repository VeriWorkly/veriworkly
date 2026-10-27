-- V-216: the provider payment a payment, refund or dispute event is about, as an indexed column.
-- Refunds and disputes find the payment they reverse through it instead of a jsonb path that
-- scanned every payment event and stopped matching once the retention job redacted the payload.
ALTER TABLE "BillingWebhookEvent" ADD COLUMN "providerPaymentId" TEXT;

CREATE INDEX "BillingWebhookEvent_providerPaymentId_type_idx" ON "BillingWebhookEvent"("providerPaymentId", "type");

-- V-205: what a refund or lost dispute could not take back from an affiliate wallet, per
-- commission and owed per wallet; and V-017: the payout that paid a commission.
ALTER TABLE "AffiliateCommission" ADD COLUMN "clawbackCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "withdrawalId" TEXT;

ALTER TABLE "AffiliateWallet" ADD COLUMN "clawbackCents" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "AffiliateCommission_withdrawalId_idx" ON "AffiliateCommission"("withdrawalId");

ALTER TABLE "AffiliateCommission" ADD CONSTRAINT "AffiliateCommission_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "AffiliateWithdrawal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfills, each safe to re-run. Each statement below starts with a "-- backfill" line (the
-- integration test runs them).
--
-- The payment id, from every payload not yet redacted (a redacted payload carries no `data`).
-- backfill
UPDATE "BillingWebhookEvent"
SET "providerPaymentId" = "payload" -> 'data' ->> 'payment_id'
WHERE "providerPaymentId" IS NULL
  AND ("type" LIKE 'payment.%' OR "type" LIKE 'refund.%' OR "type" LIKE 'dispute.%')
  AND jsonb_typeof("payload" -> 'data') = 'object'
  AND jsonb_typeof("payload" -> 'data' -> 'payment_id') = 'string';

-- A refund or dispute belongs to the customer whose payment it reverses: before V-205 most refunds
-- were stored with no user, so they never reached that customer's billing history.
-- backfill
UPDATE "BillingWebhookEvent" AS r
SET "userId" = p."userId"
FROM "BillingWebhookEvent" AS p
WHERE r."userId" IS NULL
  AND (r."type" LIKE 'refund.%' OR r."type" LIKE 'dispute.%')
  AND r."providerPaymentId" IS NOT NULL
  AND p."type" = 'payment.succeeded'
  AND p."providerPaymentId" = r."providerPaymentId"
  AND p."userId" IS NOT NULL;

-- V-017: the commissions payouts already covered, oldest first, up to what each affiliate has been
-- paid (the rule `updateWithdrawal` applies from now on, without a withdrawal to name).
-- backfill
UPDATE "AffiliateCommission" AS c
SET "status" = 'PAID', "paidAt" = now()
FROM (
  SELECT ac."id",
    sum(ac."amountCents") OVER (
      PARTITION BY ac."affiliateId"
      ORDER BY ac."availableAt" ASC NULLS LAST, ac."createdAt" ASC, ac."id" ASC
    ) AS running,
    w."paidCents" - COALESCE((
      SELECT sum(paid."amountCents") FROM "AffiliateCommission" AS paid
      WHERE paid."affiliateId" = ac."affiliateId" AND paid."paidAt" IS NOT NULL
        AND paid."currency" = 'USD'
    ), 0) - COALESCE((
      SELECT sum(rev."clawbackCents") FROM "AffiliateCommission" AS rev
      WHERE rev."affiliateId" = ac."affiliateId" AND rev."status" = 'REVERSED'
        AND rev."paidAt" IS NULL AND rev."currency" = 'USD'
    ), 0) AS covered
  FROM "AffiliateCommission" AS ac
  JOIN "AffiliateWallet" AS w ON w."userId" = ac."affiliateId"
  WHERE ac."status" = 'AVAILABLE' AND ac."currency" = 'USD'
) AS due
WHERE c."id" = due."id" AND due."running" <= due."covered";
