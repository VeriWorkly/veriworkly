import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { config } from "#config";

import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { acquireJobLock } from "#lib/jobLock";
import { cacheDel, cacheGet, cacheSet, getRedis } from "#lib/redis";

/**
 * List of officially tracked events to ensure consistency.
 */

export const KNOWN_EVENTS = [
  "resume_created",
  "resume_deleted",
  "resume_exported",
  // Cover letter exports were previously untracked entirely — only the resume toolbar
  // emitted an event. Kept as its own name rather than folded into `resume_exported` so
  // the existing metric's history stays comparable.
  "cover_letter_exported",
  "auth_otp_sent",
  "auth_login_success",
  "dashboard_opened",
  "roadmap_viewed",
  "share_link_created",
  "share_link_updated",
  "share_link_revoked",
] as const;

type KnownEvent = (typeof KNOWN_EVENTS)[number];

interface UsageIncrementPayload {
  event: string;
  value?: number;
}

/**
 * Helper to generate a YYYY-MM-DD string key for Redis.
 */

function toDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Converts a YYYY-MM-DD string back to a UTC Date object for Prisma.
 */

function fromDateKeyToUtcDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/**
 * Generates a Redis key for the daily usage hash.
 */

function usageRedisKey(dateKey: string) {
  return `usage:daily:${dateKey}`;
}

/**
 * Sanitizes and normalizes event names.
 */

function toEventField(event: string) {
  const normalized = event.trim().toLowerCase().replace(/\s+/g, "_");

  if ((KNOWN_EVENTS as readonly string[]).includes(normalized)) {
    return normalized as KnownEvent;
  }

  return normalized.startsWith("custom_") ? normalized : `custom_${normalized}`;
}

/**
 * Validates and constrains the increment value (1 to 1000).
 */

function sanitizeIncrementValue(value?: number) {
  const numeric = Math.floor(Number(value ?? 1));
  return isFinite(numeric) ? Math.max(1, Math.min(1000, numeric)) : 1;
}

/**
 * Atomic increment of a metric in Redis with a rolling expiration.
 * * payload: Contains the event name and optional increment value.
 */

export async function incrementUsageMetric(
  payload: UsageIncrementPayload,
  options: { allowCustom?: boolean } = {},
) {
  const redis = getRedis();

  const event = toEventField(payload.event);
  const amount = sanitizeIncrementValue(payload.value);

  const dateKey = toDateKey();
  const key = usageRedisKey(dateKey);

  const ttl = Math.max(1, config.metrics.redisRetentionDays) * 24 * 60 * 60;

  if (!(KNOWN_EVENTS as readonly string[]).includes(event)) {
    if (!options.allowCustom) throw new ApiError(400, `Event '${payload.event}' is not allowed.`);
    await reserveCustomEventName(dateKey, event);
  }

  await redis.multi().hIncrBy(key, event, amount).expire(key, ttl).exec();
}

/**
 * At most this many distinct `custom_*` names per UTC day (V-024). Each name becomes a field in
 * `usage:daily:*` and a `UsageMetricDaily` row, so without a cap one caller can grow both
 * without bound.
 */
export const MAX_CUSTOM_EVENTS_PER_DAY = 50;

/** Kept outside `usage:daily:*` so the flush job's key scan never treats it as metric data. */
function customEventsRedisKey(dateKey: string) {
  return `usage:custom-events:${dateKey}`;
}

/**
 * Admits `event` into today's set of custom names, or throws 429 when it would be the 51st.
 * `SADD` then `SCARD` in one `MULTI`: a name over the cap is removed again, so concurrent
 * newcomers can't push the set past the cap.
 */
async function reserveCustomEventName(dateKey: string, event: string) {
  const redis = getRedis();
  const key = customEventsRedisKey(dateKey);

  const [added, size] = (await redis
    .multi()
    .sAdd(key, event)
    .sCard(key)
    .expire(key, 2 * 24 * 60 * 60)
    .exec()) as unknown as [number, number, number];

  if (Number(added) === 1 && Number(size) > MAX_CUSTOM_EVENTS_PER_DAY) {
    await redis.sRem(key, event);
    throw new ApiError(
      429,
      `At most ${MAX_CUSTOM_EVENTS_PER_DAY} distinct custom events can be recorded per day.`,
    );
  }
}

/**
 * Retrieve all metrics stored in Redis for a specific date.
 */

export async function getUsageSnapshotForDate(date = new Date()) {
  const redis = getRedis();
  const key = usageRedisKey(toDateKey(date));

  return redis.hGetAll(key);
}

export async function getPendingUsageMetricDates() {
  const redis = getRedis();
  const dates = new Set<string>();

  for await (const keys of redis.scanIterator({ MATCH: "usage:daily:*", COUNT: 100 })) {
    for (const key of keys) {
      const match = /^usage:daily:(\d{4}-\d{2}-\d{2})(?::processing)?$/.exec(key);

      if (match) dates.add(match[1]);
    }
  }

  return [...dates].sort();
}

/**
 * Moves metrics from Redis to Postgres in a single transaction.
 * * date: The date for which metrics should be persisted.
 * * returns: Metadata about the flushed records.
 */

const FLUSH_LOCK_TTL_SECONDS = 120;
/** Well inside the flush lock's TTL, so the lock can't expire under a still-running flush. */
const FLUSH_TRANSACTION_TIMEOUT_MS = 30_000;

export async function flushUsageMetricsForDate(date: Date) {
  const redis = getRedis();

  const dateKey = toDateKey(date);
  const key = usageRedisKey(dateKey);
  const processingKey = `${key}:processing`;
  const batchKey = `${processingKey}:batch-id`;
  const lockKey = `${key}:flush-lock`;

  // Serialize flush attempts for this date so a manual admin retry overlapping the cron tick (or
  // a rolling deploy briefly running two worker processes) can't both compute a pre-transaction
  // entry count and then have one of them silently discard data on a unique-constraint rollback.
  // A token lock, renewed while the flush runs and released by compare-and-delete (V-127).
  const lock = await acquireJobLock(lockKey, { ttlMs: FLUSH_LOCK_TTL_SECONDS * 1000 });

  if (!lock) {
    return { dateKey, flushedEvents: 0, skipped: true as const };
  }

  try {
    if ((await redis.exists(processingKey)) === 0) {
      try {
        await redis.rename(key, processingKey);
      } catch (error) {
        if (error instanceof Error && error.message.includes("no such key"))
          return { dateKey, flushedEvents: 0 };

        throw error;
      }
    }

    const snapshot = await redis.hGetAll(processingKey);
    const entries = Object.entries(snapshot).sort(([left], [right]) => left.localeCompare(right));

    if (entries.length === 0) {
      await redis.del(processingKey);
      return { dateKey, flushedEvents: 0 };
    }

    const metricDate = fromDateKeyToUtcDate(dateKey);
    await redis.set(batchKey, randomUUID(), { NX: true });
    const batchId = await redis.get(batchKey);

    if (!batchId) throw new Error(`Failed to initialize usage metrics batch for ${dateKey}`);

    try {
      const events = entries.map(([event]) => event);
      const counts = entries.map(([, rawCount]) => parseInt(rawCount, 10) || 0);
      const ids = entries.map(() => randomUUID());

      // One upsert statement for the whole field set instead of one round trip per event inside
      // an interactive transaction with Prisma's 5 s default timeout, which a large field set
      // overran on every run, leaving that date's `:processing` key undrained (V-024).
      await prisma.$transaction(
        async (tx) => {
          await tx.usageMetricFlushBatch.create({
            data: { id: batchId, date: metricDate },
          });

          await tx.$executeRaw`
            INSERT INTO "UsageMetricDaily" ("id", "date", "event", "count", "createdAt", "updatedAt")
            SELECT row.id, CAST(${dateKey} AS timestamp(3)), row.event, row.count, NOW(), NOW()
            FROM unnest(${ids}::text[], ${events}::text[], ${counts}::int[]) AS row(id, event, count)
            ON CONFLICT ("date", "event")
            DO UPDATE SET "count" = "UsageMetricDaily"."count" + EXCLUDED."count",
                          "updatedAt" = NOW()
          `;
        },
        { timeout: FLUSH_TRANSACTION_TIMEOUT_MS },
      );
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
        throw error;
      }

      // We hold the per-date flush lock, so a batch-id collision can only mean a prior attempt
      // already committed this exact batch before crashing without cleaning up Redis. Confirm
      // that rather than assuming it — otherwise a genuine failure here would still report
      // success below while the buffered data is gone.
      const existingBatch = await prisma.usageMetricFlushBatch.findUnique({
        where: { id: batchId },
      });

      if (!existingBatch) throw error;
    }

    // The batch is committed. If the lock was lost meanwhile, another runner may already be
    // reading `:processing`; deleting it and the batch id under them would let them commit the
    // same counts again under a fresh id. They finish the cleanup (their retry hits the batch
    // row and confirms it); this run only reports what it flushed.
    if (!(await lock.stillOwner())) {
      logger.warn(
        "Usage flush lost its lock after committing; leaving Redis cleanup to the holder",
        {
          dateKey,
        },
      );
      return { dateKey, flushedEvents: entries.length };
    }

    await redis.del([processingKey, batchKey]);
    await cacheDel(ADMIN_DASHBOARD_TOTALS_CACHE_KEY);

    return { dateKey, flushedEvents: entries.length };
  } finally {
    await lock.release();
  }
}

/**
 * Aggregates real-time Redis data with historical Postgres data for Admin Dashboard.
 * * returns: A comprehensive snapshot of today's and all-time metrics.
 */

/**
 * The Postgres side of the admin dashboard: the all-time sums of flushed days. Only this is
 * cached (V-336); today's counters are one `HGETALL` read fresh on every request, so the "today"
 * numbers move as events land instead of freezing for the cache's 30 minutes. Cleared by the
 * daily flush, which is the only thing that changes these sums.
 */
export const ADMIN_DASHBOARD_TOTALS_CACHE_KEY = "admin:dashboard:totals";

async function flushedTotals(): Promise<Record<string, number>> {
  const cached = await cacheGet<Record<string, number>>(ADMIN_DASHBOARD_TOTALS_CACHE_KEY);
  if (cached) return cached;

  const totals = await prisma.usageMetricDaily.groupBy({
    by: ["event"],
    _sum: { count: true },
  });
  const postgresTotals = Object.fromEntries(totals.map((row) => [row.event, row._sum.count ?? 0]));
  await cacheSet(ADMIN_DASHBOARD_TOTALS_CACHE_KEY, postgresTotals, 1800);
  return postgresTotals;
}

export async function getAdminDashboardMetrics() {
  const [todaySnapshot, postgresTotals] = await Promise.all([
    getUsageSnapshotForDate(new Date()),
    flushedTotals(),
  ]);

  const allEvents = new Set([...Object.keys(todaySnapshot), ...Object.keys(postgresTotals)]);
  const combinedTotals: Record<string, number> = {};

  allEvents.forEach((event) => {
    const todayCount = parseInt(todaySnapshot[event] ?? "0", 10);
    const historicalCount = postgresTotals[event] ?? 0;
    combinedTotals[event] = todayCount + historicalCount;
  });

  return {
    generatedAt: new Date().toISOString(),
    today: todaySnapshot,
    totals: combinedTotals,
  };
}
