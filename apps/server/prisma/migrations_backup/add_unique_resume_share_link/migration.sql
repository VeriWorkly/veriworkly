DO $$
BEGIN
	IF to_regclass('public."ResumeShareLink"') IS NOT NULL THEN
		-- Keep only the newest link per (userId, resumeId) before enforcing uniqueness.
		DELETE FROM "ResumeShareLink" older
		USING "ResumeShareLink" newer
		WHERE older."userId" = newer."userId"
			AND older."resumeId" = newer."resumeId"
			AND (
				older."createdAt" < newer."createdAt"
				OR (older."createdAt" = newer."createdAt" AND older."id" < newer."id")
			);

		-- Check if the unique constraint/index already exists
		IF to_regclass('public."ResumeShareLink_userId_resumeId_key"') IS NULL THEN
			ALTER TABLE "ResumeShareLink"
			ADD CONSTRAINT "ResumeShareLink_userId_resumeId_key"
			UNIQUE ("userId", "resumeId");
		END IF;
	END IF;
END $$;
