import cron, { ScheduledTask } from "node-cron";
import { randomUUID } from "node:crypto";

import { logger } from "#utils/logger";
import { getRedis } from "#utils/redis";

import { ShareService } from "#services/shareService";
import { PortfolioService } from "#services/portfolioService";

let job: ScheduledTask | null = null;
const releaseLockLuaScript = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  end
  return 0
`;

async function runFlush(reason: "startup" | "cron") {
  const redis = getRedis();
  const lockKey = "views:flush:lock";
  const lockTTL = 60 * 5; // 5 minutes
  const lockValue = randomUUID();

  let lockAcquired = false;

  try {
    const lockResult = await redis.set(lockKey, lockValue, {
      NX: true,
      EX: lockTTL,
    });

    lockAcquired = lockResult === "OK";

    if (!lockAcquired) {
      logger.warn(`Skipping views flush (${reason}): lock already held`);
      return;
    }

    // 1. Flush Portfolio Views
    const dateKeys = await PortfolioService.getPendingViewDates();
    let flushedPortfolioViews = 0;

    for (const dateKey of dateKeys) {
      const result = await PortfolioService.flushViewsForDate(dateKey);
      flushedPortfolioViews += result.flushedCount;
    }

    // 2. Flush Share Views
    const shareFlushResult = await ShareService.flushShareViews();

    if (
      flushedPortfolioViews > 0 ||
      (shareFlushResult && (shareFlushResult.flushedViews > 0 || shareFlushResult.flushedLinks > 0))
    ) {
      logger.info(`Views flush (${reason}) completed`, {
        flushedPortfolioViews,
        flushedShareViews: shareFlushResult?.flushedViews ?? 0,
        flushedShareLinks: shareFlushResult?.flushedLinks ?? 0,
      });
    }
  } catch (error) {
    logger.error(`Views flush (${reason}) failed`, {
      error: error instanceof Error ? error.message : error,
    });
  } finally {
    if (lockAcquired)
      await redis
        .eval(releaseLockLuaScript, { keys: [lockKey], arguments: [lockValue] })
        .catch((err) => logger.error("Failed to release views flush lock", err));
  }
}

export function startViewsFlushJob() {
  if (job) return;

  // Run every 10 minutes
  job = cron.schedule("*/10 * * * *", () => {
    void runFlush("cron");
  });

  logger.info("Views flush job scheduled (every 10 minutes)");

  // Check on startup
  void runFlush("startup");
}

export function stopViewsFlushJob() {
  if (job) {
    job.stop();
    job = null;
    logger.info("Views flush job stopped");
  }
}
