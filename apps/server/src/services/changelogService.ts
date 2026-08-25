import { config } from "#config";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";
import { cacheGet, cacheSet } from "#lib/redis";

export type ChangelogType = "major" | "minor" | "patch";

export interface ChangelogQuery {
  type?: ChangelogType;
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export type ChangelogListResult = {
  items: Array<{
    id: string;
    version: string;
    title: string;
    summary: string | null;
    type: ChangelogType;
    publishedAt: Date;
    githubUrl: string | null;
    added: string[];
    improved: string[];
    fixed: string[];
    breaking: string[];
    security: string[];
    tags: string[];
    prRefs: unknown;
  }>;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  pagination: {
    mode: "offset";
    nextOffset: number | null;
    nextCursor: string | null;
  };
};

/**
 * Fetch changelog entries with optional filters and pagination, newest first.
 * Results are cached based on query parameters.
 */

const getChangelogEntries = async (query: ChangelogQuery = {}): Promise<ChangelogListResult> => {
  const { type, tag, search, limit = 20, offset = 0 } = query;

  const cacheKey = `changelog:list:${type || "all"}:${tag || "-"}:${search || "-"}:${limit}:${offset}`;
  const cached = await cacheGet<ChangelogListResult>(cacheKey);

  if (cached) return cached;

  const where: {
    type?: ChangelogType;
    tags?: { has: string };
    OR?: Array<{
      title?: { contains: string; mode: "insensitive" };
      summary?: { contains: string; mode: "insensitive" };
    }>;
  } = {};

  if (type) where.type = type;
  if (tag) where.tags = { has: tag };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
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

  const response = {
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
};

/**
 * Fetch a single changelog entry by id (version slug).
 */

const getChangelogEntryById = async (id: string) => {
  const cacheKey = `changelog:entry:${id}`;
  const cached = await cacheGet(cacheKey);

  if (cached) return cached;

  const entry = await prisma.changelogEntry.findUnique({ where: { id } });

  if (!entry) throw new ApiError(404, "Changelog entry not found");

  await cacheSet(cacheKey, entry, config.cache.changelogTtlSeconds);

  return entry;
};

import { fetchGitHubContributors } from "#services/githubService";

interface ChangelogContributor {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
}

const MAX_TOP_CONTRIBUTORS = 30;

// Known repository core contributors as base fallback
const KNOWN_CORE_CONTRIBUTORS: ChangelogContributor[] = [
  { login: "Gautam25Raj", avatarUrl: "https://avatars.githubusercontent.com/u/63155224?v=4", htmlUrl: "https://github.com/Gautam25Raj" },
  { login: "Atharv-Shandilya", avatarUrl: "https://avatars.githubusercontent.com/u/135959630?v=4", htmlUrl: "https://github.com/Atharv-Shandilya" },
  { login: "aaditya-rathore", avatarUrl: "https://avatars.githubusercontent.com/u/123990694?v=4", htmlUrl: "https://github.com/aaditya-rathore" },
  { login: "HirenGajjar", avatarUrl: "https://avatars.githubusercontent.com/u/40492198?v=4", htmlUrl: "https://github.com/HirenGajjar" },
  { login: "Akshay7057017063", avatarUrl: "https://avatars.githubusercontent.com/u/114216378?v=4", htmlUrl: "https://github.com/Akshay7057017063" },
  { login: "subhan-f", avatarUrl: "https://avatars.githubusercontent.com/u/67074140?v=4", htmlUrl: "https://github.com/subhan-f" },
  { login: "dicnunz", avatarUrl: "https://avatars.githubusercontent.com/u/139033898?v=4", htmlUrl: "https://github.com/dicnunz" },
];

/**
 * Aggregates all contributors from PR refs, GitHub contributors API,
 * in-text @username mentions, and repository committers.
 */
async function computeContributorStats(): Promise<{
  contributorCount: number;
  topContributors: ChangelogContributor[];
}> {
  const seen = new Map<string, ChangelogContributor>();

  // 1. Seed known contributors
  for (const c of KNOWN_CORE_CONTRIBUTORS) {
    seen.set(c.login.toLowerCase(), c);
  }

  // 2. Fetch live contributors from GitHub if configured
  const { owner, repo, token } = config.github;
  if (owner && repo) {
    try {
      const apiContributors = await fetchGitHubContributors(owner, repo, token);
      for (const c of apiContributors) {
        seen.set(c.login.toLowerCase(), {
          login: c.login,
          avatarUrl: c.avatarUrl,
          htmlUrl: c.htmlUrl,
        });
      }
    } catch {
      // Non-fatal, fallback to DB and known contributors
    }
  }

  // 3. Scan changelog DB entries for prRefs authors and @mentions
  const rows = await prisma.changelogEntry.findMany({
    select: {
      prRefs: true,
      added: true,
      improved: true,
      fixed: true,
      breaking: true,
      security: true,
    },
  });

  for (const row of rows) {
    // Scan PR refs
    if (Array.isArray(row.prRefs)) {
      for (const ref of row.prRefs as unknown[]) {
        if (!ref || typeof ref !== "object") continue;

        const author = (ref as Record<string, unknown>).author;
        if (!author || typeof author !== "object") continue;

        const { login, avatarUrl, htmlUrl } = author as Record<string, unknown>;
        if (
          typeof login === "string" &&
          typeof avatarUrl === "string" &&
          typeof htmlUrl === "string"
        ) {
          seen.set(login.toLowerCase(), { login, avatarUrl, htmlUrl });
        }
      }
    }

    // Scan text items for @user mentions
    const allItems = [
      ...row.added,
      ...row.improved,
      ...row.fixed,
      ...row.breaking,
      ...row.security,
    ];
    for (const item of allItems) {
      const mentions = item.match(/(?:^|\s)@([a-zA-Z0-9_-]+)(?=[\s,.:;!?)\]]|$)/g);
      if (mentions) {
        for (const m of mentions) {
          const username = m.trim().replace(/^@/, "");
          if (
            username &&
            username.length >= 2 &&
            username.toLowerCase() !== "veriworkly" &&
            username.toLowerCase() !== "veriworkl" &&
            !username.includes("npm")
          ) {
            const lower = username.toLowerCase();
            if (!seen.has(lower)) {
              seen.set(lower, {
                login: username,
                avatarUrl: `https://github.com/${username}.png`,
                htmlUrl: `https://github.com/${username}`,
              });
            }
          }
        }
      }
    }
  }

  const all = Array.from(seen.values());

  return {
    contributorCount: all.length,
    topContributors: all.slice(0, MAX_TOP_CONTRIBUTORS),
  };
}

/**
 * Compute aggregate changelog statistics (counts by type, latest version).
 * Cached to reduce database load.
 */

const getChangelogStats = async () => {
  const cacheKey = "changelog:stats";
  const cached = await cacheGet(cacheKey);

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

  const stats = {
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
};

export { getChangelogEntries, getChangelogEntryById, getChangelogStats };
