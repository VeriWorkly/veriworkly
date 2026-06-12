-- Rebuild ApiKey storage for hash-only keys, scopes, expiry, and revocation.
-- This migration assumes there are no production API keys to preserve.

ALTER TABLE "ApiKey"
  ADD COLUMN IF NOT EXISTS "keyHash" TEXT,
  ADD COLUMN IF NOT EXISTS "keyPrefix" TEXT,
  ADD COLUMN IF NOT EXISTS "keySuffix" TEXT,
  ADD COLUMN IF NOT EXISTS "scopes" TEXT[] NOT NULL DEFAULT ARRAY['user:read']::TEXT[],
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);

ALTER TABLE "ApiKey"
  ALTER COLUMN "rateLimit" SET DEFAULT 20;

-- Remove legacy plaintext storage.
ALTER TABLE "ApiKey" DROP COLUMN IF EXISTS "key";

-- Safety cleanup if any inactive rows existed from earlier testing.
UPDATE "ApiKey"
SET "revokedAt" = COALESCE("revokedAt", NOW())
WHERE "isActive" = false AND "revokedAt" IS NULL;

ALTER TABLE "ApiKey"
  ALTER COLUMN "keyHash" SET NOT NULL,
  ALTER COLUMN "keyPrefix" SET NOT NULL,
  ALTER COLUMN "keySuffix" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX IF NOT EXISTS "ApiKey_userId_isActive_idx" ON "ApiKey"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt");
