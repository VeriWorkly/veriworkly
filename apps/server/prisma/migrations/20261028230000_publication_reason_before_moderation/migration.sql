-- Review of Phase 11 group 2 (V-285): a moderation lock put over the owner's own unpublish or a
-- billing suspension replaced that reason, so lifting the lock put the site back online against
-- the owner's choice (or for free). The lock now keeps the reason it covered, and the lift
-- restores it. Null while no lock is on, or when the site was online when the lock went on.
ALTER TABLE "PortfolioPublication" ADD COLUMN "reasonBeforeModeration" TEXT;

-- Backfill rows locked before this column existed, from the most recent takedown record of each.
-- Only a force-unpublish ("portfolio.unpublish") records the suspension reason it replaced; older
-- "portfolio.status.change" entries record only the previous status, and a takedown through the
-- document ("Make private", an admin delete) records nothing about the publication. So a row is
-- filled only when its latest takedown record names an owner's or billing's reason; every other
-- locked row stays NULL, and its lift goes LIVE as before. Idempotent: only NULL rows on a
-- moderation lock are touched, and there are few of them.
UPDATE "PortfolioPublication" AS p
SET "reasonBeforeModeration" = latest."reason"
FROM (
  SELECT DISTINCT ON (e."targetId")
    e."targetId",
    e."metadata"->>'previousSuspensionReason' AS "reason"
  FROM "AdminAuditEntry" AS e
  WHERE e."targetType" = 'PortfolioPublication'
    AND (
      e."action" = 'portfolio.unpublish'
      OR (e."action" = 'portfolio.status.change' AND e."metadata"->>'status' = 'SUSPENDED')
    )
  ORDER BY e."targetId", e."createdAt" DESC
) AS latest
WHERE latest."targetId" = p."id"
  AND p."status" = 'SUSPENDED'
  AND p."suspensionReason" LIKE 'moderation:%'
  AND p."reasonBeforeModeration" IS NULL
  AND latest."reason" IN (
    'user_unpublished', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INACTIVE', 'grace_expired'
  );
