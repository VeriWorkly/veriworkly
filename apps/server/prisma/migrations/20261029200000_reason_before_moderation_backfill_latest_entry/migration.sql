-- Follow-up to 20261028230000 (review of Phase 11 group 2). That backfill took each locked row's
-- most recent TAKEDOWN record, so a lift recorded after it was skipped, and the row could get the
-- reason of an older lock that had since been lifted. Lifting the current lock (put on later
-- through the document, which records nothing about the publication) would then restore that
-- stale reason instead of putting the site back online. And a lock put over a lock (a second
-- suspension, or a force-unpublish of a suspended site) records the first lock as its previous
-- reason, so the row got NULL and lost the owner's or billing's reason under both.
--
-- This re-runs it over every publication status record, takedowns and lifts alike: the
-- publication's own ("portfolio.unpublish", "portfolio.status.change") and its document's lifts
-- ("document.visibility.change" away from PRIVATE). A document takedown is left out: it records
-- nothing about the publication, and over a row already locked it changes nothing. A takedown
-- whose previous reason is itself a lock ("moderation:…") is walked past, to the record before
-- it. By the latest record left:
-- - a takedown that names an owner's or billing's reason: that reason;
-- - a lift back to an owner's or billing's reason (a status change to SUSPENDED with that reason;
--   the row is locked again, so through the document since): that reason;
-- - anything else (a lift online, a document lift, a takedown that names no such reason): NULL.
-- A lift is never walked past, so a reason from before a lift is never brought back.
--
-- Only rows the first backfill could have written are touched: on a moderation lock, and not
-- written by the application since that migration ran (`updatedAt`, stored in UTC, before its
-- `finished_at`; the backfills are raw SQL and leave `updatedAt` alone). A reason the application
-- recorded itself (a lock or an owner's unpublish under a lock, after the column existed) is
-- never changed. Idempotent: a second run computes the same values and updates nothing.
--
-- In a PL/pgSQL block because a database replayed from the migration files alone (the drift
-- check's shadow database) has no "_prisma_migrations" table: there is nothing to correct there,
-- and the statement is only resolved when it runs.
DO $$
BEGIN
  IF to_regclass('"_prisma_migrations"') IS NULL THEN
    RETURN;
  END IF;

  WITH "firstBackfill" AS (
    SELECT "finished_at"
    FROM "_prisma_migrations"
    WHERE "migration_name" = '20261028230000_publication_reason_before_moderation'
      AND "finished_at" IS NOT NULL
      AND "rolled_back_at" IS NULL
    ORDER BY "finished_at" DESC
    LIMIT 1
  ),
  "records" AS (
    SELECT p."id" AS "publicationId", e."createdAt", e."action", e."metadata", 1 AS "precedence"
    FROM "AdminAuditEntry" AS e
    JOIN "PortfolioPublication" AS p
      ON e."targetType" = 'PortfolioPublication' AND e."targetId" = p."id"
    WHERE e."action" IN ('portfolio.unpublish', 'portfolio.status.change')
    UNION ALL
    SELECT p."id", e."createdAt", e."action", e."metadata", 0
    FROM "AdminAuditEntry" AS e
    JOIN "PortfolioPublication" AS p
      ON e."targetType" = 'Document' AND e."targetId" = p."documentId"
    WHERE e."action" = 'document.visibility.change'
      AND e."metadata"->>'visibility' IS DISTINCT FROM 'PRIVATE'
  ),
  "classified" AS (
    SELECT
      r.*,
      (
        r."action" = 'portfolio.unpublish'
        OR (
          r."action" = 'portfolio.status.change'
          AND r."metadata"->>'status' = 'SUSPENDED'
          AND COALESCE(r."metadata"->>'suspensionReason', 'moderation:') LIKE 'moderation:%'
        )
      ) AS "isTakedown"
    FROM "records" AS r
  ),
  "latest" AS (
    -- Lock-over-lock takedowns are walked past. On a tie (one transaction writes both), the
    -- publication's own record wins.
    SELECT DISTINCT ON ("publicationId") "publicationId", "isTakedown", "action", "metadata"
    FROM "classified"
    WHERE NOT (
      "isTakedown" AND COALESCE("metadata"->>'previousSuspensionReason', '') LIKE 'moderation:%'
    )
    ORDER BY "publicationId", "createdAt" DESC, "precedence" DESC
  ),
  "computed" AS (
    SELECT
      p."id",
      CASE
        WHEN l."isTakedown"
          AND l."metadata"->>'previousSuspensionReason' IN (
            'user_unpublished', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INACTIVE', 'grace_expired'
          )
        THEN l."metadata"->>'previousSuspensionReason'
        WHEN NOT l."isTakedown"
          AND l."action" = 'portfolio.status.change'
          AND l."metadata"->>'status' = 'SUSPENDED'
          AND l."metadata"->>'suspensionReason' IN (
            'user_unpublished', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INACTIVE', 'grace_expired'
          )
        THEN l."metadata"->>'suspensionReason'
      END AS "reason"
    FROM "PortfolioPublication" AS p
    CROSS JOIN "firstBackfill" AS f
    LEFT JOIN "latest" AS l ON l."publicationId" = p."id"
    WHERE p."status" = 'SUSPENDED'
      AND p."suspensionReason" LIKE 'moderation:%'
      AND p."updatedAt" < (f."finished_at" AT TIME ZONE 'UTC')
  )
  UPDATE "PortfolioPublication" AS p
  SET "reasonBeforeModeration" = c."reason"
  FROM "computed" AS c
  WHERE c."id" = p."id"
    AND p."reasonBeforeModeration" IS DISTINCT FROM c."reason";
END
$$;
