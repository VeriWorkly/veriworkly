-- V-288: `publishedAt` moves on every republish, so the admin "publications" chart and the
-- "published in the last 30 days" count re-dated a site each time its owner edited it. A site's
-- first publish gets its own column, set once when the row is created and never updated.
ALTER TABLE "PortfolioPublication"
ADD COLUMN "firstPublishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Back-fill with the earliest date known for each existing site: its last publish, or its first
-- recorded view day when that is earlier (views are kept 180 days, so this is a best effort).
UPDATE "PortfolioPublication" AS p
SET "firstPublishedAt" = LEAST(
  p."publishedAt",
  COALESCE(
    (SELECT MIN(v."date") FROM "PortfolioViewDaily" AS v WHERE v."publicationId" = p."id"),
    p."publishedAt"
  )
);

CREATE INDEX "PortfolioPublication_firstPublishedAt_idx" ON "PortfolioPublication"("firstPublishedAt");
