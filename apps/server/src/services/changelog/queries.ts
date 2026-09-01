import { config } from "#config";
import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";
import { cacheGet, cacheSet } from "#lib/redis";

import {
  CHANGELOG_CACHE_KEYS,
  buildChangelogListCacheKey,
  buildChangelogEntryCacheKey,
} from "./cache.js";
import { computeContributorStats } from "./contributors.js";
import type {
  ChangelogType,
  ChangelogQuery,
  ChangelogListResult,
  ChangelogStatsResult,
} from "./types.js";

/**
 * Fetch changelog entries with optional filters and pagination, newest first.
 * Results are cached based on query parameters.
 */
export async function getChangelogEntries(
  query: ChangelogQuery = {},
): Promise<ChangelogListResult> {
  const { type, tag, search, limit = 20, offset = 0 } = query;

  const cacheKey = buildChangelogListCacheKey(type, tag, search, limit, offset);
  const cached = await cacheGet<ChangelogListResult>(cacheKey);

  if (cached) return cached;

  const where: {
    type?: ChangelogType;
    tags?: { has: string };
    OR?: Array<{
      title?: { contains: string; mode: "insensitive" };
      summary?: { contains: string; mode: "insensitive" };
      version?: { contains: string; mode: "insensitive" };
      id?: { contains: string; mode: "insensitive" };
    }>;
  } = {};

  if (type) where.type = type;
  if (tag) where.tags = { has: tag };
  if (search) {
    const trimmed = search.trim();
    const cleanVersion = trimmed.replace(/^v/i, "");

    where.OR = [
      { title: { contains: trimmed, mode: "insensitive" } },
      { summary: { contains: trimmed, mode: "insensitive" } },
      { version: { contains: cleanVersion || trimmed, mode: "insensitive" } },
      { id: { contains: trimmed, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.changelogEntry.findMany({
      where,
      select: {
        id: true,
        version: true,
        title: true,
        summary: true,
        type: true,
        publishedAt: true,
        githubUrl: true,
        added: true,
        improved: true,
        fixed: true,
        breaking: true,
        security: true,
        tags: true,
        prRefs: true,
      },
      orderBy: [{ publishedAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.changelogEntry.count({ where }),
  ]);

  const hasMore = offset + limit < total;
  const normalizedItems = items.map((item) => ({
    ...item,
    type: item.type as ChangelogType,
  }));

  const response: ChangelogListResult = {
    items: normalizedItems,
    total,
    limit,
    offset,
    hasMore,
    pagination: {
      mode: "offset" as const,
      nextOffset: hasMore ? offset + limit : null,
      nextCursor: null as string | null,
    },
  };

  await cacheSet(cacheKey, response, config.cache.changelogTtlSeconds);

  return response;
}

/**
 * Fetch a single changelog entry by id (version slug).
 */
export async function getChangelogEntryById(id: string) {
  const cacheKey = buildChangelogEntryCacheKey(id);
  const cached = await cacheGet(cacheKey);

  if (cached) return cached;

  const entry = await prisma.changelogEntry.findUnique({ where: { id } });

  if (!entry) throw new ApiError(404, "Changelog entry not found");

  await cacheSet(cacheKey, entry, config.cache.changelogTtlSeconds);

  return entry;
}

/**
 * Compute aggregate changelog statistics (counts by type, latest version, contributor stats).
 * Cached to reduce database load.
 */
export async function getChangelogStats(): Promise<ChangelogStatsResult> {
  const cacheKey = CHANGELOG_CACHE_KEYS.STATS_KEY;
  const cached = await cacheGet<ChangelogStatsResult>(cacheKey);

  if (cached) return cached;

  const [groupedByType, totalEntries, latest, contributorStats] = await Promise.all([
    prisma.changelogEntry.groupBy({
      by: ["type"],
      _count: { _all: true },
    }),
    prisma.changelogEntry.count(),
    prisma.changelogEntry.findFirst({
      orderBy: { publishedAt: "desc" },
      select: { version: true, publishedAt: true, title: true },
    }),
    computeContributorStats(),
  ]);

  const typeCounts = groupedByType.reduce<Record<string, number>>((acc, row) => {
    acc[row.type] = row._count._all;
    return acc;
  }, {});

  const stats: ChangelogStatsResult = {
    totalEntries,
    major: typeCounts.major ?? 0,
    minor: typeCounts.minor ?? 0,
    patch: typeCounts.patch ?? 0,
    latest,
    contributorCount: contributorStats.contributorCount,
    topContributors: contributorStats.topContributors,
  };

  await cacheSet(cacheKey, stats, config.cache.changelogTtlSeconds);

  return stats;
}
