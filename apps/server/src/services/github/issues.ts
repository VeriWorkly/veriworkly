import cron from "node-cron";
import type { GitHubSync, Prisma } from "@prisma/client";
import { config } from "#config";
import type { GitHubStatsResponse } from "#types/api";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";
import { cacheDel, cacheGet, cacheSet } from "#lib/redis";
import { acquireJobLock, type JobLock } from "#lib/jobLock";
import { recordJobSuccess } from "#lib/metrics";
import { bumpGeneration, resolveGenerationalKey } from "#lib/cacheGeneration";
import { logger } from "#lib/logger";

import { MAX_CACHED_OFFSET } from "#utils/pagination";

import { fetchGitHubApi } from "./client.js";
import type {
  GitHubStatus,
  GitHubIssuesQuery,
  GitHubIssuesResult,
  GitHubIssuePayload,
  GitHubItemSnapshot,
} from "./types.js";

/**
 * The row and cache keys name the project. Unset, the key stays "" (`github:stats:`), which is
 * what the stored sync row and its cache already use: deriving a new one would orphan that row and
 * blank the public stats until the next sync (V-058).
 */
export const GITHUB_PROJECT_URL = config.github.projectUrl;
const REDIS_STATS_KEY = `github:stats:${GITHUB_PROJECT_URL}`;
/** Generation namespace: a sync invalidates every query variant with one INCR, not a SCAN. */
const ISSUES_CACHE_NAMESPACE = `github:issues:${encodeURIComponent(GITHUB_PROJECT_URL)}`;
const ISSUES_CACHE_TTL = 300; // 5 minutes

/**
 * When the cron (`GITHUB_SYNC_CRON` in `GITHUB_SYNC_TIMEZONE`) next fires, so `nextSyncAt` on
 * `/github/stats` matches the real schedule. An unstarted task computes it and is destroyed.
 * Falls back to +12 h if the expression cannot be read.
 */
function nextScheduledSyncAt(): Date {
  try {
    const task = cron.createTask(config.github.syncCron, () => undefined, {
      timezone: config.github.syncTimezone,
    });
    const [next] = task.getNextRuns(1);
    void task.destroy();
    if (next) return next;
  } catch (error) {
    logger.warn("Could not compute the next GitHub sync time from GITHUB_SYNC_CRON", error);
  }

  return new Date(Date.now() + 12 * 60 * 60 * 1000);
}

/**
 * Map GitHub issue to internal status.
 */
function classifyIssue(issue: GitHubIssuePayload): GitHubStatus {
  if (issue.state === "closed") return "done";

  const labels = issue.labels.map((label) => label.name.toLowerCase());

  if (labels.includes("done")) return "done";

  if (labels.some((l) => l === "in-progress" || l === "in progress" || l === "active")) {
    return "in-progress";
  }

  return "todo";
}

/**
 * Convert raw GitHub issues into normalized snapshot format.
 */
function buildGitHubIssuesSnapshot(issues: GitHubIssuePayload[]) {
  const snapshots = issues.map<GitHubItemSnapshot>((issue) => ({
    id: `gh-${issue.id}`,
    number: issue.number,
    title: issue.title,
    status: classifyIssue(issue),
    kind: issue.pull_request ? "pull-request" : "issue",
    url: issue.html_url,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    labels: issue.labels.map((label) => label.name),
  }));

  return {
    issues: snapshots,
    todoIssues: snapshots.filter((item) => item.status === "todo"),
    inProgressIssues: snapshots.filter((item) => item.status === "in-progress"),
    doneIssues: snapshots.filter((item) => item.status === "done"),
  };
}

/**
 * Fetch all GitHub issues with pagination support.
 */
async function fetchAllGitHubIssues(
  owner: string,
  repo: string,
  token: string,
  since?: Date,
  /** Awaited before every page after the first; throw from it to stop paging. */
  beforeNextPage?: () => Promise<void>,
): Promise<GitHubIssuePayload[]> {
  const collected: GitHubIssuePayload[] = [];

  let page = 1;
  const perPage = 100;

  let url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=${perPage}`;

  if (since) {
    url += `&since=${since.toISOString()}`;
  }

  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetchGitHubApi(`${url}&page=${page}`, token);

    const payload = (await response.json()) as GitHubIssuePayload[];
    if (payload.length === 0) {
      hasNextPage = false;
      continue;
    }

    collected.push(...payload.filter((item) => !item.title.startsWith("[Bot]")));

    hasNextPage = payload.length === perPage;

    if (hasNextPage) {
      page += 1;
      await beforeNextPage?.();
    }
  }

  return collected;
}

/**
 * Fetch cached GitHub project stats or load from DB.
 */
export async function getGitHubStats(): Promise<GitHubStatsResponse | null> {
  const cached = await cacheGet<GitHubStatsResponse>(REDIS_STATS_KEY);

  if (cached) return cached;

  const latest = await prisma.gitHubSync.findUnique({
    where: { projectUrl: GITHUB_PROJECT_URL },
  });

  if (!latest) return null;

  const response: GitHubStatsResponse = {
    projectName: latest.projectName,
    projectUrl: latest.projectUrl,
    stats: {
      totalItems: latest.issueCount,
      total: latest.issueCount,
      issues: latest.onlyIssueCount,
      pullRequests: latest.prCount,
      todo: latest.todoCount,
      inProgress: latest.inProgressCount,
      done: latest.doneCount,
      completionRate:
        latest.issueCount === 0
          ? "0.00"
          : ((latest.doneCount / latest.issueCount) * 100).toFixed(2),
    },
    syncedAt: latest.syncedAt,
    nextSyncAt: latest.nextSyncAt,
  };

  await cacheSet(REDIS_STATS_KEY, response, config.cache.githubStatsTtlSeconds);

  return response;
}

/**
 * Fetch GitHub issues from DB with filters and pagination.
 * Results are cached per query.
 */
export async function getGitHubIssues(query: GitHubIssuesQuery): Promise<GitHubIssuesResult> {
  const sortedQuery = new URLSearchParams();

  sortedQuery.set("limit", String(query.limit));
  sortedQuery.set("offset", String(query.offset));

  if (query.status) {
    sortedQuery.set("status", query.status);
  }

  if (query.kind) {
    sortedQuery.set("kind", query.kind);
  }

  sortedQuery.sort();

  // Date-filtered and deep-offset queries are not cached: each distinct value would be its own
  // Redis key, a key space any caller can grow (V-061).
  const cacheable = !query.createdAt && !query.updatedAt && query.offset <= MAX_CACHED_OFFSET;
  const queryKey = cacheable
    ? await resolveGenerationalKey(ISSUES_CACHE_NAMESPACE, sortedQuery.toString())
    : null;

  const cached = queryKey ? await cacheGet<GitHubIssuesResult>(queryKey) : null;

  if (cached) return cached;

  const sync = await prisma.gitHubSync.findUnique({
    where: { projectUrl: GITHUB_PROJECT_URL },
    select: { id: true, syncedAt: true },
  });

  if (!sync) {
    const emptyResult: GitHubIssuesResult = {
      items: [],
      total: 0,
      limit: query.limit,
      offset: query.offset,
      syncedAt: null,
    };

    if (queryKey) await cacheSet(queryKey, emptyResult, ISSUES_CACHE_TTL);

    return emptyResult;
  }

  const where: Prisma.GitHubSyncItemWhereInput = { syncId: sync.id };

  if (query.status) where.status = query.status;
  if (query.kind && query.kind !== "all") where.kind = query.kind;
  if (query.createdAt) where.createdAt = query.createdAt;
  if (query.updatedAt) where.updatedAt = query.updatedAt;

  const [total, items] = await Promise.all([
    prisma.gitHubSyncItem.count({ where }),
    prisma.gitHubSyncItem.findMany({
      where,
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        kind: true,
        url: true,
        labels: true,
        createdAt: true,
        updatedAt: true,
      },
      // id breaks updatedAt ties so offset pages neither repeat nor skip an item (V-062).
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: query.offset || 0,
      take: query.limit || 20,
    }),
  ]);

  const result: GitHubIssuesResult = {
    items,
    total,
    limit: query.limit,
    offset: query.offset,
    syncedAt: sync.syncedAt,
  };
  if (queryKey) await cacheSet(queryKey, result, ISSUES_CACHE_TTL);

  return result;
}

/**
 * Determine whether GitHub stats need syncing (12h interval).
 */
async function shouldSyncGitHubStats(): Promise<boolean> {
  const latest = await prisma.gitHubSync.findUnique({
    where: { projectUrl: GITHUB_PROJECT_URL },
    select: { syncedAt: true },
  });

  if (!latest) return true;

  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

  return Date.now() - new Date(latest.syncedAt).getTime() >= TWELVE_HOURS_MS;
}

/**
 * Owner, repo and a token are what the issue sync cannot run without (V-058): without a token it
 * ran anonymously at GitHub's 60 requests an hour and failed part-way. Same rule as the changelog.
 */
export function isGitHubIssueSyncConfigured(): boolean {
  const { owner, repo, token } = config.github;
  return Boolean(owner && repo && token);
}

/**
 * Say on the sync row, and in the log with the upstream status and URL, why a sync failed (V-059).
 * `syncedAt` is written back unchanged: a failure is not freshness, so the startup check retries.
 */
async function recordSyncFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  logger.error("GitHub issue sync failed", {
    message,
    details: error instanceof ApiError ? error.details : undefined,
  });

  try {
    const row = await prisma.gitHubSync.findUnique({
      where: { projectUrl: GITHUB_PROJECT_URL },
      select: { syncedAt: true },
    });

    if (!row) return;

    await prisma.gitHubSync.update({
      where: { projectUrl: GITHUB_PROJECT_URL },
      data: { lastSyncStatus: "error", lastError: message.slice(0, 500), syncedAt: row.syncedAt },
    });
  } catch (recordError) {
    logger.error("Could not record the GitHub sync failure", recordError);
  }
}

export const GITHUB_SYNC_LOCK = "github:sync:lock";

/**
 * The issue sync's lock: renewed while the sync runs (V-127); the CLI, the admin button and the
 * cron share it. 409 when another runner holds it. Throws as `acquireJobLock` does when Redis is
 * not ready.
 */
export async function acquireGitHubSyncLock(): Promise<JobLock> {
  const lock = await acquireJobLock(GITHUB_SYNC_LOCK, { ttlMs: 600_000 });

  if (!lock) throw new ApiError(409, "GitHub sync is already in progress");

  return lock;
}

/** Subtracted from the stored `since` cursor: covers clock skew with GitHub; upserts are idempotent. */
const SINCE_OVERLAP_MS = 5 * 60 * 1000;

/** Start of the UTC day `at` falls in, in epoch ms. */
function utcDayStart(at: Date): number {
  return Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
}

/** When the last full sync started (`data.lastFullSyncAt`), or null when none is recorded. */
function lastFullSyncAt(data: Prisma.JsonValue | undefined): Date | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const raw = (data as Record<string, unknown>).lastFullSyncAt;
  const at = typeof raw === "string" ? new Date(raw) : null;
  return at && !Number.isNaN(at.getTime()) ? at : null;
}

/**
 * Sync GitHub issues from GitHub API into DB and refresh caches.
 *
 * Only a full sync can drop issues deleted or transferred on GitHub (an incremental `since` fetch
 * never returns them), so `fullSync`:
 * - `true`: always full (admin "force").
 * - `"daily"`: full when no full sync has started yet in the current UTC day, else incremental.
 *   The cron uses this, so the first run of each day reconciles deletions and the rest are cheap.
 * - `false`: incremental whenever a cursor exists.
 *
 * `options.lock` is a lock the caller already took with `acquireGitHubSyncLock` (the admin
 * trigger takes it inside the request, then runs the sync in the background); the sync releases
 * it either way. `options.onlyIfStale` (the startup run) checks freshness once the lock is held,
 * so a worker that waited on another's sync sees its result and resolves to null instead of
 * syncing a second time. Checked before the lock, that run passed the check on stale data.
 */
export async function syncGitHubStatsFromGitHub(
  fullSync?: boolean | "daily",
  options?: { lock?: JobLock },
): Promise<GitHubSync>;
export async function syncGitHubStatsFromGitHub(
  fullSync: boolean | "daily",
  options: { lock?: JobLock; onlyIfStale?: boolean },
): Promise<GitHubSync | null>;
export async function syncGitHubStatsFromGitHub(
  fullSync: boolean | "daily" = false,
  options: { lock?: JobLock; onlyIfStale?: boolean } = {},
): Promise<GitHubSync | null> {
  // Without these the request is repos///issues, a 404 on every run.
  if (!isGitHubIssueSyncConfigured()) {
    await options.lock?.release();
    throw new ApiError(
      503,
      "GitHub sync is not configured (GITHUB_OWNER/GITHUB_REPO/GITHUB_TOKEN)",
    );
  }

  const lock = options.lock ?? (await acquireGitHubSyncLock());

  // Checked between pages and before the write: a sync that lost its lock stops instead of
  // writing beside the runner that now holds it.
  // Kept so the catch below can tell "the runner that now holds the lock owns the row" from a
  // real failure: losing the lock must not write an error over the other runner's result.
  let lostLockError: ApiError | null = null;
  const ensureStillOwner = async () => {
    if (!(await lock.stillOwner())) {
      lostLockError = new ApiError(
        409,
        "GitHub sync stopped: its lock was taken by another runner",
      );
      throw lostLockError;
    }
  };

  try {
    if (options.onlyIfStale && !(await shouldSyncGitHubStats())) return null;

    const { owner, repo, token } = config.github;

    const existingSync = await prisma.gitHubSync.findUnique({
      where: { projectUrl: GITHUB_PROJECT_URL },
      select: { etag: true, id: true, data: true },
    });

    const fetchStartedAt = new Date();
    const lastFull = lastFullSyncAt(existingSync?.data);
    const forceFull =
      fullSync === true ||
      (fullSync === "daily" && (!lastFull || lastFull.getTime() < utcDayStart(fetchStartedAt)));

    // `since` is when the previous fetch started, kept in the otherwise unused `etag` column
    // (syncedAt is when it finished, so issues changed during a slow fetch would be skipped,
    // V-056), minus a small overlap. A row without it, such as one from before this, gets a
    // full sync.
    const previousFetchStartedAt = existingSync?.etag ? new Date(existingSync.etag) : null;
    const sinceDate =
      previousFetchStartedAt && !Number.isNaN(previousFetchStartedAt.getTime()) && !forceFull
        ? new Date(previousFetchStartedAt.getTime() - SINCE_OVERLAP_MS)
        : undefined;

    // A full sync that reconciled records when it started, for the "daily" mode above. Written
    // only with the reconcile below: the empty-result shortcut skips it, so the next cron run
    // tries the full sync again.
    const existingData =
      existingSync?.data &&
      typeof existingSync.data === "object" &&
      !Array.isArray(existingSync.data)
        ? (existingSync.data as Prisma.InputJsonObject)
        : { lastSyncedBy: "System" };
    const syncData: Prisma.InputJsonObject = sinceDate
      ? existingData
      : { ...existingData, lastFullSyncAt: fetchStartedAt.toISOString() };

    const syncOutcome = {
      etag: fetchStartedAt.toISOString(),
      lastSyncStatus: "ok",
      lastError: null,
    };

    const rawIssues = await fetchAllGitHubIssues(owner, repo, token, sinceDate, ensureStillOwner);

    await ensureStillOwner();

    if (rawIssues.length === 0 && existingSync) {
      const updatedSync = await prisma.gitHubSync.update({
        where: { id: existingSync.id },
        data: { syncedAt: new Date(), nextSyncAt: nextScheduledSyncAt(), ...syncOutcome },
      });

      await cacheDel(REDIS_STATS_KEY);
      recordJobSuccess("github-sync");

      return updatedSync;
    }

    const snapshot = buildGitHubIssuesSnapshot(rawIssues);

    const syncRecord = await prisma.$transaction(
      async (tx) => {
        const sync = await tx.gitHubSync.upsert({
          where: { projectUrl: GITHUB_PROJECT_URL },
          create: {
            projectName: `${owner}/${repo}`,
            projectUrl: GITHUB_PROJECT_URL,
            issueCount: 0,
            todoCount: 0,
            inProgressCount: 0,
            doneCount: 0,
            data: syncData,
            nextSyncAt: nextScheduledSyncAt(),
            ...syncOutcome,
          },
          update: {
            syncedAt: new Date(),
            nextSyncAt: nextScheduledSyncAt(),
            data: syncData,
            ...syncOutcome,
          },
        });

        // 1. Fetch current sync items to determine differences
        const existingItems = await tx.gitHubSyncItem.findMany({
          where: { syncId: sync.id },
          select: { githubId: true, updatedAt: true, status: true, title: true, labels: true },
        });

        const existingMap = new Map(existingItems.map((item) => [item.githubId, item]));

        const itemsToCreate: Prisma.GitHubSyncItemCreateManyInput[] = [];
        const itemsToUpdate: Prisma.GitHubSyncItemCreateManyInput[] = [];

        for (const item of snapshot.issues) {
          const githubId = item.id.replace("gh-", "");
          const existing = existingMap.get(githubId);

          const itemData = {
            syncId: sync.id,
            githubId,
            number: item.number,
            title: item.title,
            status: item.status,
            kind: item.kind,
            url: item.url,
            labels: item.labels,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
          };

          if (!existing) {
            itemsToCreate.push(itemData);
          } else {
            // Only write an update if GitHub attributes actually changed
            const hasChanged =
              existing.title !== item.title ||
              existing.status !== item.status ||
              new Date(existing.updatedAt).getTime() !== new Date(item.updatedAt).getTime() ||
              JSON.stringify(existing.labels) !== JSON.stringify(item.labels);

            if (hasChanged) {
              itemsToUpdate.push(itemData);
            }
          }
        }

        // 2. Perform bulk creation in 1 query
        if (itemsToCreate.length > 0) {
          await tx.gitHubSyncItem.createMany({
            data: itemsToCreate,
          });
        }

        // 3. Update only modified items
        if (itemsToUpdate.length > 0) {
          await Promise.all(
            itemsToUpdate.map((item) =>
              tx.gitHubSyncItem.update({
                where: {
                  syncId_githubId: { syncId: sync.id, githubId: item.githubId },
                },
                data: {
                  title: item.title,
                  status: item.status,
                  labels: item.labels,
                  updatedAt: item.updatedAt,
                },
              }),
            ),
          );
        }

        // 4. If full sync, reconcile deleted items
        if (!sinceDate) {
          const fetchedGithubIds = snapshot.issues.map((i) => i.id.replace("gh-", ""));
          await tx.gitHubSyncItem.deleteMany({
            where: {
              syncId: sync.id,
              githubId: { notIn: fetchedGithubIds },
            },
          });
        }

        const groupedStats = await tx.gitHubSyncItem.groupBy({
          by: ["status", "kind"],
          where: {
            syncId: sync.id,
          },
          _count: {
            id: true,
          },
        });

        let todoCount = 0;
        let inProgressCount = 0;
        let doneCount = 0;

        let onlyIssueCount = 0;
        let prCount = 0;

        for (const item of groupedStats) {
          const count = item._count.id;

          if (item.status === "todo") {
            todoCount += count;
          }

          if (item.status === "in-progress") {
            inProgressCount += count;
          }

          if (item.status === "done") {
            doneCount += count;
          }

          if (item.kind === "issue") {
            onlyIssueCount += count;
          }

          if (item.kind === "pull-request") {
            prCount += count;
          }
        }

        const issueCount = onlyIssueCount + prCount;

        return tx.gitHubSync.update({
          where: { id: sync.id },
          data: { issueCount, todoCount, inProgressCount, doneCount, onlyIssueCount, prCount },
        });
      },
      { timeout: 30000 },
    );

    await cacheDel(REDIS_STATS_KEY);
    await bumpGeneration(ISSUES_CACHE_NAMESPACE);
    recordJobSuccess("github-sync");

    return syncRecord;
  } catch (error) {
    if (error === lostLockError) {
      logger.debug("GitHub issue sync stopped: lock lost to another runner; sync row left as is");
    } else {
      await recordSyncFailure(error);
    }
    throw error;
  } finally {
    await lock.release();
  }
}
