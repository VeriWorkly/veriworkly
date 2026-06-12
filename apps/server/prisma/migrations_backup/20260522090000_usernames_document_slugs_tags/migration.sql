ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "username" TEXT;

ALTER TABLE "Document"
ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Document"
SET "tags" = ARRAY[]::TEXT[]
WHERE "tags" IS NULL;

CREATE OR REPLACE FUNCTION public.veriworkly_slugify(input TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized TEXT;
BEGIN
  normalized := lower(coalesce(input, ''));
  normalized := regexp_replace(normalized, '[^a-z0-9_-]+', '-', 'g');
  normalized := regexp_replace(normalized, '-+', '-', 'g');
  normalized := trim(both '-' from normalized);
  IF length(normalized) = 0 THEN
    normalized := 'document';
  END IF;
  RETURN left(normalized, 240);
END;
$$ LANGUAGE plpgsql;

WITH ranked_documents AS (
  SELECT
    id,
    "userId",
    public.veriworkly_slugify(title) AS base_slug,
    row_number() OVER (
      PARTITION BY "userId", public.veriworkly_slugify(title)
      ORDER BY "createdAt", id
    ) AS duplicate_index
  FROM "Document"
  WHERE slug IS NULL OR length(trim(slug)) = 0
),
document_slugs AS (
  SELECT
    id,
    left(base_slug, 230) || '-' || left(id, 8) AS next_slug
  FROM ranked_documents
)
UPDATE "Document" d
SET slug = ds.next_slug
FROM document_slugs ds
WHERE d.id = ds.id;

ALTER TABLE "Document"
ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

DROP FUNCTION IF EXISTS public.veriworkly_slugify(TEXT);
