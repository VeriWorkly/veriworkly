import { v4 as uuidv4 } from "uuid";
import { Prisma } from "@prisma/client";

import { config } from "#config";
import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";
import { getRedis } from "#lib/redis";
import { logger } from "#lib/logger";

import {
  fetchAllGitHubReleases,
  parseReleaseBody,
  derivePrRefsFromCommits,
  type GitHubReleasePayload,
} from "#services/github/index";
import { slugifyVersion, parseReleaseTag, deriveReleaseType } from "#utils/changelogVersion";

import { CHANGELOG_CACHE_KEYS, invalidateChangelogReadCaches } from "./cache.js";

const RELEASE_LOCK_LUA_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
  else
      return 0
  end
`;

/**
 * Whether a startup sync is worth running. Cron runs deliberately bypass this — the schedule is
 * the intent there — so only the boot path pays the freshness check.
 */
export async function shouldSyncChangelogReleases(): Promise<boolean> {
  try {
    const marker = await getRedis().get(CHANGELOG_CACHE_KEYS.SYNC_MARKER);
    return marker === null;
  } catch (error) {
    logger.warn("Changelog release sync freshness check failed; syncing anyway", error);
    return true;
  }
}

function deriveTitle(release: GitHubReleasePayload, version: string): string {
  if (!release.name) return `Release v${version}`;

  return release.name.replace(/^v?[\d.]+(?:-[\w.]+)?\s*[–-]\s*/i, "").trim() || release.name;
}

/**
 * Syncs missing GitHub releases into the changelog. Purely additive: an
 * existing ChangelogEntry (hand-curated or previously synced) is never
 * modified, only genuinely new releases get a row created. Safe to re-run.
 */
export async function syncChangelogFromGitHubReleases(): Promise<{
  created: number;
  skipped: number;
  total: number;
}> {
  const { owner, repo, token } = config.github;

  if (!owner || !repo || !token) {
    logger.warn(
      "Changelog release sync skipped: GITHUB_OWNER/GITHUB_REPO/GITHUB_TOKEN not configured.",
    );
    return { created: 0, skipped: 0, total: 0 };
  }

  const redis = getRedis();
  const lockKey = CHANGELOG_CACHE_KEYS.RELEASE_SYNC_LOCK;
  const lockValue = uuidv4();
  const lockTTL = 600;

  const lockResult = await redis.set(lockKey, lockValue, { NX: true, EX: lockTTL });

  if (lockResult !== "OK") {
    throw new ApiError(409, "Changelog release sync is already in progress");
  }

  try {
    const releases = await fetchAllGitHubReleases(owner, repo, token);

    const releaseIds = releases.map((release) => slugifyVersion(parseReleaseTag(release.tag_name)));
    const storedRows = await prisma.changelogEntry.findMany({
      where: { id: { in: releaseIds } },
      select: { id: true },
    });
    const storedIds = new Set(storedRows.map((row) => row.id));

    let created = 0;
    let skipped = 0;

    for (let index = 0; index < releases.length; index++) {
      const release = releases[index];
      const version = parseReleaseTag(release.tag_name);
      const id = releaseIds[index];

      if (storedIds.has(id)) {
        skipped++;
        continue;
      }

      const previousRelease = releases[index - 1];
      const type = deriveReleaseType(
        previousRelease ? parseReleaseTag(previousRelease.tag_name) : undefined,
        version,
      );

      const parsedBody = parseReleaseBody(release.body);
      const prRefs = await derivePrRefsFromCommits(
        owner,
        repo,
        token,
        previousRelease?.tag_name,
        release.tag_name,
      );

      await prisma.changelogEntry.create({
        data: {
          id,
          version,
          title: deriveTitle(release, version),
          summary: parsedBody.summary,
          type,
          publishedAt: release.published_at ? new Date(release.published_at) : new Date(),
          githubUrl: release.html_url,
          added: parsedBody.added,
          improved: parsedBody.improved,
          fixed: parsedBody.fixed,
          breaking: parsedBody.breaking,
          security: parsedBody.security,
          tags: ["auto-synced"],
          prRefs: (prRefs.length > 0 ? prRefs : Prisma.JsonNull) as Prisma.InputJsonValue,
        },
      });

      created++;
      logger.info(`Changelog release sync: created entry for ${id} (v${version})`);
    }

    if (created > 0) {
      await invalidateChangelogReadCaches();
    }

    await redis
      .set(CHANGELOG_CACHE_KEYS.SYNC_MARKER, new Date().toISOString(), {
        EX: Math.max(60, config.changelogSync.minIntervalSeconds),
      })
      .catch((err) => logger.error("Failed to record changelog sync freshness marker", err));

    logger.info(`Changelog release sync complete: ${created} created, ${skipped} already present`);

    return { created, skipped, total: releases.length };
  } finally {
    try {
      await redis.eval(RELEASE_LOCK_LUA_SCRIPT, {
        keys: [lockKey],
        arguments: [lockValue],
      });
    } catch (err) {
      logger.error("Failed to release changelog sync lock", err);
    }
  }
}
