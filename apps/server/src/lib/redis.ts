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

type RedisClient = ReturnType<typeof createClient>;

/**
 * V-095: the longest any command issued through `getRedis()` waits for its reply.
 * `disableOfflineQueue` only fails commands fast while the client is disconnected; a connected
 * Redis that stops answering (an AOF rewrite fork, a slow script) used to hold every request on
 * its first Redis read. node-redis's own `timeout` command option stops counting once the command
 * is written, so it cannot bound the wait for the reply; the race below does.
 */
export const REDIS_COMMAND_TIMEOUT_MS = parseIntegerEnv(process.env.REDIS_COMMAND_TIMEOUT_MS, 500);

export class RedisTimeoutError extends Error {}

/**
 * Rejects with `RedisTimeoutError` when `promise` has not settled within `ms`. The command itself
 * is not cancelled: Redis may still apply it once it recovers, and its late reply is dropped.
 * Reads and caches lose nothing by that (the caller already fell back), and most writes are
 * idempotent or expire. A write whose caller reports failure and must not outlive that report
 * (a counted quota, a claim or lock taken with SET NX) goes through `redisWrite` instead, which
 * hands the late reply to an undo step.
 */
export function withRedisDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new RedisTimeoutError(`Redis did not answer within ${ms} ms`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * One write, bounded like any other command, whose effect must not outlive a timeout the caller
 * has already reported as a failure. When the bound fires, `undo` runs with the command's late
 * reply once Redis gives one (never, if the connection drops first), so the caller can reverse a
 * write that landed after all: refund a count, delete its own claim. `undo` failures are logged.
 * Throws like `getRedis()` when Redis is not ready.
 */
export async function redisWrite<T>(
  run: (redis: RedisClient) => Promise<T>,
  undo: (late: T) => Promise<unknown>,
  ms: number = REDIS_COMMAND_TIMEOUT_MS,
): Promise<T> {
  if (!redisClient?.isReady) throw new Error("Redis client not ready");

  const pending = run(redisClient);
  try {
    return await withRedisDeadline(pending, ms);
  } catch (error) {
    if (error instanceof RedisTimeoutError)
      void pending.then(undo).catch((undoError: unknown) =>
        logger.warn("Could not reverse a Redis write that landed after its timeout", {
          error: undoError instanceof Error ? undoError.message : String(undoError),
        }),
      );
    throw error;
  }
}

function isThenable(value: unknown): value is Promise<unknown> {
  return typeof (value as { then?: unknown } | null)?.then === "function";
}

/**
 * Wraps a client (or a MULTI builder) so every call that returns a promise is bounded. Methods
 * run against the real object (node-redis keeps its state in private fields), a builder method
 * that returns its own object returns the wrapper, and `multi()` returns a wrapped builder, so
 * `getRedis().multi().incr(k).exec()` is bounded at `exec`.
 */
function bounded<T extends object>(target: T, ms: number): T {
  const wrapper: T = new Proxy(target, {
    get(obj, prop) {
      const value = Reflect.get(obj, prop, obj) as unknown;
      if (typeof value !== "function") return value;

      return (...args: unknown[]) => {
        const result = (value as (...a: unknown[]) => unknown).apply(obj, args);
        if (result === obj) return wrapper;
        if (isThenable(result)) return withRedisDeadline(result, ms);
        if (
          result &&
          typeof result === "object" &&
          typeof Reflect.get(result, "exec") === "function"
        )
          return bounded(result, ms);
        return result;
      };
    },
  });
  return wrapper;
}

let boundedClient: { raw: RedisClient; client: RedisClient } | null = null;

/**
 * The shared client, every command bounded by `REDIS_COMMAND_TIMEOUT_MS` (V-095). Throws when
 * Redis is not ready; a stalled Redis rejects with `RedisTimeoutError`. Either way the caller's
 * fallback runs.
 */
export function getRedis(): RedisClient {
  // `isOpen` stays true while reconnecting; only `isReady` means commands will run.
  if (!redisClient?.isReady) throw new Error("Redis client not ready");

  if (boundedClient?.raw !== redisClient)
    boundedClient = { raw: redisClient, client: bounded(redisClient, REDIS_COMMAND_TIMEOUT_MS) };

  return boundedClient.client;
}

export async function closeRedis() {
  if (redisClient) {
    try {
      // A stalled Redis never answers QUIT; drop the socket instead of holding shutdown.
      await withRedisDeadline(redisClient.quit(), REDIS_COMMAND_TIMEOUT_MS * 4);
    } catch (error) {
      logger.error("Error closing Redis connection", error);
      try {
        redisClient.destroy();
      } catch {
        // Already closed.
      }
    } finally {
      boundedClient = null;
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

/**
 * `cacheSet` for a cache-aside read: writes only when the key is empty (`SET NX`), so a slow read
 * never replaces the value a write stored after the read loaded its row.
 */
export async function cacheSetIfAbsent<T>(
  key: string,
  value: T,
  expirationSeconds: number = 3600,
): Promise<void> {
  try {
    await getRedis().set(key, JSON.stringify(value), { NX: true, EX: expirationSeconds });
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
