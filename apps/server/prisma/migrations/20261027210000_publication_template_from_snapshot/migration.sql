-- V-299: the public page renders the snapshot's `templateId`, but the publication row stored the
-- document column, which a `templateId`-only PATCH could set to a free template while the content
-- kept a premium one. Publishing now writes the content's template to both; this aligns any row
-- written before, so the lapse job and billing's premium filters see the template that is shown.
UPDATE "PortfolioPublication"
SET "templateId" = "snapshot"->>'templateId'
WHERE jsonb_typeof("snapshot"->'templateId') = 'string'
  AND "templateId" IS DISTINCT FROM "snapshot"->>'templateId';
