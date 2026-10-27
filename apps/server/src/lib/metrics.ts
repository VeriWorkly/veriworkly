import type { NextFunction, Request, Response } from "express";

import { getRedis } from "#lib/redis";

/**
 * In-process metrics, rendered in the Prometheus text format by `GET /api/v1/health/metrics`.
 *
 * Everything here lives in this worker's memory: a scrape answers with the numbers of whichever
 * worker took the request, so scrape often and aggregate with `sum`/`histogram_quantile` over
 * time rather than reading a single sample as the whole process. The exception is the job
 * last-success times, which are also written to Redis because a job runs on one worker per tick.
 */

/** Seconds. Covers a cached read (~5 ms) through the 30 s statement timeout. */
const BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30];

type Histogram = { counts: number[]; sum: number; count: number };

function newHistogram(): Histogram {
  return { counts: BUCKETS.map(() => 0), sum: 0, count: 0 };
}

function observe(histogram: Histogram, seconds: number) {
  histogram.sum += seconds;
  histogram.count += 1;
  for (let i = 0; i < BUCKETS.length; i += 1) if (seconds <= BUCKETS[i]) histogram.counts[i] += 1;
}

/** Keyed by the JSON of the label values, so the label order is fixed per family. */
const httpDurations = new Map<string, Histogram>();
const redisDurations = new Map<string, Histogram>();

function observeInto(family: Map<string, Histogram>, labels: string[], seconds: number) {
  const key = JSON.stringify(labels);
  let histogram = family.get(key);
  if (!histogram) {
    histogram = newHistogram();
    family.set(key, histogram);
  }
  observe(histogram, seconds);
}

/**
 * The matched route pattern (`/api/v1/users/:username/availability`), never the raw path, so the
 * label set stays bounded by the route table. When a handler passes an error on, Express has
 * already restored `req.baseUrl` to the app level, so the mount prefix is recovered from the
 * request path by dropping as many trailing segments as the route pattern has.
 */
function routeLabel(req: Request): string {
  const routePath: unknown = req.route?.path;
  if (typeof routePath !== "string")
    return routePath ? `${req.baseUrl}${String(routePath)}` : "unmatched";
  if (routePath.includes("*") || routePath.includes("(")) return `${req.baseUrl}${routePath}`;

  const pattern = routePath.replace(/\/+$/, "");
  const patternSegments = pattern.split("/").filter(Boolean).length;
  const pathSegments = (req.originalUrl.split("?")[0] ?? "").split("/").filter(Boolean);
  const prefixSegments = pathSegments.slice(0, Math.max(0, pathSegments.length - patternSegments));
  const prefix = prefixSegments.length ? `/${prefixSegments.join("/").toLowerCase()}` : "";

  return `${prefix}${pattern}` || "/";
}

/** One middleware line in `app.ts`, ahead of everything that can answer a request. */
export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.once("finish", () => {
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    observeInto(
      httpDurations,
      [req.method, routeLabel(req), `${Math.floor(res.statusCode / 100)}xx`],
      seconds,
    );
  });
  next();
}

/** Times one Redis command (whether it resolves or rejects) under `command`. */
export async function timeRedis<T>(command: string, work: Promise<T>): Promise<T> {
  const start = process.hrtime.bigint();
  try {
    return await work;
  } finally {
    observeInto(redisDurations, [command], Number(process.hrtime.bigint() - start) / 1e9);
  }
}

/**
 * Schedules in seconds, by job name. `/health/jobs` calls a job stale when its last success is
 * older than twice this. The names are the ones the job lock records success under.
 */
export const JOB_SCHEDULES = {
  "views-flush": 10 * 60,
  "usage-metrics": 24 * 3600,
  "github-sync": 12 * 3600,
  "changelog-sync": 24 * 3600,
  "portfolio-access": 3600,
  "credit-sweep": 3600,
  "annual-credits": 3600,
  retention: 24 * 3600,
} as const satisfies Record<string, number>;

export type JobName = keyof typeof JOB_SCHEDULES;

/** Redis hash: job name to the epoch ms of its last success, shared by every worker and replica. */
export const JOB_LAST_SUCCESS_KEY = "jobs:last-success";
/**
 * Every key expires (V-320), this one too: refreshed on each success, so it only lapses when no
 * job has succeeded for a month, which `/health/jobs` reports as stale anyway.
 */
const JOB_LAST_SUCCESS_TTL_SECONDS = 30 * 24 * 3600;

const jobSuccesses = new Map<string, number>();

/**
 * Called once a locked job run finishes without throwing. Recorded in memory and, best effort,
 * in Redis, so whichever worker answers `/health/jobs` sees the run.
 */
export function recordJobSuccess(name: string, at: number = Date.now()) {
  jobSuccesses.set(name, Math.max(at, jobSuccesses.get(name) ?? 0));
  try {
    getRedis()
      .multi()
      .hSet(JOB_LAST_SUCCESS_KEY, name, String(at))
      .expire(JOB_LAST_SUCCESS_KEY, JOB_LAST_SUCCESS_TTL_SECONDS)
      .exec()
      .catch(() => undefined);
  } catch {
    // Redis not ready: the in-memory value still covers this worker.
  }
}

/** Last success per job (epoch ms), the later of this worker's memory and Redis. */
export async function getJobLastSuccess(): Promise<Map<string, number>> {
  const merged = new Map(jobSuccesses);
  try {
    const shared = await getRedis().hGetAll(JOB_LAST_SUCCESS_KEY);
    for (const [name, value] of Object.entries(shared)) {
      const at = Number(value);
      if (Number.isFinite(at) && at > (merged.get(name) ?? 0)) merged.set(name, at);
    }
  } catch {
    // Redis down: report what this worker knows.
  }
  return merged;
}

/**
 * When jobs started being scheduled (epoch ms), shared like the successes. A job with no success
 * on record counts as stale only once twice its interval has passed since then, so a fresh
 * deploy (or a flushed Redis) is not reported stale for a day while the daily jobs wait for
 * their first tick. Set once with NX: later boots keep the first one. The TTL keeps the rule that
 * every key expires; an expired baseline is simply set again on the next boot.
 */
export const JOB_BASELINE_KEY = "jobs:baseline";
const JOB_BASELINE_TTL_SECONDS = 30 * 24 * 3600;
const processStartedAt = Date.now() - Math.round(process.uptime() * 1000);

/** Called by every worker at boot; only the first write since the key expired sticks. */
export async function markJobsBaseline(at: number = Date.now()): Promise<void> {
  try {
    await getRedis().set(JOB_BASELINE_KEY, String(at), { NX: true, EX: JOB_BASELINE_TTL_SECONDS });
  } catch {
    // Redis down: getJobsBaseline falls back to this process's start.
  }
}

/** The shared baseline, or this process's start when Redis has none or cannot be read. */
export async function getJobsBaseline(): Promise<number> {
  try {
    const at = Number(await getRedis().get(JOB_BASELINE_KEY));
    if (Number.isFinite(at) && at > 0) return at;
  } catch {
    // Fall through to the process start.
  }
  return processStartedAt;
}

type JobStatus = {
  name: string;
  intervalSeconds: number;
  lastSuccessAt: string | null;
  /** False for a job the configuration does not schedule; such a job is never stale. */
  enabled: boolean;
  stale: boolean;
};

export function jobStatuses(
  lastSuccess: Map<string, number>,
  enabled: ReadonlySet<string>,
  baseline: number,
  now = Date.now(),
): JobStatus[] {
  return Object.entries(JOB_SCHEDULES).map(([name, intervalSeconds]) => {
    const at = lastSuccess.get(name);
    const isEnabled = enabled.has(name);
    const window = 2 * intervalSeconds * 1000;
    return {
      name,
      intervalSeconds,
      lastSuccessAt: at ? new Date(at).toISOString() : null,
      enabled: isEnabled,
      // Never succeeded: overdue only once the window has passed since jobs were first scheduled.
      stale: isEnabled && (at ? now - at > window : now - baseline > window),
    };
  });
}

type Gauge = { name: string; help: string; samples: Array<[string, number]> };

function escapeLabel(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function renderHistogram(
  lines: string[],
  name: string,
  help: string,
  labelNames: string[],
  family: Map<string, Histogram>,
) {
  lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} histogram`);
  for (const [key, histogram] of family) {
    const values = JSON.parse(key) as string[];
    const labels = labelNames.map((label, i) => `${label}="${escapeLabel(values[i])}"`).join(",");
    BUCKETS.forEach((bound, i) =>
      lines.push(`${name}_bucket{${labels},le="${bound}"} ${histogram.counts[i]}`),
    );
    lines.push(`${name}_bucket{${labels},le="+Inf"} ${histogram.count}`);
    lines.push(`${name}_sum{${labels}} ${histogram.sum}`);
    lines.push(`${name}_count{${labels}} ${histogram.count}`);
  }
}

/** Prometheus text exposition (format 0.0.4). Gauges are sampled by the caller at read time. */
export function renderMetrics(gauges: Gauge[]): string {
  const lines: string[] = [];
  renderHistogram(
    lines,
    "http_request_duration_seconds",
    "HTTP request duration by method, matched route pattern and status class.",
    ["method", "route", "status_class"],
    httpDurations,
  );
  renderHistogram(
    lines,
    "redis_command_duration_seconds",
    "Redis command latency, including timeouts and errors.",
    ["command"],
    redisDurations,
  );
  for (const gauge of gauges) {
    lines.push(`# HELP ${gauge.name} ${gauge.help}`, `# TYPE ${gauge.name} gauge`);
    for (const [labels, value] of gauge.samples)
      lines.push(`${gauge.name}${labels ? `{${labels}}` : ""} ${value}`);
  }
  return `${lines.join("\n")}\n`;
}
