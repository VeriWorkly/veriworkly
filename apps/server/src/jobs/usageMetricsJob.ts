import cron, { ScheduledTask } from "node-cron";

import { config } from "#config";
import { logger } from "#lib/logger";
import { createRunTracker, withJobLock } from "#lib/jobLock";

import { flushUsageMetricsForDate, getPendingUsageMetricDates } from "#services/analyticsService";

let job: ScheduledTask | null = null;
const runs = createRunTracker();

/**
 * Midnight UTC today. Only dates before it are flushed, so a day is written to Postgres once it
 * is complete and never while its counters are still moving.
 */
function getTodayUtcDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Orchestrates the movement of metrics from Redis to Postgres.
 * Uses the shared job lock (renewed while it runs) so only one instance performs the flush.
 *
 * Never rejects: it is fired from the cron callback, and an unhandled rejection shuts the worker
 * down (V-101). A Redis blip costs one skipped tick and a warning. A failed flush propagates to
 * withJobLock, which logs it and records no success for `/health/jobs`.
 */

export async function runUsageMetricsFlush(reason: "startup" | "cron"): Promise<void> {
  await withJobLock(
    "usage:flush:lock",
    { ttlMs: 5 * 60_000, job: "usage-metrics" },
    async (stillOwner) => {
      const todayKey = getTodayUtcDate().toISOString().slice(0, 10);
      const dateKeys = (await getPendingUsageMetricDates()).filter((dateKey) => dateKey < todayKey);

      if (dateKeys.length === 0) {
        logger.info(`Usage metrics flush (${reason}) skipped: no completed days pending`);
        return;
      }

      // Each day on its own (V-335), as the views flush does (V-068): one day whose counters the
      // database refuses used to end the run there, so every later day waited behind it until
      // its Redis TTL dropped it. The run still fails at the end, so `/health/jobs` sees it.
      const failedDays: string[] = [];
      for (const dateKey of dateKeys) {
        if (!(await stillOwner())) {
          logger.warn(`Usage metrics flush (${reason}) stopped: lock lost to another worker`);
          break;
        }

        try {
          const result = await flushUsageMetricsForDate(new Date(`${dateKey}T00:00:00.000Z`));

          if ("skipped" in result && result.skipped) {
            logger.warn(`Usage metrics flush (${reason}) skipped: another flush is in progress`, {
              dateKey: result.dateKey,
            });
            continue;
          }

          logger.info(`Usage metrics flush (${reason}) completed`, {
            dateKey: result.dateKey,
            flushedEvents: result.flushedEvents,
          });
        } catch (error) {
          failedDays.push(dateKey);
          logger.error(`Usage metrics flush (${reason}) failed for ${dateKey}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (failedDays.length > 0)
        throw new Error(`Usage metrics flush failed for ${failedDays.join(", ")}`);
    },
  );
}

/**
 * Schedules the daily metrics flush and runs an initial check on startup.
 */

export function startUsageMetricsJob() {
  const { flushCron, flushTimezone } = config.metrics;

  if (job) return;

  job = cron.schedule(flushCron, () => runs.track(runUsageMetricsFlush("cron")), {
    timezone: flushTimezone,
  });

  logger.debug("Usage metrics flush job scheduled", {
    cron: flushCron,
    timezone: flushTimezone,
  });

  // Check on startup in case the cron was missed during downtime
  runs.track(runUsageMetricsFlush("startup"));
}

/**
 * Stops scheduling during server shutdown and resolves once the flush in progress, if any, has
 * finished.
 */

export async function stopUsageMetricsJob(): Promise<void> {
  if (job) {
    await job.stop();
    job = null;
    logger.info("Usage metrics flush job stopped");
  }

  return runs.idle();
}
