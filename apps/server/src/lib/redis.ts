import { createClient } from "redis";

import { config } from "#config";
import { parseIntegerEnv } from "#config/parseEnv";

import { logger } from "./logger.js";

let redisClient: ReturnType<typeof createClient> | null = null;
let connectionPromise: Promise<ReturnType<typeof createClient>> | null = null;

/**
 * V-254: node-redis reconnects forever and its `connect()` never settles while Redis is
 * unreachable, so a booting worker used to wait forever without listening. Past this deadline
 * the boot fails, the worker exits and the primary revives it with backoff.
 */
const REDIS_BOOT_TIMEOUT_MS = parseIntegerEnv(process.env.REDIS_BOOT_TIMEOUT_MS, 15_000);

/** Errors no retry can fix: wrong credentials, a missing ACL permission, a bad db number. */
const FATAL_BOOT_ERROR = /WRONGPASS|NOAUTH|NOPERM|invalid password|DB index is out of range/i;

/**
 * A boot failure no restart can fix (wrong credentials, missing ACL permission, bad db number).
 * The worker exits with the configuration exit code and the primary stops reviving it.
 */
export class RedisConfigError extends Error {}

export async function initRedis(options: { bootTimeoutMs?: number } = {}) {
  if (redisClient?.isOpen) return redisClient;
  if (connectionPromise) return connectionPromise;

  const bootTimeoutMs = options.bootTimeoutMs ?? REDIS_BOOT_TIMEOUT_MS;

  connectionPromise = (async () => {
    let failBoot: (error: Error) => void = () => undefined;
    const bootFailed = new Promise<never>((_, reject) => (failBoot = reject));
    const deadline = setTimeout(
      () => failBoot(new Error(`Redis not ready within ${bootTimeoutMs} ms`)),
      bootTimeoutMs,
    );

    try {
      redisClient = createClient({
        url: config.redis.url,
        // While reconnecting, fail commands at once so callers fall back instead of hanging.
        disableOfflineQueue: true,
        socket: {
          reconnectStrategy: (retries) => {
            // Reconnect indefinitely, backing off to 5 s, with up to 50% jitter so every worker
            // and replica does not reconnect in the same instant after an outage (V-095).
            const delay = Math.min(retries * 100, 5000);
            return Math.round(delay / 2 + Math.random() * (delay / 2));
          },
        },
      });

      const client = redisClient;
      client.on("error", (err) => {
        logger.error("Redis Client Error", err);
        // Retrying cannot fix a credentials error: fail the boot now rather than at the deadline.
        if (!client.isReady && FATAL_BOOT_ERROR.test(String(err?.message)))
          failBoot(new RedisConfigError(`Redis refused the connection: ${err.message}`));
      });

      redisClient.on("connect", () => {
        logger.info("Redis Client Connected");
      });

      redisClient.on("reconnecting", () => {
        logger.warn("Redis Client Reconnecting...");
      });

      await Promise.race([client.connect(), bootFailed]);
      return client;
    } catch (error) {
      logger.error("Failed to initialize Redis", error);
      // Stops the reconnect loop, so a failed boot leaves nothing retrying in the background.
      try {
        redisClient?.destroy();
      } catch {
        // Already closed.
      }
      redisClient = null;
      connectionPromise = null;
      throw error;
    } finally {
      clearTimeout(deadline);
    }
  })();

  return connectionPromise;
}

export function getRedis() {
  // `isOpen` stays true while reconnecting; only `isReady` means commands will run.
  if (!redisClient?.isReady) throw new Error("Redis client not ready");

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

/**
 * Walks the whole keyspace (`SCAN MATCH prefix*`), so its cost grows with every key in Redis.
 * Only for the operator "flush cache" button (`adminSystemService.flushCache`); request paths
 * invalidate through generation namespaces (`#lib/cacheGeneration`) instead.
 */
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
