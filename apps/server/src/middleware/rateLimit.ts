import { Request, Response, NextFunction } from "express";

import { config } from "#config";

import { logger } from "#lib/logger";
import { getRedis, RedisTimeoutError, withRedisDeadline } from "#lib/redis";
import { timeRedis } from "#lib/metrics";
import { ApiError, createErrorResponse } from "#lib/errors";
import { AI_REQUEST_DEADLINE_MS } from "#services/ats/aiDeadline";
import { addressBucket, getRequestIpDetails, matchesSharedSecret } from "#utils/requestIp";
import { parseIntegerEnv } from "#config/parseEnv";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type BucketResult = { count: number; ttl: number };

// Strict parse: `MAX_MEMORY_ENTRIES=abc` used to give NaN, which made the fallback map unbounded.
const MAX_MEMORY_ENTRIES = parseIntegerEnv(process.env.MAX_MEMORY_ENTRIES, 15000);
/**
 * V-095: the limiter's EVAL sits in front of every request, so a connected but stalled Redis
 * must not stall the API. Past this the request is counted in memory (or 503 for the
 * fail-closed classes). Tighter than the bound `getRedis()` puts on every command, because this
 * wait sits in front of every route.
 */
const REDIS_TIMEOUT_MS = parseIntegerEnv(process.env.RATE_LIMIT_REDIS_TIMEOUT_MS, 400);
/** After this many timeouts in a row the limiter stops asking Redis for `BREAKER_OPEN_MS`. */
const BREAKER_TIMEOUT_THRESHOLD = 3;
const BREAKER_OPEN_MS = 5_000;
const bucket = new Map<string, RateLimitEntry>();

/**
 * V-130: the studio autosaves with `PATCH /documents/:id` and `PUT /profiles/master`. Those take
 * their own class, counted per user after authentication by `autosaveRateLimit`, instead of the
 * generic 100 per 15 min per IP; the IP middleware only counts them in the global bucket.
 */
const AUTOSAVE_WINDOW_MS = 15 * 60 * 1000;
const AUTOSAVE_MAX_REQUESTS = 600;

function isAutosaveRequest(method: string, path: string): boolean {
  return (
    (method === "PATCH" && /^\/api\/v1\/documents\/[^/]+$/.test(path)) ||
    (method === "PUT" && path === "/api/v1/profiles/master")
  );
}

/**
 * Paths that must never be rate limited by client IP. The billing webhook arrives from a small
 * set of provider egress IPs and is already authenticated by HMAC signature — limiting it means a
 * provider retry storm gets 429'd and payment state silently diverges from reality.
 */
/*
 * Health probes (V-096): a load balancer probing from one IP every few seconds would otherwise
 * be 429'd and mark the instance unhealthy, and the liveness probe must not depend on Redis.
 *
 * Entries are lowercase with no trailing slash, matched against `normalizePath`.
 */
const RATE_LIMIT_EXEMPT_PATHS = new Set([
  "/api/v1/billing/webhooks/dodo",
  "/api/v1/health",
  "/api/v1/health/ready",
]);

/**
 * The operator endpoints, polled by a scraper from one address: exempt only when the request
 * carries the valid INTERNAL_API_KEY, so attempts to guess the key stay rate limited.
 */
const INTERNAL_KEY_EXEMPT_PATHS = new Set(["/api/v1/health/metrics", "/api/v1/health/jobs"]);

/**
 * The routes outside `/api/v1/ai` that spend AI credits. They sat in the generic 100/15 min class
 * while `/api/v1/ai/*` had its own 20/min, although each call holds a provider connection for up
 * to the request deadline (V-038). The LinkedIn import is the same resume conversion (V-239).
 */
const AI_BILLED_ATS_PATHS = new Set([
  "/api/v1/ats/analyze",
  "/api/v1/ats/convert-resume",
  "/api/v1/profiles/import/linkedin",
]);

/**
 * Express routing is case-insensitive and non-strict, so `/API/v1/Contact/` reaches the same
 * handler as `/api/v1/contact` (V-087). Class selection, exemptions and bucket keys all use this
 * one spelling; otherwise each variant gets its own bucket, under the wrong class.
 */
function normalizePath(path: string): string {
  return path.toLowerCase().replace(/\/+$/, "") || "/";
}

function isRateLimitExempt(req: Request): boolean {
  const path = normalizePath(req.path);
  if (RATE_LIMIT_EXEMPT_PATHS.has(path)) return true;

  return (
    INTERNAL_KEY_EXEMPT_PATHS.has(path) &&
    matchesSharedSecret(req.headers["x-internal-key"], config.internal?.apiKey)
  );
}

function getClientKey(req: Request): string {
  const ip = getRequestIpDetails(req).resolvedIp;
  return ip ? addressBucket(ip) : "unknown";
}

function getSanitizedPath(path: string): string {
  return path
    .split("/")
    .map((segment) => {
      if (
        /^\d+$/.test(segment) ||
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(segment) ||
        (segment.length >= 10 && /[a-zA-Z]/.test(segment) && /[0-9]/.test(segment))
      )
        return ":id";

      return segment;
    })
    .join("/");
}

/**
 * The parts of Express 4's router `Layer` this reads. A mounted router's layer matches a path
 * prefix and carries the sub-router's stack; a route's layer matches the whole path.
 */
type RouterLayer = {
  regexp: RegExp & { fast_slash?: boolean; fast_star?: boolean };
  route?: {
    path: string | RegExp | Array<string | RegExp>;
    _handles_method(method: string): boolean;
  };
  handle?: { stack?: RouterLayer[] };
};

/** Express's own `Layer.match`, without its side effects: the matched part of `path`, or null. */
function layerPrefix(layer: RouterLayer, path: string): string | null {
  if (layer.regexp.fast_slash) return "";
  if (layer.regexp.fast_star) return path;
  layer.regexp.lastIndex = 0;
  return layer.regexp.exec(path)?.[0] ?? null;
}

/**
 * The pattern of the route that would answer (mount prefixes as matched, then the route's own
 * path as declared, e.g. `/api/v1/documents/:id`), or null when none would. Keying on the pattern
 * rather than the raw path keeps one bucket per route and client: `/documents/<any id>` or any
 * sub-path of a wildcard route (`/api/v1/auth/*`) cannot mint a new key per value (V-162).
 */
function matchedRoutePattern(
  stack: RouterLayer[],
  path: string,
  method: string,
  mountedAt = "",
): string | null {
  for (const layer of stack) {
    if (layer.route) {
      if (
        layerPrefix(layer, path) !== null &&
        // Express answers OPTIONS itself for any path a route matches.
        (method === "OPTIONS" || layer.route._handles_method(method))
      )
        return `${mountedAt}${String(layer.route.path)}`;
      continue;
    }

    const subStack = layer.handle?.stack;
    if (!subStack) continue;

    const prefix = layerPrefix(layer, path);
    if (prefix === null) continue;

    const rest = path.slice(prefix.length);
    const pattern = matchedRoutePattern(
      subStack,
      rest.startsWith("/") ? rest : `/${rest}`,
      method,
      // A mount prefix is literal text in this app; a parameterised one would still be bounded
      // by the per-client global limit.
      `${mountedAt}${prefix}`,
    );
    if (pattern !== null) return pattern;
  }

  return null;
}

/**
 * V-162: whether any route would answer this request. The limiter runs before routing, so it
 * walks the application's router the way Express will; a request that only the 404 handler
 * would see is counted under one `unmatched` key per client instead of a key per raw path.
 * Without a router to ask (a bare request object), the path is treated as matched.
 */
const AUTH_PREFIX = "/api/v1/auth";

/**
 * better-auth answers every path under /api/v1/auth from one wildcard route, so the route pattern
 * would put sign-in, callbacks, OTP, get-session and sign-out in one bucket. Auth requests are
 * keyed by the better-auth endpoint they reach instead (`app.locals.authEndpointPaths`, from
 * `auth.api`, set in app.ts): a bounded set, a parameterised one on its pattern. A path no
 * endpoint answers is unmatched (V-162).
 */
function authEndpointPattern(endpoints: readonly string[], path: string): string | null {
  const rest = path.slice(AUTH_PREFIX.length) || "/";
  const restSegments = rest.split("/");
  for (const endpoint of endpoints) {
    const pattern = normalizePath(endpoint);
    const segments = pattern.split("/");
    // Segment by segment: a `:param` matches any one segment, the rest literally.
    if (
      segments.length === restSegments.length &&
      segments.every((segment, i) => segment.startsWith(":") || segment === restSegments[i])
    )
      return `${AUTH_PREFIX}${pattern}`;
  }
  return null;
}

function routePattern(req: Request): string | null {
  const stack = (req.app as unknown as { _router?: { stack?: RouterLayer[] } } | undefined)?._router
    ?.stack;
  // No router to ask (a bare request object): the sanitized path stands in for the pattern.
  if (!stack) return getSanitizedPath(normalizePath(req.path));

  const path = normalizePath(req.path);
  const authEndpoints = (req.app.locals as { authEndpointPaths?: readonly string[] })
    .authEndpointPaths;
  if (authEndpoints && (path === AUTH_PREFIX || path.startsWith(`${AUTH_PREFIX}/`)))
    return authEndpointPattern(authEndpoints, path);

  const pattern = matchedRoutePattern(stack, req.path, req.method.toUpperCase());
  // Routing is case-insensitive and non-strict: one spelling per route (a router's "/" route
  // under its mount prefix would otherwise end in a slash).
  return pattern === null ? null : normalizePath(pattern);
}

type RouteLimit = {
  windowMs: number;
  maxRequests: number;
  /**
   * V-160: without Redis the limiter counts in this process's memory, which multiplies every
   * limit by the number of workers and replicas. For the classes that guard a password guess,
   * an outbound email or an OTP, that is not a limit at all; they answer 503 instead.
   */
  failClosed: boolean;
};

/**
 * The server's own apps post to `/stats/events` with `STATS_INTERNAL_KEY`; from one egress IP
 * they would exhaust the 15/min public class in seconds. They take the generic class instead.
 */
function isInternalStatsRequest(req: Request, path: string) {
  return (
    path.startsWith("/api/v1/stats/events") &&
    matchesSharedSecret(req.headers["x-internal-key"], config.metrics.statsInternalKey)
  );
}

function getRouteLimitConfig(path: string, internalStats = false): RouteLimit {
  const isAiRoute = path.startsWith("/api/v1/ai") || AI_BILLED_ATS_PATHS.has(path);
  const isAuthRoute = path.startsWith("/api/v1/auth");
  const isOtpRoute = /^\/api\/v1\/auth\/(email-otp\/|forget-password\/email-otp)/.test(path);
  const isStatsEventsRoute = path.startsWith("/api/v1/stats/events") && !internalStats;
  const isContactRoute = path.startsWith("/api/v1/contact");
  const isClientErrorRoute = path.startsWith("/api/v1/client-errors");

  const isShareVerifyRoute = /\/shares\/public\/[^/]+\/[^/]+\/verify$/.test(path);

  // Coarse outer bound per IP (most usernames/slugs fold to `:id`, so this bucket is shared across
  // links). The real guard is 5 attempts per (link, IP) in `ShareController.verifyPublicReadable`.
  if (isShareVerifyRoute)
    return {
      windowMs: 60 * 5000, // 5 minutes
      maxRequests: 20, // 20 requests per 5 minutes
      failClosed: true,
    };

  if (isContactRoute)
    return {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5, // 5 requests per hour — unauthenticated route that triggers outbound email
      failClosed: true,
    };

  // A crash loop in one tab must not fill the logs; a lost report is fine, so it fails open.
  if (isClientErrorRoute)
    return {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 reports per minute per IP
      failClosed: false,
    };

  if (isStatsEventsRoute)
    return {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 15, // 15 requests per minute
      failClosed: false,
    };

  if (isAiRoute)
    return {
      windowMs: config.ai.rateLimitWindowMs,
      maxRequests: config.ai.rateLimitMaxRequests,
      failClosed: false,
    };

  return {
    windowMs: isAuthRoute ? config.rateLimit.authWindowMs : config.rateLimit.windowMs,
    maxRequests: isAuthRoute ? config.rateLimit.authMaxRequests : config.rateLimit.maxRequests,
    failClosed: isOtpRoute,
  };
}

function pruneExpiredEntries() {
  const now = Date.now();

  for (const [key, entry] of bucket.entries()) {
    if (entry.resetAt <= now) bucket.delete(key);
  }
}

const cleanupInterval = setInterval(pruneExpiredEntries, 10 * 60 * 1000);
cleanupInterval.unref();

/**
 * Whether the limiter is currently counting in this process's memory because Redis is
 * unavailable (V-160). Each transition is logged once, so an outage is visible in the log
 * without a line per request, and the recovery is visible too.
 */
let usingMemoryFallback = false;

function noteRedisFailure(error: unknown) {
  if (usingMemoryFallback) return;
  usingMemoryFallback = true;
  logger.warn(
    "Rate limiter: Redis unavailable, counting in process memory (limits are per worker)",
    {
      error: error instanceof Error ? error.message : String(error),
    },
  );
}

function noteRedisRecovery() {
  if (!usingMemoryFallback) return;
  usingMemoryFallback = false;
  logger.warn("Rate limiter: Redis recovered, shared counters are back");
}

/**
 * Increments the given buckets (per-route and global, or one) in one round trip. Returning the
 * counters from a single script keeps the windows consistent with each other and avoids paying
 * one RTT per bucket on every request.
 */
const INCREMENT_WITH_EXPIRY_SCRIPT = `
  local results = {}
  for i = 1, #KEYS do
    local count = redis.call("INCR", KEYS[i])
    if count == 1 then
      redis.call("PEXPIRE", KEYS[i], ARGV[i])
    end
    results[#results + 1] = count
    results[#results + 1] = redis.call("PTTL", KEYS[i])
  end
  return results
`;

function incrementMemoryBucket(key: string, windowMs: number, now: number): BucketResult {
  const current = bucket.get(key);

  if (!current || current.resetAt <= now) {
    if (bucket.size > MAX_MEMORY_ENTRIES) {
      pruneExpiredEntries();
    }

    if (bucket.size > MAX_MEMORY_ENTRIES) {
      // Evict the oldest entries (Map preserves insertion order) rather than clearing
      // everyone's counters — a full clear would reset rate limits for every client at
      // exactly the high-traffic/Redis-outage moment the limiter exists to protect against.
      logger.warn("Rate limit memory bucket reached max capacity! Evicting oldest entries.");

      const excess = bucket.size - MAX_MEMORY_ENTRIES + 1;
      const keysToEvict: string[] = [];

      for (const existingKey of bucket.keys()) {
        if (keysToEvict.length >= excess) break;
        keysToEvict.push(existingKey);
      }

      for (const evictKey of keysToEvict) bucket.delete(evictKey);
    }

    bucket.set(key, { count: 1, resetAt: now + windowMs });

    return { count: 1, ttl: windowMs };
  }

  current.count += 1;
  return { count: current.count, ttl: Math.max(0, current.resetAt - now) };
}

/**
 * Counts one hit in each bucket: Redis first (bounded by `REDIS_TIMEOUT_MS`), else this
 * process's memory. `null` when the class fails closed and Redis is unavailable.
 */
/**
 * Circuit breaker (V-095): a Redis that keeps timing out would otherwise cost every request the
 * full timeout. After `BREAKER_TIMEOUT_THRESHOLD` timeouts in a row the limiter skips Redis for
 * `BREAKER_OPEN_MS`, then tries again; each open and close is logged once.
 */
let consecutiveTimeouts = 0;
let breakerOpenUntil = 0;
let breakerOpen = false;

function noteRedisTimeout() {
  consecutiveTimeouts += 1;
  if (consecutiveTimeouts < BREAKER_TIMEOUT_THRESHOLD) return;
  breakerOpenUntil = Date.now() + BREAKER_OPEN_MS;
  if (breakerOpen) return;
  breakerOpen = true;
  logger.warn("Rate limiter: Redis keeps timing out; skipping it for a few seconds at a time", {
    timeoutMs: REDIS_TIMEOUT_MS,
    pauseMs: BREAKER_OPEN_MS,
  });
}

function noteRedisAnswered() {
  consecutiveTimeouts = 0;
  if (!breakerOpen) return;
  breakerOpen = false;
  logger.warn("Rate limiter: Redis answering in time again");
}

async function countBuckets(
  buckets: Array<{ key: string; windowMs: number }>,
  failClosed: boolean,
): Promise<BucketResult[] | null> {
  try {
    if (Date.now() < breakerOpenUntil) throw new Error("Redis skipped: rate limiter breaker open");

    const counts = (await timeRedis(
      "ratelimit_eval",
      withRedisDeadline(
        getRedis().eval(INCREMENT_WITH_EXPIRY_SCRIPT, {
          keys: buckets.map((b) => b.key),
          arguments: buckets.map((b) => String(b.windowMs)),
        }),
        REDIS_TIMEOUT_MS,
      ),
    )) as number[];

    noteRedisAnswered();
    noteRedisRecovery();
    return buckets.map((_, i) => ({ count: counts[i * 2]!, ttl: counts[i * 2 + 1]! }));
  } catch (error) {
    if (error instanceof RedisTimeoutError) noteRedisTimeout();
    noteRedisFailure(error);
    if (failClosed) return null;
    const now = Date.now();
    return buckets.map((b) => incrementMemoryBucket(b.key, b.windowMs, now));
  }
}

function retryAfterSeconds({ ttl }: BucketResult, windowMs: number): number {
  return ttl > 0 ? Math.ceil(ttl / 1000) : Math.ceil(windowMs / 1000);
}

/** Every 429 from the limiter carries `Retry-After`. */
function sendTooManyRequests(res: Response, retryAfter: number) {
  res.set("Retry-After", String(retryAfter));
  res.status(429).json(createErrorResponse(429, "Too many requests. Please try again later."));
}

/**
 * The autosave class (V-130): 600 per 15 min, keyed on the authenticated user. Mounted on the
 * routes after `flexibleAuth`, because the IP limiter runs before authentication and has no user
 * to key on; a request that reaches it without one (not expected on these routes) is keyed on
 * its IP instead. Fails open to the per-process count like the generic class.
 */
export const autosaveRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  if (config.nodeEnv === "development") return next();

  const userId = req.authUser?.id ?? req.apiKey?.userId;
  const key = `rate-limit:autosave:${userId ? `user:${userId}` : `ip:${getClientKey(req)}`}`;

  try {
    const [counted] = (await countBuckets([{ key, windowMs: AUTOSAVE_WINDOW_MS }], false))!;
    if (counted!.count <= AUTOSAVE_MAX_REQUESTS) return next();

    logger.warn("Autosave rate limit exceeded", { key, path: req.path });
    sendTooManyRequests(res, retryAfterSeconds(counted!, AUTOSAVE_WINDOW_MS));
  } catch (error) {
    logger.error("Autosave rate limit failure", error);
    next();
  }
};

/**
 * Fixed-window counter for limits that live inside a handler (share verify, OTP and contact mail
 * throttles): `INCR` and `EXPIRE … NX` in one `MULTI`, so the window starts at the first hit and
 * later hits never extend it. Throws when Redis is unavailable; each caller decides whether that
 * fails open or closed.
 */
export async function incrementFixedWindow(
  key: string,
  windowSeconds: number,
): Promise<{ count: number; ttlSeconds: number }> {
  const [count, , ttl] = (await getRedis()
    .multi()
    .incr(key)
    .expire(key, windowSeconds, "NX")
    .ttl(key)
    .exec()) as unknown as [number, number, number];

  return { count: Number(count), ttlSeconds: Number(ttl) > 0 ? Number(ttl) : windowSeconds };
}

/** Concurrent provider calls one user may hold (V-038). */
export const AI_IN_FLIGHT_MAX = 2;
/**
 * The longest a job-page fetch can take ahead of the AI deadline: up to four hops, each a 5 s
 * DNS lookup and a 15 s request (`jobFetch.ts`).
 */
const JOB_FETCH_WORST_MS = 4 * (5_000 + 15_000);
/**
 * A slot a crashed worker never released clears itself just after the longest request it could
 * have been held for: the job fetch, then the AI deadline.
 */
const AI_IN_FLIGHT_TTL_SECONDS =
  Math.ceil((AI_REQUEST_DEADLINE_MS + JOB_FETCH_WORST_MS) / 1000) + 5;

let slotCountWarned = false;
/** A slot frees when a call finishes; there is no exact time to give, so suggest a short wait. */
const AI_SLOT_RETRY_AFTER_SECONDS = 10;

/** Drops the slot and the key with it once no call is left, so an idle user has no key at all. */
const RELEASE_AI_SLOT_SCRIPT = `
  local left = redis.call("DECR", KEYS[1])
  if left <= 0 then redis.call("DEL", KEYS[1]) end
  return left
`;

function aiSlotKey(userId: string) {
  return `ai:in-flight:${userId}`;
}

/**
 * Runs `work` holding one of the user's AI slots; a third concurrent call is a 429 before it
 * reserves credits or reaches the provider. Without Redis the cap cannot be shared between
 * workers, so the call runs uncounted (the credit ledger still bounds it) and the degradation
 * is logged once like the IP limiter's.
 */
export async function withAiSlot<T>(userId: string, work: () => Promise<T>): Promise<T> {
  const key = aiSlotKey(userId);
  let redis: ReturnType<typeof getRedis>;
  try {
    redis = getRedis();
    let count: number;
    try {
      [count] = (await redis
        .multi()
        .incr(key)
        .expire(key, AI_IN_FLIGHT_TTL_SECONDS, "NX")
        .exec()) as unknown as [number, number];
    } catch (error) {
      // The count is unknown: a Redis before 7 rejects `EXPIRE … NX` (and discards the whole
      // transaction), a dropped connection may have applied the INCR. The release script undoes
      // a counted increment and deletes a key left at zero or below, so either way the user
      // is not locked out; the call runs uncounted and this is logged once.
      await redis.eval(RELEASE_AI_SLOT_SCRIPT, { keys: [key] }).catch(() => undefined);
      if (!slotCountWarned) {
        slotCountWarned = true;
        logger.warn("AI in-flight slot could not be counted; calls run uncounted", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return work();
    }
    noteRedisRecovery();
    if (Number(count) > AI_IN_FLIGHT_MAX) {
      await redis.eval(RELEASE_AI_SLOT_SCRIPT, { keys: [key] }).catch(() => undefined);
      throw new ApiError(
        429,
        "Too many AI requests in progress. Wait for one to finish and try again.",
        { retryAfterSeconds: AI_SLOT_RETRY_AFTER_SECONDS },
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    noteRedisFailure(error);
    return work();
  }

  try {
    return await work();
  } finally {
    try {
      await redis.eval(RELEASE_AI_SLOT_SCRIPT, { keys: [key] });
    } catch (error) {
      logger.warn("AI in-flight slot release failed; it expires with the request deadline", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (config.nodeEnv === "development") return next();
  if (isRateLimitExempt(req)) return next();

  const path = normalizePath(req.path);
  const pattern = routePattern(req);
  const matched = pattern !== null;
  // An unmatched path takes the generic class: no handler behind it sends mail or spends credits.
  const { windowMs, maxRequests, failClosed } = matched
    ? getRouteLimitConfig(path, isInternalStatsRequest(req, path))
    : {
        windowMs: config.rateLimit.windowMs,
        maxRequests: config.rateLimit.maxRequests,
        failClosed: false,
      };
  const { globalWindowMs, globalMaxRequests } = config.rateLimit;
  const key = getClientKey(req);

  const routeKey = matched
    ? `rate-limit:${req.method}:${pattern}:${key}`
    : `rate-limit:unmatched:${key}`;
  const globalKey = `rate-limit:global:${key}`;
  // The autosave class is counted per user after auth (`autosaveRateLimit`); here only globally.
  const autosave = isAutosaveRequest(req.method, path);

  let shouldContinue = false;
  let isLimitExceeded = false;
  let isUnavailable = false;
  let retryAfter = 0;
  let exceededScope: "route" | "global" = "route";

  try {
    const counted = await countBuckets(
      autosave
        ? [{ key: globalKey, windowMs: globalWindowMs }]
        : [
            { key: routeKey, windowMs },
            { key: globalKey, windowMs: globalWindowMs },
          ],
      failClosed,
    );

    if (!counted) isUnavailable = true;
    else {
      const global = counted[counted.length - 1]!;
      const route = autosave ? undefined : counted[0]!;
      const routeExceeded = route !== undefined && route.count > maxRequests;
      const globalExceeded = global.count > globalMaxRequests;

      if (!routeExceeded && !globalExceeded) shouldContinue = true;
      else {
        isLimitExceeded = true;
        exceededScope = routeExceeded ? "route" : "global";
        retryAfter = routeExceeded
          ? retryAfterSeconds(route, windowMs)
          : retryAfterSeconds(global, globalWindowMs);
      }
    }
  } catch (err) {
    logger.error("Rate limit middleware failure", err);
    shouldContinue = true;
  }

  if (shouldContinue) next();
  else if (isUnavailable) {
    res.set("Retry-After", "5");
    res
      .status(503)
      .json(
        createErrorResponse(503, "Rate limiting is temporarily unavailable. Please retry shortly."),
      );
  } else if (isLimitExceeded) {
    logger.warn(`Rate limit exceeded for IP: ${key}`, { scope: exceededScope, path: req.path });
    sendTooManyRequests(res, retryAfter);
  }
};
