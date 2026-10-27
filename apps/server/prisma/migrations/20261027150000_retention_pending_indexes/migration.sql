-- Retention backlogs (V-250). The redact and purge rules used to find their rows with "not done
-- yet" predicates no index could see, so each nightly run walked every event ever redacted and
-- every document ever purged. Each partial index holds only the rows its rule still has to do, and
-- the rule's query in src/jobs/retentionJob.ts (RETENTION_CANDIDATES) repeats the predicate
-- exactly; tests/integration/retention-indexes.test.ts checks the plans use them. Hand-written:
-- Prisma cannot model partial indexes. '{"purged":true}' is PURGED_DOCUMENT_CONTENT.
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_unredacted_idx" ON "BillingWebhookEvent"("createdAt")
  WHERE "status" = 'PROCESSED' AND ("payload" - 'type') <> '{"redacted": true}'::jsonb;

CREATE INDEX IF NOT EXISTS "Document_unpurged_deleted_idx" ON "Document"("deletedAt")
  WHERE "deletedAt" IS NOT NULL AND ("content" <> '{"purged":true}'::jsonb OR "title" <> ''
    OR "tags" <> '{}' OR "metadata" IS NOT NULL OR "slug" <> "id");

CREATE INDEX IF NOT EXISTS "ShareLink_unpurged_idx" ON "ShareLink"("documentId")
  WHERE "snapshot" <> '{"purged":true}'::jsonb OR "slug" <> "id";

CREATE INDEX IF NOT EXISTS "PortfolioPublication_unpurged_idx" ON "PortfolioPublication"("documentId")
  WHERE "snapshot" <> '{"purged":true}'::jsonb;

CREATE INDEX IF NOT EXISTS "AdminAuditEntry_titled_idx" ON "AdminAuditEntry"(
  (COALESCE("metadata" ->> 'documentId', CASE WHEN "targetType" = 'Document' THEN "targetId" END)))
  WHERE jsonb_typeof("metadata") = 'object' AND "metadata" ?| ARRAY['title', 'slug'];
