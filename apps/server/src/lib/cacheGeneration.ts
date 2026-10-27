import { randomUUID } from "node:crypto";

import { logger } from "./logger.js";
import { getRedis } from "./redis.js";

/**
 * Generation-keyed cache namespaces (V-020/V-079/V-104/V-122).
 *
 * A namespace owns a counter at `cache:gen:{ns}`. Every cache key in the namespace embeds the
 * counter's current value, so invalidating the whole namespace is one `INCR`: readers move to
 * new keys and the old ones simply age out on their own TTL. This replaces the prefix `SCAN`,
 * whose cost grew with the size of the whole Redis keyspace.
 *
 * It also closes the cache-aside repopulation race. A reader resolves its key (reads the
 * generation) *before* it loads from the database; if a write bumps the generation in between,
 * the reader's stale value lands under the old generation's key, which nobody reads again.
 *
 * Values never repeat. A counter can disappear (TTL lapse, or `volatile-lru` eviction under
 * memory pressure) while values written under it still exist; restarting at 0 and counting up
 * again would resurrect them (a revoked share's snapshot served again). So a missing counter is
 * seeded from the Redis server clock in microseconds, which is above every value the old counter
 * can have reached unless it was bumped more than once per microsecond. Both the seed and the
 * bump run in Lua so they are atomic.
 */
const GENERATION_TTL_SECONDS = 90 * 24 * 60 * 60;

export function generationCounterKey(namespace: string) {
  return `cache:gen:${namespace}`;
}

/** `TIME` as a microsecond string, built by concatenation so no Lua double loses precision. */
const SEED_FROM_CLOCK = `
local function seed()
  local t = redis.call('TIME')
  return t[1] .. string.format('%06d', tonumber(t[2]))
end
`;

/** Returns the counter, seeding a missing one from the clock; refreshes the TTL either way. */
const READ_GENERATION_SCRIPT = `${SEED_FROM_CLOCK}
local value = redis.call('GET', KEYS[1])
if value then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  return value
end
value = seed()
redis.call('SET', KEYS[1], value, 'NX', 'EX', ARGV[1])
return redis.call('GET', KEYS[1])
`;

/** INCRs every key; a missing one is seeded from the clock first, so it lands at clock + 1. */
const BUMP_GENERATION_SCRIPT = `${SEED_FROM_CLOCK}
for _, key in ipairs(KEYS) do
  if redis.call('EXISTS', key) == 0 then
    redis.call('SET', key, seed())
  end
  redis.call('INCR', key)
  redis.call('EXPIRE', key, ARGV[1])
end
return #KEYS
`;

/** The namespace's current generation, or `null` when Redis is unavailable (skip the cache). */
export async function getGeneration(namespace: string): Promise<string | null> {
  try {
    const value = await getRedis().eval(READ_GENERATION_SCRIPT, {
      keys: [generationCounterKey(namespace)],
      arguments: [String(GENERATION_TTL_SECONDS)],
    });

    return String(value);
  } catch (error) {
    logger.error("Cache generation read error", error);
    return null;
  }
}

/** Whether the client can run commands now (`getRedis` throws while it is not ready). */
function redisReady() {
  try {
    getRedis();
    return true;
  } catch {
    return false;
  }
}

function runBump(namespaces: string[]) {
  return getRedis().eval(BUMP_GENERATION_SCRIPT, {
    keys: namespaces.map(generationCounterKey),
    arguments: [String(GENERATION_TTL_SECONDS)],
  });
}

/**
 * A lost bump is a privacy bug, not just a stale read (V-370): a revoked share or a document made
 * private would stay public until its cache entry expired. So a bump that fails is retried while
 * the request waits (a Redis blip is usually over in well under a second), and one that still
 * fails is queued and retried in the background until Redis answers. The queue lives in this
 * process; the public share cache TTL (5 minutes, `shareController.ts`) bounds the staleness if
 * the process dies before the queue drains.
 */
const INLINE_RETRY_DELAYS_MS = [100, 300];
const BACKGROUND_RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];
/** Past every TTL a privacy action depends on, so a stale entry has aged out by then anyway. */
const BACKGROUND_GIVE_UP_MS = 10 * 60_000;

const pendingBumps = new Set<string>();
let backgroundTimer: NodeJS.Timeout | null = null;
let backgroundAttempt = 0;
let backgroundDeadline = 0;

function scheduleBackgroundBump() {
  if (backgroundTimer) return;
  const delay =
    BACKGROUND_RETRY_DELAYS_MS[Math.min(backgroundAttempt, BACKGROUND_RETRY_DELAYS_MS.length - 1)]!;
  backgroundTimer = setTimeout(() => void flushPendingBumps(), delay);
  backgroundTimer.unref();
}

async function flushPendingBumps() {
  backgroundTimer = null;
  const namespaces = [...pendingBumps];
  if (namespaces.length === 0) return;

  try {
    await runBump(namespaces);
    for (const namespace of namespaces) pendingBumps.delete(namespace);
    backgroundAttempt = 0;
    logger.info("Queued cache invalidations applied after Redis recovered", {
      namespaces: namespaces.length,
    });
  } catch (error) {
    backgroundAttempt += 1;
    if (Date.now() > backgroundDeadline) {
      logger.error("Gave up on queued cache invalidations; their entries have expired since", {
        namespaces: namespaces.length,
        error: error instanceof Error ? error.message : String(error),
      });
      pendingBumps.clear();
      backgroundAttempt = 0;
      return;
    }
  }
  if (pendingBumps.size > 0) scheduleBackgroundBump();
}

/**
 * Invalidates every key in each namespace, all in one round trip. Never throws: a bump Redis
 * refuses is retried briefly, then queued for the background until Redis is back (V-370).
 */
export async function bumpGeneration(...namespaces: string[]): Promise<void> {
  const unique = [...new Set(namespaces.filter(Boolean))];
  if (unique.length === 0) return;

  for (let attempt = 0; ; attempt++) {
    // Redis down altogether (the client is not ready): retrying in line only makes every write
    // wait for nothing, so the bump goes straight to the background queue (V-370 review).
    if (!redisReady()) {
      logger.warn("Redis not ready; cache invalidation queued for retry", {
        namespaces: unique.length,
      });
      break;
    }
    try {
      await runBump(unique);
      return;
    } catch (error) {
      if (attempt >= INLINE_RETRY_DELAYS_MS.length) {
        logger.error("Cache generation bump error; queued for retry", error);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, INLINE_RETRY_DELAYS_MS[attempt]));
    }
  }

  for (const namespace of unique) pendingBumps.add(namespace);
  backgroundDeadline = Date.now() + BACKGROUND_GIVE_UP_MS;
  scheduleBackgroundBump();
}

export function generationalKey(namespace: string, generation: string, ...parts: string[]) {
  return [namespace, `g${generation}`, ...parts].join(":");
}

/**
 * Reads the generation and builds the key in one step. Call it before the database read; `null`
 * means Redis is unavailable and the caller should neither read nor write the cache.
 */
export async function resolveGenerationalKey(
  namespace: string,
  ...parts: string[]
): Promise<string | null> {
  const generation = await getGeneration(namespace);
  return generation === null ? null : generationalKey(namespace, generation, ...parts);
}

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

const SINGLE_FLIGHT_POLL_MS = 50;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Collapses concurrent cache misses onto one builder (V-117). The caller that wins `SET NX PX`
 * runs `build` (which is expected to populate the cache); the others poll `readCache`. When the
 * lock disappears without a value (the winner crashed, or ran past `ttlMs`) the waiters race
 * `SET NX` again and only the new winner builds; the rest keep waiting. Waiters give up and build
 * themselves at twice the lock TTL, so a stuck winner costs latency, never correctness. If Redis
 * is unavailable every caller just builds.
 */
export async function singleFlight<T>(
  key: string,
  ttlMs: number,
  build: () => Promise<T>,
  readCache: () => Promise<T | null>,
): Promise<T> {
  const lockKey = `singleflight:${key}`;
  const token = randomUUID();

  /** `true` won, `false` someone else holds it, `null` Redis is unavailable. */
  const tryAcquire = async (): Promise<boolean | null> => {
    try {
      return (await getRedis().set(lockKey, token, { NX: true, PX: ttlMs })) === "OK";
    } catch {
      return null;
    }
  };

  const buildAsOwner = async () => {
    try {
      return await build();
    } finally {
      try {
        await getRedis().eval(RELEASE_LOCK_SCRIPT, { keys: [lockKey], arguments: [token] });
      } catch (error) {
        logger.warn("Single-flight lock release failed", error);
      }
    }
  };

  const first = await tryAcquire();
  if (first === null) return build();
  if (first) return buildAsOwner();

  const deadline = Date.now() + ttlMs * 2;

  while (Date.now() < deadline) {
    await sleep(SINGLE_FLIGHT_POLL_MS);

    const cached = await readCache();
    if (cached !== null) return cached;

    let lockHeld: boolean;
    try {
      lockHeld = (await getRedis().exists(lockKey)) > 0;
    } catch {
      return build();
    }

    if (!lockHeld) {
      const again = await tryAcquire();
      if (again === null) return build();
      if (again) return buildAsOwner();
    }
  }

  const cached = await readCache();
  return cached !== null ? cached : build();
}
