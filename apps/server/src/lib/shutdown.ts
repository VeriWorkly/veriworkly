/**
 * How a worker goes away (V-313, V-373).
 *
 * Timeline, every step counted from SIGTERM/SIGINT or a fault:
 * - 0 s: stop accepting connections; requests in flight keep running.
 * - `httpGraceMs`: requests still running are AI calls or something stuck. In-flight AI work is
 *   aborted through `shutdownSignal`, so each call releases its credit reservation and AI slot
 *   through its normal abort path and answers.
 * - `httpHardCapMs`: the drain stops waiting for requests. Redis and Postgres close only after
 *   the last request has ended or this cap is reached, never under a request still using them.
 * Background jobs drain in parallel for up to `jobDrainMs`. Closing the pools takes a moment
 * more; throng's force kill (`throngGraceMs`) and the process manager's (`processManagerKillMs`,
 * pm2 `kill_timeout`, compose `stop_grace_period`) sit above all of it.
 */
export const SHUTDOWN_TIMINGS = {
  httpGraceMs: 10_000,
  httpHardCapMs: 25_000,
  jobDrainMs: 20_000,
  throngGraceMs: 35_000,
  processManagerKillMs: 40_000,
} as const;

let controller = new AbortController();

/** Fires once the drain aborts in-flight work; read at call time. */
export function shutdownSignal(): AbortSignal {
  return controller.signal;
}

/** True once the worker is draining for a restart. */
export function isShuttingDown(): boolean {
  return controller.signal.aborted;
}

export function abortInFlightWork() {
  if (!controller.signal.aborted) controller.abort(new Error("The server is restarting."));
}

let draining = false;

/**
 * Marks the worker as draining, at the very start of the drain (V-342). Long background jobs
 * (retention, the GitHub and changelog syncs) check it between batches and pages and stop
 * cleanly, so they are not cut off mid-statement when the pools close at the job drain cap.
 */
export function beginDrain() {
  draining = true;
}

/** True from the start of the drain, before in-flight requests are aborted. */
export function isDraining(): boolean {
  return draining || isShuttingDown();
}

/** Integration tests only: a worker never comes back from a drain. */
export function resetShutdownSignalForTests() {
  controller = new AbortController();
  draining = false;
}
