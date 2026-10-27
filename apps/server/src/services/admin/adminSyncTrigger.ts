import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";
import type { JobLock } from "#lib/jobLock";

import { runChangelogSyncInBackground } from "#jobs/changelogSyncJob";
import { runGitHubSyncInBackground } from "#jobs/githubSyncJob";
import {
  acquireChangelogSyncLock,
  CHANGELOG_SYNC_NOT_CONFIGURED,
  isChangelogSyncConfigured,
} from "#services/changelog/index";
import { acquireGitHubSyncLock, isGitHubIssueSyncConfigured } from "#services/github/index";

/**
 * Manual syncs started from the admin API (V-080). A sync pages through GitHub for minutes, longer
 * than a proxy holds a request open, so the request only takes the job's lock and answers 202; the
 * sync runs in the background holding that lock. Taking it in the request keeps the two answers an
 * admin can act on synchronous: 409 when a sync is already running, 503 when Redis is down (the
 * lock lives there, and a raw client error used to surface as a 500).
 */

type SyncStarted = {
  status: "started";
  /** Poll this for `running` and the outcome. */
  statusUrl: string;
};

async function takeLock(acquire: () => Promise<JobLock>): Promise<JobLock> {
  try {
    return await acquire();
  } catch (error) {
    if (error instanceof ApiError) throw error;

    logger.warn("Sync lock unavailable: Redis is not reachable", {
      error: error instanceof Error ? error.message : error,
    });
    throw new ApiError(503, "Syncing is unavailable right now. Try again shortly.");
  }
}

/** The outcome lands on the GitHubSync row (`lastSyncStatus`, `lastError`). */
export async function startGitHubSync(force: boolean): Promise<SyncStarted> {
  if (!isGitHubIssueSyncConfigured())
    throw new ApiError(503, "GitHub sync is not configured (GITHUB_OWNER/GITHUB_REPO)");

  const lock = await takeLock(acquireGitHubSyncLock);
  runGitHubSyncInBackground(lock, force);

  return { status: "started", statusUrl: "/api/v1/admin/system/github" };
}

/** The outcome is recorded for `GET /admin/changelog/sync`. */
export async function startChangelogSync(): Promise<SyncStarted> {
  // Like the GitHub trigger: a 202 for a sync that cannot run would be a lie (V-260).
  if (!isChangelogSyncConfigured()) throw new ApiError(503, CHANGELOG_SYNC_NOT_CONFIGURED);

  const lock = await takeLock(acquireChangelogSyncLock);
  runChangelogSyncInBackground(lock);

  return { status: "started", statusUrl: "/api/v1/admin/changelog/sync" };
}
