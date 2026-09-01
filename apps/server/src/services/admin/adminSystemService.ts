import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { prisma } from "#lib/prisma";
import { logger } from "#lib/logger";
import { cacheDelByPrefix, getRedis } from "#lib/redis";
import { toCreatedAtFilter } from "#validators/admin/adminCommonValidator";

import { getAdminDashboardMetrics, getUsageSnapshotForDate } from "#services/analyticsService";
import { getGitHubStats, syncGitHubStatsFromGitHub } from "#services/github/index";

import type {
  adminCacheFlushSchema,
  adminUsageMetricsQuerySchema,
} from "#validators/admin/adminSystemValidator";
import type { adminRequestLogQuerySchema } from "#validators/admin/adminAuditValidator";

type UsageMetricsQuery = z.infer<typeof adminUsageMetricsQuerySchema>;
type RequestLogQuery = z.infer<typeof adminRequestLogQuerySchema>;
type CacheFlushInput = z.infer<typeof adminCacheFlushSchema>;

/**
 * Redis key prefixes an operator is allowed to flush, mapped from the friendly name exposed by
 * the API. Anything not listed here — session records above all — is unreachable, so a cache
 * flush can never sign every user out.
 */
const FLUSHABLE_PREFIXES: Record<CacheFlushInput["prefix"], string[]> = {
  "portfolio:public": ["portfolio:public"],
  "user:profile": ["user:profile"],
  affiliate: ["affiliate"],
  credits: ["credits"],
  changelog: ["changelog"],
  roadmap: ["roadmap"],
};

/**
 * Dependency check for the admin ops page. Each probe is isolated so one dead dependency
 * reports as degraded instead of failing the whole request — the point of this endpoint is to
 * tell an operator *which* dependency is down.
 */
export async function getSystemHealth() {
  const probe = async (name: string, run: () => Promise<unknown>) => {
    const startedAt = Date.now();

    try {
      await run();
      return { name, status: "ok" as const, latencyMs: Date.now() - startedAt, error: null };
    } catch (error) {
      return {
        name,
        status: "down" as const,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const checks = await Promise.all([
    probe("database", () => prisma.$queryRaw`SELECT 1`),
    probe("redis", () => getRedis().ping()),
  ]);

  return {
    status: checks.every((check) => check.status === "ok") ? "ok" : "degraded",
    checks,
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    memory: {
      rssBytes: process.memoryUsage().rss,
      heapUsedBytes: process.memoryUsage().heapUsed,
    },
    timestamp: new Date().toISOString(),
  };
}

export interface UsageMetricPoint {
  date: string;
  event: string;
  count: number;
}

/**
 * Daily usage metrics for the ops charts. Today's counters still live in Redis (they are
 * flushed to Postgres nightly), so today is read from the live snapshot and appended — without
 * that, the newest bar on every chart is always empty.
 */
export async function getUsageMetrics(query: UsageMetricsQuery) {
  const since = new Date(Date.now() - query.days * 24 * 60 * 60 * 1000);

  const [rows, todaySnapshot, totals] = await Promise.all([
    prisma.usageMetricDaily.findMany({
      where: {
        date: { gte: since },
        ...(query.event ? { event: query.event } : {}),
      },
      orderBy: [{ date: "asc" }, { event: "asc" }],
    }),
    getUsageSnapshotForDate(new Date()),
    prisma.usageMetricDaily.groupBy({
      by: ["event"],
      _sum: { count: true },
      ...(query.event ? { where: { event: query.event } } : {}),
    }),
  ]);

  const todayKey = new Date().toISOString().slice(0, 10);

  const historical = rows as Array<{ date: Date; event: string; count: number }>;
  const eventTotals = totals as Array<{ event: string; _sum: { count: number | null } }>;

  const series: UsageMetricPoint[] = [
    ...historical.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      event: row.event,
      count: row.count,
    })),
    ...Object.entries(todaySnapshot)
      .filter(([event]) => !query.event || event === query.event)
      .map(([event, count]) => ({
        date: todayKey,
        event,
        // Redis hash values come back as strings; a malformed field must not become NaN.
        count: Number.parseInt(String(count), 10) || 0,
      })),
  ];

  const events = [...new Set(series.map((point) => point.event))].sort();

  return {
    days: query.days,
    events,
    series,
    totals: Object.fromEntries(eventTotals.map((row) => [row.event, row._sum.count ?? 0])),
  };
}

export async function getDashboardMetrics() {
  return getAdminDashboardMetrics();
}

export async function getGithubSyncStatus() {
  const [stats, latest, itemCounts] = await Promise.all([
    getGitHubStats(),
    prisma.gitHubSync.findFirst({
      orderBy: { syncedAt: "desc" },
      select: {
        id: true,
        projectName: true,
        projectUrl: true,
        lastSyncStatus: true,
        lastError: true,
        nextSyncAt: true,
        syncedAt: true,
        issueCount: true,
        prCount: true,
        todoCount: true,
        inProgressCount: true,
        doneCount: true,
      },
    }),
    prisma.gitHubSyncItem.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return {
    stats,
    latestSync: latest,
    itemsByStatus: Object.fromEntries(itemCounts.map((row) => [row.status, row._count._all])),
  };
}

export async function triggerGithubSync(force = false) {
  return syncGitHubStatsFromGitHub(force);
}

/**
 * Request-level audit trail (`AuditLog`), distinct from the admin action trail
 * (`AdminAuditEntry`). This is the "what did the API actually serve" view used when
 * diagnosing an incident.
 */
export async function listRequestLogs(query: RequestLogQuery) {
  const statusRange = query.statusClass
    ? {
        status: {
          gte: Number(query.statusClass) * 100,
          lt: (Number(query.statusClass) + 1) * 100,
        },
      }
    : {};

  const where: Prisma.AuditLogWhereInput = {
    ...(query.method ? { method: query.method } : {}),
    ...(query.path ? { path: { contains: query.path, mode: "insensitive" } } : {}),
    ...statusRange,
    ...(query.errorsOnly ? { error: { not: null } } : {}),
    ...(toCreatedAtFilter(query) ?? {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, limit: query.limit, offset: query.offset };
}

export async function flushCache(prefix: CacheFlushInput["prefix"]) {
  const targets = FLUSHABLE_PREFIXES[prefix];

  await Promise.all(targets.map((target) => cacheDelByPrefix(target)));

  logger.info("Admin flushed cache prefix", { prefix, targets });

  return { prefix, targets };
}

/**
 * Background job health. `UsageMetricFlushBatch` and `ViewFlushBatch` record every completed
 * flush, so a stale newest row is the signal that a nightly job has stopped running.
 */
export async function getJobStatus() {
  const [usageFlush, viewFlush, pendingWebhooks, pendingAssets] = await Promise.all([
    prisma.usageMetricFlushBatch.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.viewFlushBatch.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.billingWebhookEvent.count({ where: { status: { in: ["PROCESSING", "FAILED"] } } }),
    prisma.portfolioAsset.count({ where: { status: "PENDING" } }),
  ]);

  return {
    lastUsageMetricFlush: usageFlush,
    lastViewFlush: viewFlush,
    unresolvedWebhookEvents: pendingWebhooks,
    pendingPortfolioAssets: pendingAssets,
  };
}
