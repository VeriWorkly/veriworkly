import cron, { ScheduledTask } from "node-cron";
import { v4 as uuidv4 } from "uuid";

import { config } from "#config";
import { logger } from "#utils/logger";
import { getRedis } from "#utils/redis";

import { flushUsageMetricsForDate, getPendingUsageMetricDates } from "#services/analyticsService";

let job: ScheduledTask | null = null;

const RELEASE_LOCK_LUA_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
  else
      return 0
  end
`;

/**
 * Returns a Date object representing the start of yesterday in UTC.
 * This ensures we only flush complete day cycles.
 */

function getTodayUtcDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Orchestrates the movement of metrics from Redis to Postgres.
 * Uses a distributed lock to ensure only one instance performs the flush.
 */

async function runFlush(reason: "startup" | "cron") {
  const redis = getRedis();

  const lockKey = "usage:flush:lock";
  const lockValue = uuidv4();
  const lockTTL = 60 * 5;

  let lockAcquired = false;

  try {
    const lockResult = await redis.set(lockKey, lockValue, {
      NX: true,
      EX: lockTTL,
    });

    lockAcquired = lockResult === "OK";

    if (!lockAcquired) {
      logger.warn(`Skipping metrics flush (${reason}): lock already held`);
      return;
    }

    const todayKey = getTodayUtcDate().toISOString().slice(0, 10);
    const dateKeys = (await getPendingUsageMetricDates()).filter((dateKey) => dateKey < todayKey);

    if (dateKeys.length === 0) {
      logger.info(`Usage metrics flush (${reason}) skipped: no completed days pending`);
      return;
    }

    for (const dateKey of dateKeys) {
      const result = await flushUsageMetricsForDate(new Date(`${dateKey}T00:00:00.000Z`));

      logger.info(`Usage metrics flush (${reason}) completed`, {
        dateKey: result.dateKey,
        flushedEvents: result.flushedEvents,
      });
    }
  } catch (error) {
    logger.error(`Usage metrics flush (${reason}) failed`, {
      error: error instanceof Error ? error.message : error,
    });
  } finally {
    if (lockAcquired) {
      try {
        await redis.eval(RELEASE_LOCK_LUA_SCRIPT, {
          keys: [lockKey],
          arguments: [lockValue],
        });
      } catch (err) {
        logger.error("Failed to release metrics flush lock", err);
      }
    }
  }
}

/**
 * Schedules the daily metrics flush and runs an initial check on startup.
 */

export function startUsageMetricsJob() {
  const { flushCron, flushTimezone } = config.metrics;

  if (job) return;

  job = cron.schedule(
    flushCron,
    () => {
      void runFlush("cron");
    },
    { timezone: flushTimezone },
  );

  logger.info("Usage metrics flush job scheduled", {
    cron: flushCron,
    timezone: flushTimezone,
  });

  // Check on startup in case the cron was missed during downtime
  void runFlush("startup");
}

/**
 * Cleanly stops the cron job during server shutdown.
 */

export function stopUsageMetricsJob() {
  if (job) {
    job.stop();
    job = null;
    logger.info("Usage metrics flush job stopped");
  }
}
