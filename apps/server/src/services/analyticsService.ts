import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { config } from "#config";

import { prisma } from "#utils/prisma";
import { cacheDel, cacheGet, cacheSet, getRedis } from "#utils/redis";

/**
 * List of officially tracked events to ensure consistency.
 */

export const KNOWN_EVENTS = [
  "resume_created",
  "resume_deleted",
  "resume_exported",
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

export async function incrementUsageMetric(payload: UsageIncrementPayload) {
  const redis = getRedis();

  const event = toEventField(payload.event);
  const amount = sanitizeIncrementValue(payload.value);

  const key = usageRedisKey(toDateKey());

  const ttl = Math.max(1, config.metrics.redisRetentionDays) * 24 * 60 * 60;

  await redis.multi().hIncrBy(key, event, amount).expire(key, ttl).exec();
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

export async function flushUsageMetricsForDate(date: Date) {
  const redis = getRedis();

  const dateKey = toDateKey(date);
  const key = usageRedisKey(dateKey);
  const processingKey = `${key}:processing`;
  const batchKey = `${processingKey}:batch-id`;

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
    await prisma.$transaction(async (tx) => {
      await tx.usageMetricFlushBatch.create({
        data: { id: batchId, date: metricDate },
      });

      for (const [event, rawCount] of entries) {
        const count = parseInt(rawCount, 10);

        await tx.usageMetricDaily.upsert({
          where: {
            date_event: {
              date: metricDate,
              event,
            },
          },
          create: {
            date: metricDate,
            event,
            count,
          },
          update: {
            count: { increment: count },
          },
        });
      }
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }
  }

  await redis.del([processingKey, batchKey]);
  await cacheDel("admin:dashboard:stats");

  return { dateKey, flushedEvents: entries.length };
}

/**
 * Aggregates real-time Redis data with historical Postgres data for Admin Dashboard.
 * * returns: A comprehensive snapshot of today's and all-time metrics.
 */

export async function getAdminDashboardMetrics() {
  const cacheKey = "admin:dashboard:stats";
  const cached = await cacheGet(cacheKey);

  if (cached) return cached;

  const [todaySnapshot, totals] = await Promise.all([
    getUsageSnapshotForDate(new Date()),
    prisma.usageMetricDaily.groupBy({
      by: ["event"],
      _sum: { count: true },
    }),
  ]);

  const postgresTotals = Object.fromEntries(totals.map((row) => [row.event, row._sum.count ?? 0]));

  const allEvents = new Set([...Object.keys(todaySnapshot), ...Object.keys(postgresTotals)]);
  const combinedTotals: Record<string, number> = {};

  allEvents.forEach((event) => {
    const todayCount = parseInt(todaySnapshot[event] ?? "0", 10);
    const historicalCount = postgresTotals[event] ?? 0;
    combinedTotals[event] = todayCount + historicalCount;
  });

  const response = {
    generatedAt: new Date().toISOString(),
    today: todaySnapshot,
    totals: combinedTotals,
  };

  await cacheSet(cacheKey, response, 1800);
  return response;
}
