-- V-070 / V-105 / V-111: the admin list queries that had no usable index.
-- Document: the admin list's default sort (updatedAt, no userId filter) and its title/slug
-- ILIKE search, which also feeds the page's count(*). ShareLink: both admin sorts and the slug
-- search. EntitlementGrant: the global active-grant count. User: the by-role count and filter.
-- pg_trgm was created in 20261025160000_admin_query_indexes. Plain CREATE INDEX (no
-- CONCURRENTLY: migrate runs in a transaction); the tables are small enough today.

-- CreateIndex
CREATE INDEX "Document_updatedAt_idx" ON "Document"("updatedAt");

-- CreateIndex
CREATE INDEX "Document_title_trgm_idx" ON "Document" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Document_slug_trgm_idx" ON "Document" USING GIN ("slug" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "EntitlementGrant_revokedAt_endsAt_startsAt_idx" ON "EntitlementGrant"("revokedAt", "endsAt", "startsAt");

-- CreateIndex
CREATE INDEX "ShareLink_createdAt_idx" ON "ShareLink"("createdAt");

-- CreateIndex
CREATE INDEX "ShareLink_viewCount_idx" ON "ShareLink"("viewCount");

-- CreateIndex
CREATE INDEX "ShareLink_slug_trgm_idx" ON "ShareLink" USING GIN ("slug" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

