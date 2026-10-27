import { Prisma } from "@prisma/client";

import { config } from "#config";
import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";
import { getRedis } from "#lib/redis";
import { acquireJobLock, type JobLock } from "#lib/jobLock";
import { recordJobSuccess } from "#lib/metrics";
import { logger } from "#lib/logger";

import {
  fetchAllGitHubReleases,
  parseReleaseBody,
  samePullRequests,
  unionPullRequests,
  listedPullRequests,
  reparseStoredRelease,
  fetchMergedPullRequests,
  assignPullRequestsToReleases,
  type ReleasePrRef,
  type GitHubReleasePayload,
} from "#services/github/index";
import { slugifyVersion, parseReleaseTag, deriveReleaseType } from "#utils/changelogVersion";

import { CHANGELOG_CACHE_KEYS, invalidateChangelogReadCaches } from "./cache.js";
import { refreshContributorStats } from "./contributors.js";

/**
 * Whether a startup sync is worth running. Cron runs deliberately bypass this — the schedule is
 * the intent there — so only the boot path pays the freshness check.
 */
async function shouldSyncChangelogReleases(): Promise<boolean> {
  try {
    const marker = await getRedis().get(CHANGELOG_CACHE_KEYS.SYNC_MARKER);
    return marker === null;
  } catch (error) {
    logger.warn("Changelog release sync freshness check failed; syncing anyway", error);
    return true;
  }
}

type ChangelogSyncResult = {
  created: number;
  refreshed: number;
  skipped: number;
  total: number;
};

/** The last run as the admin status endpoint reports it: started, then finished one way or the other. */
type ChangelogSyncRun = {
  status: "running" | "ok" | "error";
  startedAt: string;
  finishedAt?: string;
  result?: ChangelogSyncResult;
  error?: string;
};

const SYNC_RUN_TTL_SECONDS = 7 * 24 * 3600;

/** Best effort: a run that cannot record itself still syncs. */
async function recordSyncRun(run: ChangelogSyncRun) {
  try {
    await getRedis().set(CHANGELOG_CACHE_KEYS.SYNC_RUN, JSON.stringify(run), {
      EX: SYNC_RUN_TTL_SECONDS,
    });
  } catch (error) {
    logger.warn("Could not record the changelog sync run", {
      error: error instanceof Error ? error.message : error,
    });
  }
}

/**
 * What `GET /admin/changelog/sync` reports: whether a sync holds the lock now, and how the last
 * one went. Either is null when Redis cannot be read.
 */
export async function getChangelogSyncStatus(): Promise<{
  running: boolean | null;
  lastRun: ChangelogSyncRun | null;
}> {
  try {
    const redis = getRedis();
    const [lock, run] = await Promise.all([
      redis.exists(CHANGELOG_CACHE_KEYS.RELEASE_SYNC_LOCK),
      redis.get(CHANGELOG_CACHE_KEYS.SYNC_RUN),
    ]);

    return { running: lock === 1, lastRun: run ? (JSON.parse(run) as ChangelogSyncRun) : null };
  } catch (error) {
    logger.warn("Could not read the changelog sync status", {
      error: error instanceof Error ? error.message : error,
    });
    return { running: null, lastRun: null };
  }
}

/**
 * The release sync's lock, renewed while the sync runs (V-127). 409 when another runner holds it;
 * throws as `acquireJobLock` does when Redis is not ready.
 */
export async function acquireChangelogSyncLock(): Promise<JobLock> {
  const lock = await acquireJobLock(CHANGELOG_CACHE_KEYS.RELEASE_SYNC_LOCK, { ttlMs: 600_000 });

  if (!lock) throw new ApiError(409, "Changelog release sync is already in progress");

  return lock;
}

const reportedCollisions = new Set<string>();

/** A skipped tag is said at warn once per process; every later sync repeats it at debug. */
function reportCollision(key: string, message: string) {
  if (reportedCollisions.has(key)) {
    logger.debug(message);
    return;
  }

  reportedCollisions.add(key);
  logger.warn(message);
}

/**
 * Whether a P2002 came from ChangelogEntry's id or version unique. The classic engine names the
 * columns in `meta.target`; the pg driver adapter usually names only the constraint.
 */
function isIdOrVersionConflict(error: Prisma.PrismaClientKnownRequestError): boolean {
  const meta = error.meta as
    | {
        target?: unknown;
        driverAdapterError?: { cause?: { constraint?: { fields?: unknown; index?: unknown } } };
      }
    | undefined;
  const constraint = meta?.driverAdapterError?.cause?.constraint;
  const fields = Array.isArray(meta?.target) ? meta.target : constraint?.fields;

  if (Array.isArray(fields)) return fields.some((field) => field === "id" || field === "version");

  const name = typeof meta?.target === "string" ? meta.target : constraint?.index;
  return name === "ChangelogEntry_pkey" || name === "ChangelogEntry_version_key";
}

function deriveTitle(release: GitHubReleasePayload, version: string): string {
  if (!release.name) return `Release v${version}`;

  // "v3.32.0 – Title", "v3.32.0 - Title" and "v3.32.0 — Title" (em dash) all become "Title".
  return release.name.replace(/^v?[\d.]+(?:-[\w.]+)?\s*[–—-]\s*/i, "").trim() || release.name;
}

/**
 * Syncs GitHub releases into the changelog. New releases get a row. Every stored release has its
 * pull request list completed from GitHub, adding PRs and authors but never removing any. A
 * synced row no admin has edited (`editedAt` null) is also parsed again on every run, so parser
 * fixes reach it; hand-curated and admin-edited text is never modified. Safe to re-run.
 * Not every old entry qualifies (V-066): the 20261025210000 backfill marked every row whose
 * `updatedAt` had moved, including rows only the old sync's prRefs write touched, because a
 * hand edit made before changelog writes were audited cannot be told apart from it. Those rows
 * keep their text until an admin clears `editedAt` on them.
 *
 * `options.lock` is a lock the caller already took with `acquireChangelogSyncLock` (the admin
 * trigger, which then runs this in the background); it is released here either way.
 * `options.onlyIfStale` (the startup run) checks the freshness marker once the lock is held and
 * resolves to null when the last sync is recent, so two booting workers cannot both pass it.
 */
export const CHANGELOG_SYNC_NOT_CONFIGURED =
  "Changelog sync is not configured (GITHUB_OWNER/GITHUB_REPO/GITHUB_TOKEN)";

/** The release sync needs all three; without them the job is not scheduled (V-260). */
export function isChangelogSyncConfigured(): boolean {
  const { owner, repo, token } = config.github;
  return Boolean(owner && repo && token);
}

export async function syncChangelogFromGitHubReleases(): Promise<ChangelogSyncResult>;
export async function syncChangelogFromGitHubReleases(options: {
  lock?: JobLock;
  onlyIfStale?: boolean;
}): Promise<ChangelogSyncResult | null>;
export async function syncChangelogFromGitHubReleases(
  options: { lock?: JobLock; onlyIfStale?: boolean } = {},
): Promise<ChangelogSyncResult | null> {
  const { owner, repo, token } = config.github;

  // Not a successful empty run: that left /health/jobs calling the job stale forever (V-260).
  if (!owner || !repo || !token) {
    await options.lock?.release();
    throw new ApiError(503, CHANGELOG_SYNC_NOT_CONFIGURED);
  }

  // Renewed while the sync runs (V-127): 20 PR pages plus the releases can outlast a fixed TTL.
  const lock = options.lock ?? (await acquireChangelogSyncLock());

  // Checked after each fetch and before each write: a sync that lost its lock stops instead of
  // writing beside the runner that now holds it.
  const ensureStillOwner = async () => {
    if (!(await lock.stillOwner()))
      throw new ApiError(
        409,
        "Changelog release sync stopped: its lock was taken by another runner",
      );
  };

  let run: ChangelogSyncRun | null = null;

  try {
    if (options.onlyIfStale && !(await shouldSyncChangelogReleases())) return null;

    run = { status: "running", startedAt: new Date().toISOString() };
    await recordSyncRun(run);

    const fetched = await fetchAllGitHubReleases(owner, repo, token);
    await ensureStillOwner();

    // Two tags can slugify to one id (3.0.0-1 and 3.0.0.1 are both v3-0-0-1). The first, oldest,
    // keeps the id; the later one is skipped and named, rather than its create hitting P2002 and
    // failing the whole sync on every run (V-158).
    const tagById = new Map<string, string>();
    const releases = fetched.filter((release) => {
      const id = slugifyVersion(parseReleaseTag(release.tag_name));
      const firstTag = tagById.get(id);

      if (firstTag !== undefined) {
        reportCollision(
          `${firstTag}\u0000${release.tag_name}`,
          `Changelog release sync: tag ${release.tag_name} skipped, its id ${id} is already used by tag ${firstTag}`,
        );
        return false;
      }

      tagById.set(id, release.tag_name);
      return true;
    });
    const duplicates = fetched.length - releases.length;

    const releaseIds = releases.map((release) => slugifyVersion(parseReleaseTag(release.tag_name)));
    const storedRows = await prisma.changelogEntry.findMany({
      where: { id: { in: releaseIds } },
      select: {
        id: true,
        tags: true,
        editedAt: true,
        summary: true,
        added: true,
        improved: true,
        fixed: true,
        breaking: true,
        security: true,
        prRefs: true,
      },
    });
    const storedById = new Map(storedRows.map((row) => [row.id, row]));
    // Releases an admin deleted from the changelog (V-289): never created again.
    const deletedIds = new Set(
      (
        await prisma.changelogReleaseTombstone.findMany({
          where: { id: { in: releaseIds } },
          select: { id: true },
        })
      ).map((row) => row.id),
    );
    const repoUrl = `https://github.com/${owner}/${repo}`;

    const parsedBodies = releases.map((release) => parseReleaseBody(release.body));

    // Most release notes name no PRs, so the PR list comes from what merged between releases.
    // A failed fetch only means this sync adds no PRs; the notes themselves still sync.
    const pulls = await fetchMergedPullRequests(owner, repo, token).catch((error) => {
      logger.error("Changelog release sync: could not list merged pull requests", error);
      return [];
    });
    const assigned = assignPullRequestsToReleases(
      releases.map((release, index) => ({
        id: releaseIds[index],
        publishedAt: release.published_at ?? new Date().toISOString(),
        listed: parsedBodies[index].pullRequests.map((pr) => pr.number),
      })),
      pulls,
    );

    let created = 0;
    let refreshed = 0;
    let skipped = duplicates;

    for (let index = 0; index < releases.length; index++) {
      await ensureStillOwner();

      const release = releases[index];
      const version = parseReleaseTag(release.tag_name);
      const id = releaseIds[index];
      const parsedBody = parsedBodies[index];
      const shippedPrs = unionPullRequests(
        assigned.get(id) ?? [],
        listedPullRequests(parsedBody.pullRequests, repoUrl),
      );

      const stored = storedById.get(id);

      if (!stored && deletedIds.has(id)) {
        skipped++;
        continue;
      }

      if (stored) {
        const storedPrs = Array.isArray(stored.prRefs)
          ? (stored.prRefs as unknown as ReleasePrRef[])
          : [];

        // A synced entry no admin has edited holds only what the parser produced, so its text is
        // parsed again and parser fixes reach it. `editedAt` is set by admin writes (and, for rows
        // stored before 2026-10-25, by the backfill: see the function comment, V-066); the
        // updatedAt-createdAt test this replaced counted the sync's own prRefs write as an edit.
        const text =
          stored.tags.includes("auto-synced") && !stored.editedAt
            ? reparseStoredRelease(release.body, { ...stored, prRefs: storedPrs }, repoUrl)
            : null;

        const prRefs = unionPullRequests(text?.prRefs ?? storedPrs, shippedPrs);
        const prsChanged = !samePullRequests(prRefs, storedPrs);

        if (text || prsChanged) {
          await prisma.changelogEntry.update({
            where: { id },
            data: {
              ...text,
              prRefs: (prRefs.length > 0
                ? prRefs
                : Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
            },
          });
          refreshed++;
        } else skipped++;

        continue;
      }

      const previousRelease = releases[index - 1];
      const type = deriveReleaseType(
        previousRelease ? parseReleaseTag(previousRelease.tag_name) : undefined,
        version,
      );

      const createdRow = await prisma.changelogEntry
        .create({
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
            prRefs: (shippedPrs.length > 0
              ? shippedPrs
              : Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
          },
        })
        .catch((error: unknown) => {
          // A hand-made entry can already hold this version under another id.
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002" &&
            isIdOrVersionConflict(error)
          ) {
            reportCollision(
              `${release.tag_name}\u0000stored`,
              `Changelog release sync: tag ${release.tag_name} skipped, version ${version} or id ${id} already exists`,
            );
            return null;
          }
          throw error;
        });

      if (!createdRow) {
        skipped++;
        continue;
      }

      created++;
      logger.info(`Changelog release sync: created entry for ${id} (v${version})`);
    }

    const contributorsStored = await refreshContributorStats();

    if (created > 0 || refreshed > 0 || contributorsStored) {
      await invalidateChangelogReadCaches();
    }

    await getRedis()
      .set(CHANGELOG_CACHE_KEYS.SYNC_MARKER, new Date().toISOString(), {
        EX: Math.max(60, config.changelogSync.minIntervalSeconds),
      })
      .catch((err) => logger.error("Failed to record changelog sync freshness marker", err));

    logger.info(
      `Changelog release sync complete: ${created} created, ${refreshed} re-parsed, ${skipped} already present`,
    );

    recordJobSuccess("changelog-sync");

    const result = { created, refreshed, skipped, total: fetched.length };
    await recordSyncRun({ ...run, status: "ok", finishedAt: new Date().toISOString(), result });

    return result;
  } catch (error) {
    if (run) {
      await recordSyncRun({
        ...run,
        status: "error",
        finishedAt: new Date().toISOString(),
        error: (error instanceof Error ? error.message : String(error)).slice(0, 500),
      });
    }
    throw error;
  } finally {
    await lock.release();
  }
}
