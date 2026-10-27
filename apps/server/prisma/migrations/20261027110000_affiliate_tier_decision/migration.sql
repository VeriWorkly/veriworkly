-- The admin's tier decision moves from the admin audit log onto the user row, so audit retention
-- can never undo a demotion (promoteForConversions read the latest affiliate.update entry).
ALTER TABLE "User" ADD COLUMN "affiliateTierDecidedAt" TIMESTAMP(3);

-- Backfill: the latest affiliate.update entry that set a tier, per affiliate.
UPDATE "User" AS u
SET "affiliateTierDecidedAt" = d."createdAt"
FROM (
  SELECT DISTINCT ON ("targetId") "targetId", "createdAt"
  FROM "AdminAuditEntry"
  WHERE "action" = 'affiliate.update'
    AND "targetType" = 'User'
    AND jsonb_typeof("metadata" -> 'tier') = 'string'
  ORDER BY "targetId", "createdAt" DESC, "id" DESC
) AS d
WHERE u."id" = d."targetId" AND u."affiliateTierDecidedAt" IS NULL;
