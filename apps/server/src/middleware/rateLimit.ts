import { Request, Response, NextFunction } from "express";

import { config } from "#config";

import { logger } from "#utils/logger";
import { getRedis } from "#utils/redis";
import { createErrorResponse } from "#utils/errors";
import { getRequestIpDetails } from "#utils/requestIp";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const MAX_MEMORY_ENTRIES = process.env.MAX_MEMORY_ENTRIES
  ? parseInt(process.env.MAX_MEMORY_ENTRIES, 10)
  : 15000;
const bucket = new Map<string, RateLimitEntry>();

function getClientKey(req: Request): string {
  const ip = getRequestIpDetails(req).resolvedIp;
  return ip || "unknown";
}

function getSanitizedPath(path: string): string {
  return path
    .split("/")
    .map((segment) => {
      if (
        /^\d+$/.test(segment) ||
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(segment) ||
        (segment.length >= 10 && /[a-zA-Z]/.test(segment) && /[0-9]/.test(segment))
      ) {
        return ":id";
      }
      return segment;
    })
    .join("/");
}

function getRouteLimitConfig(req: Request) {
  const isAuthRoute = req.path.startsWith("/api/v1/auth");
  const isAiRoute = req.path.startsWith("/api/v1/ai");
  const isStatsEventsRoute = req.path.startsWith("/api/v1/stats/events");

  const isShareVerifyRoute = /\/shares\/public\/[^/]+\/[^/]+\/verify$/.test(req.path);

  if (isShareVerifyRoute) {
    return {
      windowMs: 60 * 5000, // 5 minutes
      maxRequests: 3, // 3 requests per 5 minutes
    };
  }

  if (isStatsEventsRoute) {
    return {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 15, // 15 requests per minute
    };
  }

  if (isAiRoute) {
    return {
      windowMs: config.ai.rateLimitWindowMs,
      maxRequests: config.ai.rateLimitMaxRequests,
    };
  }

  return {
    windowMs: isAuthRoute ? config.rateLimit.authWindowMs : config.rateLimit.windowMs,
    maxRequests: isAuthRoute ? config.rateLimit.authMaxRequests : config.rateLimit.maxRequests,
  };
}

function pruneExpiredEntries() {
  const now = Date.now();

  for (const [key, entry] of bucket.entries()) {
    if (entry.resetAt <= now) {
      bucket.delete(key);
    }
  }
}

const cleanupInterval = setInterval(pruneExpiredEntries, 10 * 60 * 1000);
cleanupInterval.unref();

const INCREMENT_WITH_EXPIRY_SCRIPT = `
  local count = redis.call("INCR", KEYS[1])
  if count == 1 then
    redis.call("PEXPIRE", KEYS[1], ARGV[1])
  end
  local ttl = redis.call("PTTL", KEYS[1])
  return {count, ttl}
`;

export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (config.nodeEnv === "development") {
    return next();
  }

  const now = Date.now();

  const { windowMs, maxRequests } = getRouteLimitConfig(req);
  const key = getClientKey(req);

  const sanitizedPath = getSanitizedPath(req.path);
  const redisKey = `rate-limit:${req.method}:${sanitizedPath}:${key}`;

  const checkWithFallback = async (): Promise<{ count: number; ttl: number }> => {
    try {
      const redis = getRedis();

      if (!redis.isOpen) throw new Error("Redis not open");

      const [count, ttl] = (await redis.eval(INCREMENT_WITH_EXPIRY_SCRIPT, {
        keys: [redisKey],
        arguments: [String(windowMs)],
      })) as [number, number];

      return { count, ttl };
    } catch {
      const current = bucket.get(redisKey);

      if (!current || current.resetAt <= now) {
        if (bucket.size > MAX_MEMORY_ENTRIES) {
          logger.warn(
            "Rate limit memory bucket reached max capacity! Clearing map to prevent crash.",
          );

          bucket.clear();
        }

        bucket.set(redisKey, { count: 1, resetAt: now + windowMs });

        return { count: 1, ttl: windowMs };
      }

      current.count += 1;
      return { count: current.count, ttl: Math.max(0, current.resetAt - now) };
    }
  };

  checkWithFallback()
    .then(({ count, ttl }) => {
      if (count <= maxRequests) {
        next();
        return;
      }

      logger.warn(`Rate limit exceeded for IP: ${key}`);

      const retryAfter = ttl > 0 ? Math.ceil(ttl / 1000) : Math.ceil(windowMs / 1000);

      res.set("Retry-After", String(retryAfter));
      res.status(429).json(createErrorResponse(429, "Too many requests. Please try again later."));
    })
    .catch((err) => {
      logger.error("Rate limit middleware failure", err);
      next();
    });
};
