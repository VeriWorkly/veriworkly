-- V-224: an upload deleted while its presigned PUT URL is still valid keeps its row as DELETED,
-- so it still counts toward the hourly upload cap and the stale sweep removes any object a late
-- PUT writes. Nothing reads or publishes a DELETED asset.
ALTER TYPE "PortfolioAssetStatus" ADD VALUE 'DELETED';
