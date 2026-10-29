-- S-254: when a link's snapshot was written, kept apart from `updatedAt`, which every view flush
-- and slug rename moves. Existing links start from `updatedAt`, the closest value on record.
ALTER TABLE "ShareLink" ADD COLUMN "snapshotAt" TIMESTAMP(3);
UPDATE "ShareLink" SET "snapshotAt" = "updatedAt";
ALTER TABLE "ShareLink" ALTER COLUMN "snapshotAt" SET NOT NULL,
  ALTER COLUMN "snapshotAt" SET DEFAULT CURRENT_TIMESTAMP;
