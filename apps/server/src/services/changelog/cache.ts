import { cacheDel, cacheDelByPrefix } from "#lib/redis";
import { logger } from "#lib/logger";

export const CHANGELOG_CACHE_KEYS = {
  LIST_PREFIX: "changelog:list:",
  ENTRY_PREFIX: "changelog:entry:",
  STATS_KEY: "changelog:stats",
  RELEASE_SYNC_LOCK: "changelog:release-sync:lock",
  SYNC_MARKER: "changelog:release-sync:last-run",
} as const;

export function buildChangelogListCacheKey(
  type?: string,
  tag?: string,
  search?: string,
  limit = 20,
  offset = 0,
): string {
  return `${CHANGELOG_CACHE_KEYS.LIST_PREFIX}${type || "all"}:${tag || "-"}:${search || "-"}:${limit}:${offset}`;
}

export function buildChangelogEntryCacheKey(id: string): string {
  return `${CHANGELOG_CACHE_KEYS.ENTRY_PREFIX}${id}`;
}

/**
 * Invalidate all changelog read caches (lists, entries, stats).
 * Scoped to avoid wiping the release sync freshness marker.
 */
export async function invalidateChangelogReadCaches(): Promise<void> {
  try {
    await Promise.all([
      cacheDelByPrefix(CHANGELOG_CACHE_KEYS.LIST_PREFIX),
      cacheDelByPrefix(CHANGELOG_CACHE_KEYS.ENTRY_PREFIX),
      cacheDel(CHANGELOG_CACHE_KEYS.STATS_KEY),
    ]);
  } catch (err) {
    logger.warn("Changelog read cache invalidation failed (best-effort)", err);
  }
}
