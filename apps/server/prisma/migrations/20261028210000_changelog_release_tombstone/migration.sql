-- V-289: an admin delete of an auto-synced changelog entry was undone by the next release sync,
-- which creates every release that has no row. The delete now leaves a tombstone the sync skips.
CREATE TABLE "ChangelogReleaseTombstone" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangelogReleaseTombstone_pkey" PRIMARY KEY ("id")
);
