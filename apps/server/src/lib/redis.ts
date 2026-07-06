import { createClient } from "redis";

import { config } from "#config";

import { logger } from "./logger.js";

let redisClient: ReturnType<typeof createClient> | null = null;
let connectionPromise: Promise<ReturnType<typeof createClient>> | null = null;

export async function initRedis() {
  if (redisClient?.isOpen) return redisClient;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    try {
      redisClient = createClient({
        url: config.redis.url,
        socket: {
          reconnectStrategy: (retries) => {
            // Reconnect indefinitely with a maximum delay of 5 seconds (5000ms)
            return Math.min(retries * 100, 5000);
          },
        },
      });

      redisClient.on("error", (err) => {
        logger.error("Redis Client Error", err);
      });

      redisClient.on("connect", () => {
        logger.info("Redis Client Connected");
      });

      redisClient.on("reconnecting", () => {
        logger.warn("Redis Client Reconnecting...");
      });

      await redisClient.connect();
      return redisClient;
    } catch (error) {
      logger.error("Failed to initialize Redis", error);
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
}

export function getRedis() {
  if (!redisClient || !redisClient.isOpen)
    throw new Error("Redis client not initialized or connection closed");

  return redisClient;
}

export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (error) {
      logger.error("Error closing Redis connection", error);
    } finally {
      redisClient = null;
      connectionPromise = null;
    }
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const data = await redis.get(key);

    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error("Cache get error", error);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  expirationSeconds: number = 3600,
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.setEx(key, expirationSeconds, JSON.stringify(value));
  } catch (error) {
    logger.error("Cache set error", error);
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.unlink(key);
  } catch (error) {
    logger.error("Cache del error", error);
  }
}

export async function cacheDelByPrefix(prefix: string): Promise<void> {
  try {
    const redis = getRedis();
    let cursor = "0";

    do {
      const result = await redis.scan(cursor, {
        MATCH: `${prefix}*`,
        COUNT: 100,
      });

      cursor = result.cursor;

      if (result.keys.length > 0) await redis.unlink(result.keys);
    } while (cursor !== "0");
  } catch (error) {
    logger.error("Cache prefix delete error", error);
  }
}
