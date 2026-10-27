import { fork, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";

import type { AtsLayoutSignals } from "@veriworkly/ats-engine";
import type {
  AtsExtractRequest,
  AtsExtractResponse,
  AtsResumeFormat,
} from "@veriworkly/ats-engine/node";

import { parseIntegerEnv } from "#config/parseEnv";
import { logger } from "#lib/logger";
import { ApiError } from "#lib/errors";

type AtsExtractOutcome = { text: string; layout?: AtsLayoutSignals };

const EXTRACTION_TIMEOUT_MS = 20_000;

/**
 * V-033: the resident memory the extraction child may reach before it is killed.
 *
 * `--max-old-space-size` caps V8's heap only; the pixels pdf.js decodes for its image pass are
 * ArrayBuffers outside it, and six 48 MP pages held 1.4 GB. The child polls its own RSS and
 * exits with `RSS_EXIT_CODE` past the cap; the job it was on fails with 422 and keeps its
 * upload charge, like any other file the server could not read. `ATS_EXTRACT_MAX_RSS_MB`
 * (megabytes, default 512) is read at each fork so it needs no restart to change. A child busy
 * in one long synchronous decode cannot poll; the extraction timeout above remains the backstop.
 * The real fix is `maxImageSize` upstream in `@veriworkly/ats-engine`'s `readPdf`.
 */
const DEFAULT_MAX_RSS_MB = 512;
const RSS_EXIT_CODE = 97;
const RSS_POLL_MS = 250;

function maxRssBytes() {
  const megabytes = parseIntegerEnv(process.env.ATS_EXTRACT_MAX_RSS_MB, DEFAULT_MAX_RSS_MB);
  return Math.max(1, megabytes) * 1024 * 1024;
}

/**
 * The watchdog as a `data:` module for `--import`: nothing to resolve on disk, so it works the
 * same under `tsx`, the compiled build and the tests. It checks once at startup and then on an
 * unreferenced interval, so it never keeps the child alive on its own.
 */
function rssWatchdogModule(capBytes: number) {
  const source =
    `const cap=${capBytes},code=${RSS_EXIT_CODE};` +
    `const check=()=>{if(process.memoryUsage.rss()>cap)process.exit(code)};` +
    `check();setInterval(check,${RSS_POLL_MS}).unref();`;
  return `data:text/javascript,${encodeURIComponent(source)}`;
}
// Three waiting behind the one in progress: the last waits at most 4 × 20 s = 80 s, inside
// Cloudflare's 100 s, where eight could wait 160 s and be answered 524 while still charged.
const MAX_QUEUE_DEPTH = 3;

type PendingJob = {
  id: number;
  format: AtsResumeFormat;
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
 * The extraction child is the package's compiled `node/child.js`.
 *
 * It used to be a sibling of this file, forked by extension: compiled `.js` in a production
 * build, the `.ts` source everywhere else. The source never started. `fork` with an explicit
 * `execArgv` replaces the parent's, so `tsx`'s loader was dropped in development, and Node
 * before 23.6 (CI and the image both run 22) cannot run `.ts` on its own — PDF and DOCX extraction
 * failed under `npm run dev`, and the tests that cover it failed in CI. Compiled JavaScript
 * needs no loader.
 *
 * Resolved on first use, not at import: a missing or stale package build then fails resume
 * extraction with a 503, rather than the whole server at boot.
 */
let childEntrypoint: string | null = null;

function resolveChildEntrypoint() {
  childEntrypoint ??= createRequire(import.meta.url).resolve("@veriworkly/ats-engine/node/child");
  return childEntrypoint;
}

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

/**
 * Tears the child down and fails the job it was on. Called on timeout (the child is stuck in a
 * pathological parse and killing it is the only way to reclaim the CPU) and on unexpected exit.
 * The jobs queued behind it did nothing wrong: a fresh child takes them. Only shutdown
 * (`everyone`) fails them too; before, one slow or crashing file failed every upload behind it.
 */
function recycleChild(reason: string, error: ApiError, everyone = false) {
  const victim = child;
  child = null;

  clearTimer();

  const failed = current;
  current = null;

  const queued = everyone ? queue.splice(0, queue.length) : [];

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

  if (!everyone) pump();
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

  const proc = fork(resolveChildEntrypoint(), {
    // No stdio from the child; it communicates over the IPC channel only.
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    // Caps a decompression bomb rather than letting it consume host memory; the watchdog caps
    // what lives outside the V8 heap.
    execArgv: ["--max-old-space-size=256", `--import=${rssWatchdogModule(maxRssBytes())}`],
  });
  child = proc;

  proc.on("message", handleMessage as (message: unknown) => void);

  // Events from a child that has already been replaced say nothing about the current one
  // (V-331): an idle child killed from outside disconnects first, the next upload forks a new
  // one, and the old one's late `exit` used to recycle the new child and fail that upload.
  proc.on("exit", (code, signal) => {
    if (proc !== child) return;
    // Only meaningful if it died while we still had work; an idle child exiting is harmless and
    // the next request simply forks a new one.
    if (current || queue.length)
      recycleChild(
        `child exited (code=${code}, signal=${signal})`,
        code === RSS_EXIT_CODE
          ? new ApiError(422, "This file is too complex to read.")
          : new ApiError(400, "Resume file could not be read."),
      );
    else child = null;
  });

  proc.on("error", (error) => {
    if (proc !== child) return;
    recycleChild(
      `child error: ${error.message}`,
      new ApiError(503, "Resume extraction is temporarily unavailable."),
    );
  });

  return proc;
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
    } satisfies AtsExtractRequest);
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
  format: AtsResumeFormat,
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

/** For `/health/metrics`: jobs waiting (new ones are refused at `max`) and whether one is running. */
export function getExtractQueueStats() {
  return { depth: queue.length, max: MAX_QUEUE_DEPTH, inFlight: current ? 1 : 0 };
}

/** Called from the shutdown path so a live child does not keep the worker from exiting. */
export function stopExtractPool() {
  recycleChild("shutdown", new ApiError(503, "Server is shutting down."), true);
}
