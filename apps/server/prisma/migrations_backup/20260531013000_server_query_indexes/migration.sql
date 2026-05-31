DROP INDEX IF EXISTS "Document_userId_type_idx";
DROP INDEX IF EXISTS "Document_userId_updatedAt_idx";
DROP INDEX IF EXISTS "PortfolioPublication_subdomain_idx";
DROP INDEX IF EXISTS "PortfolioPublication_status_subdomain_idx";

CREATE INDEX "Document_userId_type_deletedAt_updatedAt_idx"
ON "Document"("userId", "type", "deletedAt", "updatedAt");

CREATE INDEX "Document_userId_deletedAt_updatedAt_idx"
ON "Document"("userId", "deletedAt", "updatedAt");

CREATE INDEX "Subscription_userId_updatedAt_idx"
ON "Subscription"("userId", "updatedAt");

CREATE INDEX "PortfolioPublication_status_updatedAt_idx"
ON "PortfolioPublication"("status", "updatedAt");
