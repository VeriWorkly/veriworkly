import { Request, Response, NextFunction } from "express";

import { logger } from "#utils/logger";
import { getRedis } from "#utils/redis";
import { createErrorResponse } from "#utils/errors";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 20;

/**
 * Rate limiter middleware for API keys.
 * Expects apiKey object to be present on req (from apiKeyAuth middleware).
 */

export const apiKeyRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.apiKey;

  if (!apiKey) {
    return next();
  }

  const keyId = apiKey.id;
  const redisKey = `rate-limit:apikey:${keyId}`;

  const now = Date.now();

  try {
    const redis = getRedis();

    if (!redis.isOpen) {
      throw new Error("Redis not connected");
    }

    const count = await redis.incr(redisKey);

    if (count === 1) {
      await redis.pExpire(redisKey, WINDOW_MS);
    }

    const limit = apiKey.rateLimit || MAX_REQUESTS;

    if (count > limit) {
      logger.warn(`API Key rate limit exceeded for key: ${apiKey.name} (${keyId})`);

      const ttl = Number(await redis.pTTL(redisKey));
      const retryAfter = Math.ceil(ttl / 1000);

      res.set("Retry-After", String(retryAfter));
      res.set("X-RateLimit-Limit", String(limit));
      res.set("X-RateLimit-Remaining", "0");
      res.set("X-RateLimit-Reset", String(Math.ceil((now + ttl) / 1000)));

      return res
        .status(429)
        .json(
          createErrorResponse(
            429,
            `Rate limit exceeded. You are allowed ${limit} requests per 15 minutes. Please try again in ${retryAfter} seconds.`,
          ),
        );
    }

    res.set("X-RateLimit-Limit", String(limit));
    res.set("X-RateLimit-Remaining", String(limit - count));

    const ttl = Number(await redis.pTTL(redisKey));
    res.set("X-RateLimit-Reset", String(Math.ceil((now + ttl) / 1000)));

    next();
  } catch (error) {
    logger.error("API Key rate limit middleware error", error);
    next();
  }
};
