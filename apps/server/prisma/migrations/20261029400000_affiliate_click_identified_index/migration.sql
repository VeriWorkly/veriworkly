-- Affiliate clicks lose their IP and user-agent hashes after RETENTION_AFFILIATE_CLICK_DAYS (180 by
-- default) and keep their row. This partial index holds only clicks still carrying a hash, so the
-- nightly run costs the backlog rather than every click ever anonymised; the rule's query in
-- src/jobs/retentionJob.ts (RETENTION_CANDIDATES.affiliateClicksAnonymized) repeats the predicate
-- and tests/integration/retention-indexes.test.ts checks the plan uses it. Hand-written: Prisma
-- cannot model partial indexes.
CREATE INDEX IF NOT EXISTS "AffiliateClick_identified_idx" ON "AffiliateClick"("createdAt")
  WHERE "ipHash" IS NOT NULL OR "userAgentHash" IS NOT NULL;
