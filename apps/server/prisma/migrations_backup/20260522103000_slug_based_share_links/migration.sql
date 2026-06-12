DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'usernameUpdatedAt'
  ) THEN
    UPDATE "User"
    SET "username" = NULL
    WHERE "usernameUpdatedAt" IS NULL;
  END IF;
END $$;

ALTER TABLE "User"
DROP COLUMN IF EXISTS "usernameUpdatedAt";

ALTER TABLE "ShareLink"
ADD COLUMN IF NOT EXISTS "slug" TEXT;

UPDATE "ShareLink" sl
SET "slug" = d."slug"
FROM "Document" d
WHERE sl."documentId" = d."id"
  AND (sl."slug" IS NULL OR length(trim(sl."slug")) = 0);

UPDATE "ShareLink"
SET "slug" = 'shared-' || left("id", 8)
WHERE "slug" IS NULL OR length(trim("slug")) = 0;

ALTER TABLE "ShareLink"
ALTER COLUMN "slug" SET NOT NULL;

DROP INDEX IF EXISTS "ShareLink_token_key";
DROP INDEX IF EXISTS "ShareLink_token_idx";
DROP INDEX IF EXISTS "ShareLink_userId_idx";

ALTER TABLE "ShareLink"
DROP COLUMN IF EXISTS "token";

CREATE UNIQUE INDEX IF NOT EXISTS "ShareLink_userId_documentId_key"
ON "ShareLink"("userId", "documentId");

CREATE UNIQUE INDEX IF NOT EXISTS "ShareLink_userId_slug_key"
ON "ShareLink"("userId", "slug");
