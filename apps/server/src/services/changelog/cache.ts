import { bumpGeneration, resolveGenerationalKey } from "#lib/cacheGeneration";
import { logger } from "#lib/logger";
import { notifySiteContentChanged } from "#utils/siteRevalidate";

/**
 * The read caches are generation namespaces (`#lib/cacheGeneration`): invalidation is an INCR,
 * never a prefix SCAN, so it cannot touch the sync lock or freshness marker below (V-072).
 */
export const CHANGELOG_CACHE_KEYS = {
  LIST_NAMESPACE: "changelog:list",
  ENTRY_NAMESPACE: "changelog:entry",
  STATS_NAMESPACE: "changelog:stats",
  RELEASE_SYNC_LOCK: "changelog:release-sync:lock",
  SYNC_MARKER: "changelog:release-sync:last-run",
  /** The last run's status and outcome, for `GET /admin/changelog/sync` (V-080). */
  SYNC_RUN: "changelog:release-sync:status",
} as const;

export function buildChangelogListCacheKey(
  type?: string,
  tag?: string,
  search?: string,
  limit = 20,
  offset = 0,
): Promise<string | null> {
  return resolveGenerationalKey(
    CHANGELOG_CACHE_KEYS.LIST_NAMESPACE,
    type || "all",
    tag || "-",
    search || "-",
    String(limit),
    String(offset),
  );
}

export function buildChangelogEntryCacheKey(id: string): Promise<string | null> {
  return resolveGenerationalKey(CHANGELOG_CACHE_KEYS.ENTRY_NAMESPACE, id);
}

export function buildChangelogStatsCacheKey(): Promise<string | null> {
  return resolveGenerationalKey(CHANGELOG_CACHE_KEYS.STATS_NAMESPACE);
}

/**
 * Invalidate all changelog read caches (lists, entries, stats).
 * Scoped to avoid wiping the release sync freshness marker.
 */
export async function invalidateChangelogReadCaches(): Promise<void> {
  try {
    await bumpGeneration(
      CHANGELOG_CACHE_KEYS.LIST_NAMESPACE,
      CHANGELOG_CACHE_KEYS.ENTRY_NAMESPACE,
      CHANGELOG_CACHE_KEYS.STATS_NAMESPACE,
    );
  } catch (err) {
    logger.warn("Changelog read cache invalidation failed (best-effort)", err);
  }
  notifySiteContentChanged("changelog");
}
