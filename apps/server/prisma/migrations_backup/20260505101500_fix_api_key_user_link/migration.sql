-- Align ApiKey table with current Prisma schema
-- 1) Add user ownership to ApiKey records
-- 2) Enforce relational integrity
-- 3) Align default rate limit with product/docs default

ALTER TABLE "ApiKey"
ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Legacy rows may exist without ownership; remove them before enforcing NOT NULL + FK.
DELETE FROM "ApiKey"
WHERE "userId" IS NULL;

ALTER TABLE "ApiKey"
ALTER COLUMN "userId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ApiKey_userId_fkey'
  ) THEN
    ALTER TABLE "ApiKey"
    ADD CONSTRAINT "ApiKey_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ApiKey_userId_idx" ON "ApiKey"("userId");

ALTER TABLE "ApiKey"
ALTER COLUMN "rateLimit" SET DEFAULT 20;
