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

function getRouteLimitConfig(req: Request) {
  const isAuthRoute = req.path.startsWith("/api/v1/auth");

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

export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (config.nodeEnv === "development") {
    return next();
  }

  const now = Date.now();

  const { windowMs, maxRequests } = getRouteLimitConfig(req);
  const key = getClientKey(req);

  const redisKey = `rate-limit:${req.method}:${req.path}:${key}`;

  const checkWithFallback = async () => {
    try {
      const redis = getRedis();

      if (!redis.isOpen) throw new Error("Redis not open");

      const count = await redis.incr(redisKey);

      if (count === 1) {
        await redis.pExpire(redisKey, windowMs);
      }

      return count;
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
        return 1;
      }

      current.count += 1;
      return current.count;
    }
  };

  checkWithFallback()
    .then((count) => {
      if (count <= maxRequests) {
        next();
        return;
      }

      logger.warn(`Rate limit exceeded for IP: ${key}`);

      const retryAfter = Math.ceil((windowMs - (now % windowMs)) / 1000);
      res.set("Retry-After", String(retryAfter));
      res.status(429).json(createErrorResponse(429, "Too many requests. Please try again later."));
    })
    .catch((err) => {
      logger.error("Rate limit middleware failure", err);
      next();
    });
};
