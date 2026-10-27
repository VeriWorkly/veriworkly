import cluster from "node:cluster";

import pg from "pg";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { config, isProduction } from "#config";

import { logger } from "./logger.js";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * A transaction left open by a crashed request would otherwise hold its locks and a pool slot
 * until the TCP connection dies. Opt-in, with no default: pg sends this as a startup parameter,
 * and a pooler such as Neon's PgBouncer can refuse unknown ones ("unsupported startup
 * parameter"), failing every connection. Behind a pooler, set it on the role instead (README,
 * "Database connections").
 */
export function idleInTransactionTimeoutOption(env: NodeJS.ProcessEnv = process.env): {
  idle_in_transaction_session_timeout?: number;
} {
  const ms = parsePositiveInt(env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS, 0);
  return ms > 0 ? { idle_in_transaction_session_timeout: ms } : {};
}

/**
 * The pool is per-process, but we run one process per cluster worker — so the number that has to
 * fit inside Postgres's `max_connections` is `poolMax * workers`, not `poolMax`. Sizing the pool
 * per-process (the obvious reading) silently overcommits the database: at the old default of 30
 * a 4-vCPU box opened 120 connections against a stock `max_connections` of 100 and every worker
 * failed at once on the first traffic spike.
 *
 * So the budget is expressed cluster-wide and divided down. `DB_POOL_MAX_TOTAL` defaults to 80,
 * leaving headroom under a stock Postgres for migrations, `db:studio`, and an admin psql session.
 * Raise it to roughly 80% of your instance's real `max_connections`.
 * The budget is per process (one pm2 app, one compose replica): when several run against one
 * database, as the two pm2 copies in `ecosystem.config.cjs` do, their budgets must add up to it,
 * which is why each copy sets its own `DB_POOL_MAX_TOTAL` there.
 */
// Read defensively: this is a sizing hint, and the database layer must not fail to load because
// of it. Falling back to a single worker only ever under-commits the pool, which degrades
// throughput rather than taking the process down.
const clusterWorkerCount =
  config.server?.clusteringEnabled && config.server.workers > 0 ? config.server.workers : 1;

const clusterPoolBudget = parsePositiveInt(process.env.DB_POOL_MAX_TOTAL, isProduction ? 80 : 10);

type PoolBudgetInput = {
  workers: number;
  budget: number;
  explicitPoolMax: number | undefined;
  production: boolean;
};

/**
 * Per-worker pool size from the cluster-wide budget (V-115). An explicit DB_POOL_MAX still wins —
 * some deployments sit behind PgBouncer in transaction mode and can safely exceed the
 * direct-connection budget — and is only warned about. A derived size that still overcommits
 * (the floor of 2 per worker against a tiny budget) refuses to boot in production, because that
 * is a misconfiguration nobody chose.
 */
export function resolvePoolBudget({
  workers,
  budget,
  explicitPoolMax,
  production,
}: PoolBudgetInput) {
  const poolMax = explicitPoolMax ?? Math.max(2, Math.floor(budget / workers));
  const total = poolMax * workers;
  const overcommitted = total > budget;

  if (overcommitted && production && explicitPoolMax === undefined)
    throw new Error(
      `Database pool overcommitted: ${workers} workers x ${poolMax} connections = ${total} ` +
        `exceeds DB_POOL_MAX_TOTAL=${budget}. Raise DB_POOL_MAX_TOTAL (keep it under Postgres ` +
        "max_connections divided by replicas), lower WEB_CONCURRENCY, or set DB_POOL_MAX " +
        "explicitly when a connection pooler sits in front.",
    );

  return { poolMax, total, overcommitted };
}

const explicitPoolMax = process.env.DB_POOL_MAX
  ? parsePositiveInt(process.env.DB_POOL_MAX, 0) || undefined
  : undefined;

const budget = resolvePoolBudget({
  workers: clusterWorkerCount,
  budget: clusterPoolBudget,
  explicitPoolMax,
  production: isProduction,
});

export const poolMax = budget.poolMax;

// This module loads in the master before any worker forks, so the line appears once per boot
// (and once more per worker only when something is wrong).
if (budget.overcommitted) {
  logger.warn(
    "Database pool is overcommitted: DB_POOL_MAX * workers exceeds DB_POOL_MAX_TOTAL. " +
      "Expect 'too many connections' under load unless a connection pooler sits in front.",
    {
      poolMax,
      workers: clusterWorkerCount,
      totalConnections: budget.total,
      budget: clusterPoolBudget,
    },
  );
} else if (cluster.isPrimary) {
  logger.info(
    `Database connection budget: ${clusterWorkerCount} workers x ${poolMax} = ${budget.total} of DB_POOL_MAX_TOTAL=${clusterPoolBudget}`,
  );
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: poolMax,
  // Shows up in pg_stat_activity, so a connection can be traced to its worker (V-115).
  application_name: `veriworkly-api-w${cluster.worker?.id ?? 1}`,
  ...idleInTransactionTimeoutOption(),
  idleTimeoutMillis: parsePositiveInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 15_000),
  connectionTimeoutMillis: parsePositiveInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 30_000),
  statement_timeout: parsePositiveInt(process.env.DB_POOL_STATEMENT_TIMEOUT_MS, 30_000),
  allowExitOnIdle: true,
});

pool.on("error", (err) => {
  logger.error("Unexpected database connection pool error", err);
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (!isProduction) globalForPrisma.prisma = prisma;

export async function closePrisma() {
  try {
    await prisma.$disconnect();
    await pool.end();
  } catch (error) {
    logger.error("Error closing Prisma connections", error);
  }
}
