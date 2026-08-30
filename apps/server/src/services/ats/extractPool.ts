import { fork, type ChildProcess } from "node:child_process";

import { logger } from "#lib/logger";
import { ApiError } from "#lib/errors";

import type {
  AtsExtractFormat,
  AtsExtractLayout,
  AtsExtractResponse,
} from "#services/ats/extractChild";

export type AtsExtractOutcome = { text: string; layout?: AtsExtractLayout };

const EXTRACTION_TIMEOUT_MS = 20_000;
const MAX_QUEUE_DEPTH = 8;

type PendingJob = {
  id: number;
  format: AtsExtractFormat;
  buffer: Buffer;
  resolve: (result: AtsExtractOutcome) => void;
  reject: (error: unknown) => void;
};

let child: ChildProcess | null = null;
let current: PendingJob | null = null;
let timer: NodeJS.Timeout | null = null;
let nextJobId = 1;

const queue: PendingJob[] = [];

/**
 * Resolves the compiled child entrypoint next to this module. Under `tsx watch` (dev)
 * `import.meta.url` ends in `.ts` and tsx's loader applies to forked children; under
 * `node dist/index.js` (prod) it ends in `.js`. Both land on a sibling file, so no build step
 * or asset copy is required.
 */
function childEntrypoint() {
  const extension = import.meta.url.endsWith(".ts") ? ".ts" : ".js";
  return new URL(`./extractChild${extension}`, import.meta.url);
}

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

/**
 * Tears the child down and fails everything in flight. Called on timeout (the child is stuck in
 * a pathological parse and killing it is the only way to reclaim the CPU) and on unexpected exit.
 */
function recycleChild(reason: string, error: ApiError) {
  const victim = child;
  child = null;

  clearTimer();

  const failed = current;
  current = null;

  const queued = queue.splice(0, queue.length);

  if (victim) {
    victim.removeAllListeners();
    victim.kill("SIGKILL");
  }

  failed?.reject(error);
  for (const job of queued) job.reject(error);

  if (failed || queued.length)
    logger.warn("Recycled resume extraction process", {
      reason,
      failedJobs: (failed ? 1 : 0) + queued.length,
    });
}

function handleMessage(message: AtsExtractResponse) {
  // A late reply from a job we already timed out; the id guard keeps it from resolving whatever
  // request happens to be current now.
  if (!current || message.id !== current.id) return;

  const job = current;
  current = null;
  clearTimer();

  if (message.ok) job.resolve({ text: message.text, layout: message.layout });
  else job.reject(new ApiError(400, "Resume file could not be read."));

  pump();
}

function ensureChild(): ChildProcess {
  if (child?.connected) return child;

  child = fork(childEntrypoint(), {
    // No stdio from the child; it communicates over the IPC channel only.
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    // Caps a decompression bomb rather than letting it consume host memory.
    execArgv: ["--max-old-space-size=256"],
  });

  child.on("message", handleMessage as (message: unknown) => void);

  child.on("exit", (code, signal) => {
    // Only meaningful if it died while we still had work; an idle child exiting is harmless and
    // the next request simply forks a new one.
    if (current || queue.length)
      recycleChild(
        `child exited (code=${code}, signal=${signal})`,
        new ApiError(400, "Resume file could not be read."),
      );
    else child = null;
  });

  child.on("error", (error) =>
    recycleChild(
      `child error: ${error.message}`,
      new ApiError(503, "Resume extraction is temporarily unavailable."),
    ),
  );

  return child;
}

function pump() {
  if (current) return;

  const job = queue.shift();
  if (!job) return;

  current = job;

  try {
    ensureChild().send({
      id: job.id,
      format: job.format,
      buffer: job.buffer.toString("base64"),
    });
  } catch (error) {
    recycleChild(
      `send failed: ${error instanceof Error ? error.message : String(error)}`,
      new ApiError(503, "Resume extraction is temporarily unavailable."),
    );
    return;
  }

  timer = setTimeout(
    () =>
      recycleChild(
        "extraction timeout",
        new ApiError(408, "Resume extraction took too long to process."),
      ),
    EXTRACTION_TIMEOUT_MS,
  );
}

/**
 * Queues a parse on the shared extraction process.
 *
 * Work is serialized per server worker, which is appropriate here: extraction is quota-limited,
 * and the cluster already runs one server worker per CPU. Serializing also means a single
 * pathological file can never occupy more than one extraction process.
 */
export function extractInChildProcess(
  format: AtsExtractFormat,
  buffer: Buffer,
): Promise<AtsExtractOutcome> {
  if (queue.length >= MAX_QUEUE_DEPTH)
    return Promise.reject(
      new ApiError(503, "Too many resume extractions in progress. Please retry shortly."),
    );

  return new Promise<AtsExtractOutcome>((resolve, reject) => {
    queue.push({ id: nextJobId++, format, buffer, resolve, reject });
    pump();
  });
}

/** Called from the shutdown path so a live child does not keep the worker from exiting. */
export function stopExtractPool() {
  recycleChild("shutdown", new ApiError(503, "Server is shutting down."));
}
