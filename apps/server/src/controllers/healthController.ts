import { NextFunction, Request, Response } from "express";

import { config } from "#config";

import { prisma, pool } from "#lib/prisma";
import { logger } from "#lib/logger";
import { getRedis } from "#lib/redis";
import { getJobLastSuccess, getJobsBaseline, jobStatuses, renderMetrics } from "#lib/metrics";
import { createErrorResponse, createSuccessResponse } from "#lib/errors";
import { getExtractQueueStats } from "#services/ats/extractPool";
import { matchesSharedSecret } from "#utils/requestIp";
import { enabledJobs } from "#jobs/scheduledJobs";
import { billingIncidentCounts } from "#services/operatorAlerts";

/** Per-dependency bound for `/ready` (V-096): a probe must fail fast, not wait on the pool's 30 s. */
const READY_CHECK_TIMEOUT_MS = 2_000;

type DependencyStatus = "connected" | "timeout" | "error";

class DependencyTimeoutError extends Error {}

/**
 * Resolves to the dependency's status. Never rejects, and always clears its timer, so a probe
 * leaves nothing behind on the event loop.
 */
async function checkDependency(
  name: string,
  check: () => Promise<unknown>,
): Promise<DependencyStatus> {
  let timer: NodeJS.Timeout | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new DependencyTimeoutError(`${name} check timed out`)),
      READY_CHECK_TIMEOUT_MS,
    );
    timer.unref();
  });

  try {
    // `check` is invoked inside the try so a synchronous throw (getRedis when not ready) is caught.
    await Promise.race([Promise.resolve().then(check), timeout]);
    return "connected";
  } catch (error) {
    if (error instanceof DependencyTimeoutError) {
      logger.warn(`Readiness check: ${name} timed out after ${READY_CHECK_TIMEOUT_MS} ms`);
      return "timeout";
    }

    // Logged server-side only; the message can carry a connection string, so it never reaches the body.
    logger.error(`Readiness check: ${name} failed`, error);
    return "error";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The `SELECT 1` still in flight, if any. The timeout above answers the probe but cannot take the
 * query back out of the pool's queue, so on a saturated pool every probe used to leave one more
 * queued query behind. While one is outstanding, later probes wait on that same query instead.
 *
 * The shared wait is bounded as well: a connection that hangs for good never settles its query,
 * and every later probe would wait on it and report the database down long after it recovered.
 * After READY_CHECK_TIMEOUT_MS the slot is cleared and the probe fails as a timeout, so the next
 * one starts fresh: at most one abandoned query per timeout window, not one per probe.
 */
let databaseProbe: Promise<unknown> | null = null;

function probeDatabase(): Promise<unknown> {
  if (databaseProbe) return databaseProbe;

  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new DependencyTimeoutError("database check timed out")),
      READY_CHECK_TIMEOUT_MS,
    );
    timer.unref();
  });

  const probe: Promise<unknown> = Promise.race([
    Promise.resolve().then(() => prisma.$queryRaw`SELECT 1`),
    timeout,
  ]).finally(() => {
    clearTimeout(timer);
    if (databaseProbe === probe) databaseProbe = null;
  });
  databaseProbe = probe;

  return probe;
}

export class HealthController {
  /**
   * Lightweight liveness endpoint.
   * Does not touch external dependencies, so uptime checks do not wake database compute.
   */

  static async check(_req: Request, res: Response) {
    res.json(
      createSuccessResponse(
        {
          status: "ok",
          timestamp: new Date().toISOString(),
        },
        "Server is healthy",
      ),
    );
  }

  /**
   * Comprehensive readiness endpoint.
   * Verifies connectivity to the database and Redis for manual/deploy-time checks.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async ready(_req: Request, res: Response) {
    // Checked in parallel, each bounded at READY_CHECK_TIMEOUT_MS, so the probe answers in ~2 s worst case.
    const [database, redis] = await Promise.all([
      checkDependency("database", probeDatabase),
      checkDependency("redis", () => getRedis().ping()),
    ]);

    if (database === "connected" && redis === "connected") {
      res.json(
        createSuccessResponse(
          {
            status: "ok",
            database,
            redis,
            timestamp: new Date().toISOString(),
          },
          "Server is healthy",
        ),
      );
      return;
    }

    res.status(503).json(createErrorResponse(503, "Service Unavailable", { database, redis }));
  }

  /**
   * Gate for the operator endpoints: `x-internal-key` must equal INTERNAL_API_KEY (compared in
   * constant time). With no key configured the endpoints do not exist (404).
   */
  static requireInternalKey(req: Request, res: Response, next: NextFunction) {
    if (!config.internal.apiKey) {
      res.status(404).json(createErrorResponse(404, "Not Found"));
      return;
    }
    if (!matchesSharedSecret(req.headers["x-internal-key"], config.internal.apiKey)) {
      res.status(401).json(createErrorResponse(401, "Unauthorized"));
      return;
    }
    next();
  }

  /** Prometheus text for this worker only; a scraper sees one worker per request. */
  static metrics(_req: Request, res: Response) {
    const extract = getExtractQueueStats();
    const body = renderMetrics([
      {
        name: "db_pool_connections",
        help: "This worker's pg pool: open connections, idle ones, and callers waiting for one.",
        samples: [
          ['state="total"', pool.totalCount],
          ['state="idle"', pool.idleCount],
          ['state="waiting"', pool.waitingCount],
        ],
      },
      {
        name: "ats_extract_queue_depth",
        help: "Resume extractions queued behind the running one; new ones get 503 at the max.",
        samples: [["", extract.depth]],
      },
      {
        name: "ats_extract_queue_max",
        help: "Queue depth at which resume extractions are refused.",
        samples: [["", extract.max]],
      },
      {
        name: "ats_extract_in_flight",
        help: "Resume extractions running now (0 or 1 per worker).",
        samples: [["", extract.inFlight]],
      },
      {
        name: "process_uptime_seconds",
        help: "Seconds since this worker started.",
        samples: [["", Math.round(process.uptime())]],
      },
    ]);
    res.type("text/plain; version=0.0.4; charset=utf-8").send(body);
  }

  /**
   * Last success per background job (V-059), shared across workers through Redis. A job is stale
   * when it has not succeeded within twice its schedule interval, or has never succeeded and twice
   * the interval has passed since the jobs baseline (the first boot). A job the
   * configuration does not schedule is reported `enabled: false` and never counts as stale.
   *
   * `billing` counts the money incidents still open (V-371): dead-lettered webhooks not yet
   * replayed and events processed with a note for a person in the last day. `attention` is true
   * while either is non-zero, so the uptime check can alert on it as it does on `stale`.
   */
  static async jobs(_req: Request, res: Response) {
    const [lastSuccess, baseline, billing] = await Promise.all([
      getJobLastSuccess(),
      getJobsBaseline(),
      billingIncidentCounts().catch((error: unknown) => {
        logger.error("Health jobs: could not count billing incidents", error);
        return null;
      }),
    ]);
    const jobs = jobStatuses(lastSuccess, enabledJobs(), baseline);
    const attention = Boolean(billing && (billing.failedWebhooks > 0 || billing.notedWebhooks > 0));
    res.json(
      createSuccessResponse(
        { stale: jobs.some((job) => job.stale), attention, billing, jobs },
        "Job status",
      ),
    );
  }
}
