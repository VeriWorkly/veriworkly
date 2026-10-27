-- V-372: the subscription a plan-change charge upgraded, kept beside the payload so a refund or
-- chargeback still finds the upgrade it paid for once the retention job has redacted the payload.
ALTER TABLE "BillingWebhookEvent" ADD COLUMN "planChangeSubscriptionId" TEXT;

-- Plan-change charges stored before this column, whose payload is still there.
UPDATE "BillingWebhookEvent"
SET "planChangeSubscriptionId" = "payload" -> 'data' ->> 'subscription_id'
WHERE "type" = 'payment.succeeded'
  AND "payload" -> 'data' ->> 'subscription_id' IS NOT NULL
  AND (
    "payload" -> 'data' ->> 'charge_type' = 'plan_change'
    OR "payload" -> 'data' -> 'metadata' ->> 'veriworkly_plan_change' = '1'
  );

-- The plan-change grant looks the charge up by subscription.
CREATE INDEX "BillingWebhookEvent_planChangeSubscriptionId_idx" ON "BillingWebhookEvent"("planChangeSubscriptionId");
