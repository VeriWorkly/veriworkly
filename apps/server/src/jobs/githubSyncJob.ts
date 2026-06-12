import cron, { ScheduledTask } from "node-cron";

import { config } from "#config";
import { logger } from "#utils/logger";
import { ApiError } from "#utils/errors";

import { shouldSyncGitHubStats, syncGitHubStatsFromGitHub } from "#services/githubService";

let job: ScheduledTask | null = null;

async function runSync(reason: "startup" | "cron") {
  try {
    const needsSync = await shouldSyncGitHubStats();

    if (!needsSync) {
      logger.info(`GitHub sync (${reason}) skipped: Data is fresh.`);
      return;
    }

    const result = await syncGitHubStatsFromGitHub(reason === "cron");

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

    logger.error(`GitHub sync (${reason}) failed`, {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export function startGitHubSyncJob() {
  const { syncEnabled, syncCron, syncTimezone } = config.github;

  if (!syncEnabled) {
    logger.warn("GitHub sync is disabled in config.");
    return;
  }

  if (job) return;

  job = cron.schedule(syncCron, () => void runSync("cron"), { timezone: syncTimezone });

  logger.info("GitHub sync cron started", { schedule: syncCron });

  void runSync("startup");
}

export function stopGitHubSyncJob() {
  if (job) {
    job.stop();
    job = null;

    logger.info("GitHub sync cron stopped.");
  }
}
