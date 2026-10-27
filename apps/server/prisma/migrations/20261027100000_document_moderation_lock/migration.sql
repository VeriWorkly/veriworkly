-- V-207 / owner decision 11: the moderation takedown lock moves from the admin audit log onto the
-- document row, so pruning the log (365 days) can never lift a takedown.
ALTER TABLE "Document" ADD COLUMN "moderatedPrivateAt" TIMESTAMP(3);

-- Backfill: the same rule `moderatorPrivateDocumentIds` applied to the log. Per document, the
-- latest moderation entry wins (newest first, id as the tiebreak): a "Make private" visibility
-- decision or a force-unpublish (which names its document in metadata.documentId) locks it, any
-- other visibility decision ("Make unlisted") leaves it unlocked. The lock date is that entry's.
-- Only documents still PRIVATE: one an owner made visible again before the owner-side check
-- existed is not locked after the fact.
WITH "entries" AS (
  SELECT
    CASE WHEN "action" = 'portfolio.unpublish' THEN "metadata"->>'documentId' ELSE "targetId" END
      AS "documentId",
    CASE WHEN "action" = 'portfolio.unpublish' THEN TRUE
      ELSE COALESCE("metadata"->>'visibility' = 'PRIVATE', FALSE) END AS "leftPrivate",
    "createdAt",
    "id"
  FROM "AdminAuditEntry"
  WHERE ("targetType" = 'Document' AND "action" = 'document.visibility.change')
     OR "action" = 'portfolio.unpublish'
),
"latest" AS (
  SELECT DISTINCT ON ("documentId") "documentId", "leftPrivate", "createdAt"
  FROM "entries"
  WHERE "documentId" IS NOT NULL
  ORDER BY "documentId", "createdAt" DESC, "id" DESC
)
UPDATE "Document" AS d
SET "moderatedPrivateAt" = l."createdAt"
FROM "latest" AS l
WHERE d."id" = l."documentId" AND l."leftPrivate" AND d."moderatedPrivateAt" IS NULL
  AND d."visibility" = 'PRIVATE';

-- Older share-link revokes recorded the link's slug, made from the document title. They name no
-- document, so the purge cannot find them later; the slug goes now. Ids, action and reason stay.
UPDATE "AdminAuditEntry"
SET "metadata" = "metadata" - 'slug'
WHERE "action" = 'share_link.revoke'
  AND jsonb_typeof("metadata") = 'object'
  AND "metadata" ? 'slug';
