import cron, { ScheduledTask } from "node-cron";

import { config } from "#config";
import { logger } from "#lib/logger";
import { ApiError } from "#lib/errors";
import { getRedis } from "#lib/redis";
import { createRunTracker, type JobLock } from "#lib/jobLock";

import { isGitHubIssueSyncConfigured, syncGitHubStatsFromGitHub } from "#services/github/index";

let job: ScheduledTask | null = null;
const runs = createRunTracker();
let warnedNotConfigured = false;

/**
 * Never rejects; a Redis blip is a skipped tick logged at warn, not an error (V-101). An "admin"
 * run arrives holding the lock its request took (V-080) and is full when `force` is set.
 */
export async function runGitHubSync(
  reason: "startup" | "cron" | "admin",
  admin?: { lock: JobLock; force: boolean },
): Promise<void> {
  try {
    if (!admin) getRedis();
  } catch (error) {
    logger.warn(`Skipping GitHub sync (${reason}): Redis not ready`, {
      error: error instanceof Error ? error.message : error,
    });
    return;
  }

  try {
    // The cron is the schedule, so it always runs; only the boot path checks freshness. syncedAt
    // lands seconds after the previous tick, so a 12 h check skipped every second cron run (V-055).
    // The check runs inside the sync, under its lock, so two booting workers cannot both pass it.
    // The cron's first run of each UTC day is a full sync (the only kind that drops issues deleted
    // or transferred on GitHub); its other runs, and the startup run, are incremental.
    const result = await syncGitHubStatsFromGitHub(
      admin ? admin.force : reason === "cron" ? "daily" : false,
      { lock: admin?.lock, onlyIfStale: reason === "startup" },
    );

    if (!result) {
      logger.debug(`GitHub sync (${reason}) skipped: Data is fresh.`);
      return;
    }

    logger.info(`GitHub sync (${reason}) success`, {
      itemsSynced:
        typeof result === "object" && result && "issueCount" in result ? result.issueCount : 0,
      syncedAt:
        typeof result === "object" && result && "syncedAt" in result ? result.syncedAt : new Date(),
    });
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) {
      logger.debug(`GitHub sync (${reason}) locked by another instance. Skipping.`);
      return;
    }

    // GITHUB_OWNER/GITHUB_REPO/GITHUB_TOKEN unset: said once, not on every tick (V-058).
    if (error instanceof ApiError && error.statusCode === 503) {
      if (!warnedNotConfigured) logger.warn(`GitHub sync skipped: ${error.message}`);
      warnedNotConfigured = true;
      return;
    }

    logger.error(`GitHub sync (${reason}) failed`, {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Runs an admin-triggered sync after its request has answered 202, holding the lock the request
 * took. Tracked like the scheduled runs, so shutdown waits for it. The outcome lands on the sync
 * row (`lastSyncStatus`, `lastError`), which `GET /admin/system/github` reports.
 */
export function runGitHubSyncInBackground(lock: JobLock, force: boolean): void {
  runs.track(runGitHubSync("admin", { lock, force }));
}

/** Whether startGitHubSyncJob schedules anything; `/health/jobs` reports the job disabled otherwise. */
export function isGitHubSyncJobEnabled(): boolean {
  return config.github.syncEnabled && isGitHubIssueSyncConfigured();
}

export function startGitHubSyncJob() {
  const { syncEnabled, syncCron, syncTimezone } = config.github;

  if (!syncEnabled) {
    logger.warn("GitHub sync is disabled in config.");
    return;
  }

  // GITHUB_OWNER/GITHUB_REPO/GITHUB_TOKEN unset: every tick would fail the same way (V-058).
  if (!isGitHubSyncJobEnabled()) {
    logger.warn(
      "GitHub sync is not scheduled: GITHUB_OWNER/GITHUB_REPO/GITHUB_TOKEN are not all configured.",
    );
    return;
  }

  if (job) return;

  job = cron.schedule(syncCron, () => runs.track(runGitHubSync("cron")), {
    timezone: syncTimezone,
  });

  logger.debug("GitHub sync cron started", { schedule: syncCron });

  runs.track(runGitHubSync("startup"));
}

/** Stops scheduling and resolves once the sync in progress, if any, has finished. */
export async function stopGitHubSyncJob(): Promise<void> {
  if (job) {
    await job.stop();
    job = null;

    logger.info("GitHub sync cron stopped.");
  }

  return runs.idle();
}
