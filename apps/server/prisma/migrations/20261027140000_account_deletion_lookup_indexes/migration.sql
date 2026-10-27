-- Account deletion lookups (V-237). The deletion transaction finds a user's webhook events and the
-- admin audit entries about them by values inside JSON; without these every deletion scanned both
-- tables in full, inside a transaction with a time limit. The expression indexes are hand-written
-- (Prisma cannot model them) and must repeat the expressions in `src/services/deletedAccount.ts`
-- exactly; tests/integration/account-deletion-indexes.test.ts checks the plans use them.
CREATE INDEX IF NOT EXISTS "AdminAuditEntry_targetId_idx" ON "AdminAuditEntry"("targetId");
CREATE INDEX IF NOT EXISTS "AdminAuditEntry_metadata_userId_idx" ON "AdminAuditEntry"(("metadata" ->> 'userId'));
CREATE INDEX IF NOT EXISTS "AdminAuditEntry_metadata_ownerId_idx" ON "AdminAuditEntry"(("metadata" ->> 'ownerId'));
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_payload_user_idx" ON "BillingWebhookEvent"(("payload" #>> '{data,metadata,veriworkly_user_id}'));
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_payload_subscription_idx" ON "BillingWebhookEvent"(("payload" #>> '{data,subscription_id}'));
