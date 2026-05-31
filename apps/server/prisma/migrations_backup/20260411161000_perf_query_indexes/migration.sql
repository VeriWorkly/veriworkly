DO $$
BEGIN
	IF to_regclass('public."RoadmapFeature"') IS NOT NULL THEN
		CREATE INDEX IF NOT EXISTS "RoadmapFeature_status_createdAt_idx"
		ON "RoadmapFeature"("status", "createdAt");

		CREATE INDEX IF NOT EXISTS "RoadmapFeature_completedAt_updatedAt_idx"
		ON "RoadmapFeature"("completedAt", "updatedAt");

		CREATE INDEX IF NOT EXISTS "RoadmapFeature_status_completedAt_updatedAt_idx"
		ON "RoadmapFeature"("status", "completedAt", "updatedAt");
	END IF;

	IF to_regclass('public."GitHubSyncItem"') IS NOT NULL THEN
		CREATE INDEX IF NOT EXISTS "GitHubSyncItem_syncId_updatedAt_idx"
		ON "GitHubSyncItem"("syncId", "updatedAt");

		CREATE INDEX IF NOT EXISTS "GitHubSyncItem_syncId_status_updatedAt_idx"
		ON "GitHubSyncItem"("syncId", "status", "updatedAt");

		CREATE INDEX IF NOT EXISTS "GitHubSyncItem_syncId_kind_updatedAt_idx"
		ON "GitHubSyncItem"("syncId", "kind", "updatedAt");
	END IF;
END $$;
