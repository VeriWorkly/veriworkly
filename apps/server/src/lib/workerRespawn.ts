import type { Cluster, Worker } from "node:cluster";

import { logger } from "./logger.js";

/**
 * Worker revival with backoff for the cluster master (G LOW: "throng revive has no backoff").
 *
 * throng 5 revives a dead worker with an immediate `cluster.fork()` from its `disconnect` handler
 * and offers no hook to delay it, so a boot-time Redis or database failure became a tight fork
 * loop. `index.ts` therefore starts throng with `lifetime: 0` (its `revive()` returns at once
 * because `Date.now() >= reviveUntil`) and installs this in throng's `master` hook instead:
 *
 * - a worker that exits within `FAST_EXIT_MS` of being forked counts as a failed boot, and its
 *   replacement waits 1 s, 2 s, 4 s … capped at 30 s, doubling per consecutive failed boot;
 * - a worker that ran longer is replaced at once and resets the counter.
 *
 * throng still owns the initial forks, signal handling and the grace-period force kill; `stop()`
 * (called on SIGTERM/SIGINT) cancels any pending revive so shutdown does not fork new workers.
 */

const FAST_EXIT_MS = 30_000;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

/** Delay before reviving after `consecutiveFastExits` failed boots in a row (0 = healthy exit). */
export function respawnDelayMs(consecutiveFastExits: number): number {
  if (consecutiveFastExits <= 0) return 0;
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (consecutiveFastExits - 1));
}

/**
 * Exit code of a worker that hit a configuration error no restart can fix (V-254: Redis refused
 * the credentials). 78 is EX_CONFIG from sysexits.h.
 */
export const FATAL_CONFIG_EXIT_CODE = 78;

export function installWorkerRespawn(
  cluster: Cluster,
  options: { onFatal?: (code: number) => void } = {},
) {
  const forkedAt = new WeakMap<Worker, number>();
  const pending = new Set<NodeJS.Timeout>();
  let consecutiveFastExits = 0;
  let stopped = false;

  cluster.on("fork", (worker: Worker) => forkedAt.set(worker, Date.now()));

  cluster.on("exit", (worker: Worker, code: number | null, signal: string | null) => {
    if (stopped) return;

    // Reviving would fail the same way every 30 s forever; the primary exits instead, so the
    // process manager shows the app as errored.
    if (code === FATAL_CONFIG_EXIT_CODE) {
      logger.error("Cluster worker exited on a fatal configuration error; not reviving", {
        workerId: worker.id,
        code,
      });
      stopped = true;
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
      options.onFatal?.(code);
      return;
    }

    const uptimeMs = Date.now() - (forkedAt.get(worker) ?? 0);
    consecutiveFastExits = uptimeMs < FAST_EXIT_MS ? consecutiveFastExits + 1 : 0;
    const delayMs = respawnDelayMs(consecutiveFastExits);

    logger.warn("Cluster worker exited; reviving", {
      workerId: worker.id,
      code,
      signal,
      uptimeMs,
      reviveInMs: delayMs,
    });

    if (delayMs === 0) {
      cluster.fork();
      return;
    }

    const timer = setTimeout(() => {
      pending.delete(timer);
      if (!stopped) cluster.fork();
    }, delayMs);
    pending.add(timer);
  });

  return {
    stop() {
      stopped = true;
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
    },
  };
}
