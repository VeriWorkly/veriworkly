import { randomUUID } from "node:crypto";

import { logger } from "./logger.js";
import { recordJobSuccess, type JobName } from "./metrics.js";
import { getRedis, redisWrite } from "./redis.js";

/**
 * One Redis lock per background job (V-053, V-127). Every worker schedules every job; the lock
 * picks one runner per tick. The lock is a random token under `SET NX PX`, renewed while the job
 * runs so a run that outlives the TTL keeps it, and released with compare-and-delete so an overrun
 * never deletes the next holder's lock.
 *
 * Renewal is not a guarantee: a Redis stall longer than the TTL still lets the key expire and a
 * second worker take it. Long jobs therefore call `stillOwner()` between batches and stop when it
 * is false (fencing by checking, not by token-carrying writes).
 */

const EXTEND_LUA = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("pexpire", KEYS[1], ARGV[2])
  end
  return 0
`;

const RELEASE_LUA = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  end
  return 0
`;

export type StillOwner = () => Promise<boolean>;

interface JobLockOptions {
  ttlMs: number;
  /** How often the TTL is pushed back out to `ttlMs`; defaults to a third of it. */
  renewEveryMs?: number;
}

interface WithJobLockOptions extends JobLockOptions {
  /** Records a success for `/health/jobs` when the run finishes without throwing, lock still held. */
  job?: JobName;
}

export interface JobLock {
  stillOwner: StillOwner;
  /** Stops renewing and deletes the key if it is still ours. Never rejects. */
  release(): Promise<void>;
}

/**
 * Takes the lock, or returns null when another runner holds it. Throws only when Redis is not
 * ready or the SET fails, so callers that need their own error contract (the sync services' 409)
 * can build on it; jobs use `withJobLock`.
 */
export async function acquireJobLock(
  name: string,
  options: JobLockOptions,
): Promise<JobLock | null> {
  const redis = getRedis();
  const token = randomUUID();
  const ttlMs = Math.max(1, Math.round(options.ttlMs));

  // A SET that lands after the acquire failed on its timeout would hold the lock with no runner
  // until the TTL; it is deleted again, only if it still holds this attempt's token.
  const acquired = await redisWrite(
    (client) => client.set(name, token, { NX: true, PX: ttlMs }),
    async (late) => {
      if (late === "OK") await redis.eval(RELEASE_LUA, { keys: [name], arguments: [token] });
    },
  );
  if (acquired !== "OK") return null;

  let lost = false;

  const renew = async () => {
    try {
      const extended = await redis.eval(EXTEND_LUA, {
        keys: [name],
        arguments: [token, String(ttlMs)],
      });

      if (extended === 0 && !lost) {
        lost = true;
        clearInterval(timer);
        logger.warn(`Job lock ${name} was lost while the job was running`);
      }
    } catch (error) {
      // A blip: the next tick retries. If the key expires meanwhile, stillOwner() reports it.
      logger.warn(`Job lock ${name}: renewal failed`, {
        error: error instanceof Error ? error.message : error,
      });
    }
  };

  const timer = setInterval(() => void renew(), options.renewEveryMs ?? Math.max(1, ttlMs / 3));
  timer.unref();

  return {
    async stillOwner() {
      if (lost) return false;

      // A failed GET is retried once, so one blip does not end a long run; a token mismatch is
      // definite and ends it at once. Two failures in a row cannot prove ownership, so the job
      // stops and the next tick runs it again.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          if ((await redis.get(name)) === token) return true;
          break;
        } catch {
          // Retried once, then treated as lost.
        }
      }

      lost = true;
      clearInterval(timer);
      return false;
    },

    async release() {
      clearInterval(timer);

      try {
        await redis.eval(RELEASE_LUA, { keys: [name], arguments: [token] });
      } catch (error) {
        logger.error(`Failed to release job lock ${name}`, {
          error: error instanceof Error ? error.message : error,
        });
      }
    },
  };
}

/**
 * Runs `fn` under the lock `name` (the Redis key). Never rejects: Redis not ready is a warning,
 * a held lock is a debug line, a throwing job is an error log. Resolves to `fn`'s result, or
 * undefined when it did not run or failed. With `options.job`, a run that resolves while the lock is
 * still ours is recorded as a success; a skipped, failed or lock-losing run is not.
 */
export async function withJobLock<T>(
  name: string,
  options: WithJobLockOptions,
  fn: (stillOwner: StillOwner) => Promise<T>,
): Promise<T | undefined> {
  let lock: JobLock | null;

  try {
    lock = await acquireJobLock(name, options);
  } catch (error) {
    logger.warn(`Skipping job ${name}: Redis not ready`, {
      error: error instanceof Error ? error.message : error,
    });
    return undefined;
  }

  if (!lock) {
    // Expected steady state: every worker schedules every job and the lock picks one runner.
    logger.debug(`Skipping job ${name}: lock held by another worker`);
    return undefined;
  }

  try {
    const result = await fn(lock.stillOwner);
    if (options.job && (await lock.stillOwner())) recordJobSuccess(options.job);
    return result;
  } catch (error) {
    logger.error(`Job ${options.job ? `${options.job} (${name})` : name} failed`, {
      error: error instanceof Error ? error.message : error,
    });
    return undefined;
  } finally {
    await lock.release();
  }
}

/**
 * Tracks a job module's in-flight runs so its `stop()` can hand shutdown a promise to await.
 * Tracked promises must not reject (the job runners never do); a rejection is swallowed here.
 */
export function createRunTracker() {
  const running = new Set<Promise<unknown>>();

  return {
    track(run: Promise<unknown>): void {
      const settled = run.then(
        () => undefined,
        () => undefined,
      );
      running.add(settled);
      void settled.then(() => running.delete(settled));
    },

    async idle(): Promise<void> {
      await Promise.all([...running]);
    },
  };
}
