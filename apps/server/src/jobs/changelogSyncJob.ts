import cron, { ScheduledTask } from "node-cron";

import { config } from "#config";
import { logger } from "#lib/logger";
import { ApiError } from "#lib/errors";
import { getRedis } from "#lib/redis";
import { createRunTracker, type JobLock } from "#lib/jobLock";

import {
  isChangelogSyncConfigured,
  syncChangelogFromGitHubReleases,
} from "#services/changelog/index";

let job: ScheduledTask | null = null;
const runs = createRunTracker();

/**
 * Never rejects; a Redis blip is a skipped tick logged at warn, not an error (V-101). An "admin"
 * run arrives holding the lock its request took (V-080).
 */
export async function runChangelogSync(
  reason: "startup" | "cron" | "admin",
  lock?: JobLock,
): Promise<void> {
  try {
    if (!lock) getRedis();
  } catch (error) {
    logger.warn(`Skipping changelog release sync (${reason}): Redis not ready`, {
      error: error instanceof Error ? error.message : error,
    });
    return;
  }

  try {
    // Mirrors the GitHub stats job: a restart is not a reason to re-scan GitHub. The cron
    // is the schedule, so it always runs; only the boot path checks freshness, under the lock.
    const result = await syncChangelogFromGitHubReleases({
      lock,
      onlyIfStale: reason === "startup",
    });

    if (!result) {
      logger.debug("Changelog release sync (startup) skipped: last sync is still fresh.");
      return;
    }

    logger.info(`Changelog release sync (${reason}) success`, {
      created: result.created,
      refreshed: result.refreshed,
      skipped: result.skipped,
      total: result.total,
    });
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) {
      logger.debug(`Changelog release sync (${reason}) locked by another instance. Skipping.`);
      return;
    }

    logger.error(`Changelog release sync (${reason}) failed`, {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Runs an admin-triggered sync after its request has answered 202, holding the lock the request
 * took. Tracked like the scheduled runs, so shutdown waits for it.
 */
export function runChangelogSyncInBackground(lock: JobLock): void {
  runs.track(runChangelogSync("admin", lock));
}

/** Whether startChangelogSyncJob schedules anything; `/health/jobs` reports it disabled otherwise. */
export function isChangelogSyncJobEnabled(): boolean {
  return config.changelogSync.enabled && isChangelogSyncConfigured();
}

export function startChangelogSyncJob() {
  const { cron: cronExpression, timezone } = config.changelogSync;

  if (!config.changelogSync.enabled) {
    logger.warn("Changelog release sync is disabled in config.");
    return;
  }

  // Every run would stop at the missing setting, and /health/jobs would call the job stale
  // forever; it is reported disabled instead (V-260).
  if (!isChangelogSyncJobEnabled()) {
    logger.warn(
      "Changelog release sync is not scheduled: GITHUB_OWNER/GITHUB_REPO/GITHUB_TOKEN are not configured.",
    );
    return;
  }

  if (job) return;

  job = cron.schedule(cronExpression, () => runs.track(runChangelogSync("cron")), { timezone });

  logger.debug("Changelog release sync cron started", { schedule: cronExpression });

  runs.track(runChangelogSync("startup"));
}

/** Stops scheduling and resolves once the sync in progress, if any, has finished. */
export async function stopChangelogSyncJob(): Promise<void> {
  if (job) {
    await job.stop();
    job = null;

    logger.info("Changelog release sync cron stopped.");
  }

  return runs.idle();
}
