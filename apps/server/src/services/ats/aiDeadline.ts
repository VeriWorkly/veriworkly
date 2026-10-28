import type { Response } from "express";

import { ApiError } from "#lib/errors";
import { isShuttingDown, shutdownSignal } from "#lib/shutdown";

/**
 * The time budget every billed AI call on a request shares (V-034).
 *
 * `AI_REQUEST_DEADLINE_MS` is the longest one request may keep a provider busy, parse repair
 * and analysis included. It sits under Cloudflare's 100 s with room for the job-page fetch that
 * can precede it, and far under the 15-minute credit reservation TTL (`creditService.ts`), so a
 * reservation can no longer expire under a call that is still running. Every provider call
 * carries a signal that fires at this deadline or when the client goes away; either way the
 * call ends and its reservation is released, instead of charging for an answer nobody received.
 *
 * Kept free of heavy imports: the rate limiter sizes its in-flight slots from the deadline.
 */
export const AI_REQUEST_DEADLINE_MS = 85_000;

/** The engine waits 1 s before the first retry of a provider fault and doubles each time after. */
function backoffBeforeRetry(retry: number) {
  return 1_000 * 2 ** (retry - 1);
}

const RETRY_CEILING = 2;

/**
 * The most retries whose worst case — every attempt running to `timeoutMs`, plus the backoff
 * between attempts — still fits the deadline. With the 45 s default timeout that is none; 30 s
 * allows one retry, 20 s two. The ATS policy reader clamps each route to this, so no route can
 * be configured into a budget the deadline would cut off midway through a billed attempt.
 */
export function maxRetriesWithinDeadline(timeoutMs: number, deadlineMs = AI_REQUEST_DEADLINE_MS) {
  let retries = 0;
  let total = timeoutMs;
  while (retries < RETRY_CEILING) {
    const next = total + backoffBeforeRetry(retries + 1) + timeoutMs;
    if (next > deadlineMs) break;
    total = next;
    retries += 1;
  }
  return retries;
}

/**
 * Aborts when the client goes away before the response is written.
 *
 * Watched on the response, not the request: Node emits the request's `close` when the request
 * has completed, whether or not the connection stayed up, so it is not a disconnect signal. The
 * response's `close` without `writableFinished` is one.
 */
export function requestClosedSignal(res: Response): AbortSignal {
  const controller = new AbortController();
  const gone = () => controller.abort(new Error("Client disconnected."));
  // Already gone before anyone asked: a long job fetch can precede the first provider call.
  if (res.destroyed || res.writableEnded) gone();
  else
    res.once("close", () => {
      if (!res.writableFinished) gone();
    });
  return controller.signal;
}

/**
 * The signal every provider call on this request gets: the client leaving, the deadline, or the
 * worker draining for a restart (V-313).
 */
export function aiRequestSignal(res: Response): AbortSignal {
  return AbortSignal.any([
    requestClosedSignal(res),
    AbortSignal.timeout(AI_REQUEST_DEADLINE_MS),
    shutdownSignal(),
  ]);
}

/** How long a client told to retry during a restart waits: the other copy is serving by then. */
const RESTART_RETRY_AFTER_SECONDS = 5;

/** A request cut off because this worker is restarting: nothing was charged, retry it. */
export function serverRestartingError() {
  return new ApiError(503, "The server is restarting. Try again in a few seconds.", {
    code: "SERVER_RESTARTING",
    retryAfterSeconds: RESTART_RETRY_AFTER_SECONDS,
  });
}

/** What an aborted call answers with when there is still someone to answer. */
export function aiTimeoutError() {
  if (isShuttingDown()) return serverRestartingError();
  return new ApiError(504, "The AI request timed out before the provider answered.");
}

/**
 * Every AI route's last word on a failure (V-313 review): once the drain has aborted in-flight
 * AI work, whatever the abort surfaced as (the provider's abort, the job fetch's "timed out"
 * 400, a timeout 504) is answered 503 with `Retry-After`, since nothing was charged and the
 * other copy can serve the retry.
 */
export function aiRouteError(error: unknown): unknown {
  return isShuttingDown() ? serverRestartingError() : error;
}
