import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * V-211: a fault in a worker (uncaughtException / unhandledRejection) must run the worker's
 * graceful drain, not an instant `process.exit(1)`: the request in flight finishes, the running
 * jobs stop and release their locks, and the buffered audit rows are flushed before the pool
 * closes. Only the cluster primary, which serves nothing, exits on the spot.
 *
 * `src/index.ts` runs `main()` on import, so each test imports it fresh with its collaborators
 * mocked and `process.on` / `process.exit` captured: the real process never gets a handler.
 */

const state = vi.hoisted(() => ({
  throngOptions: undefined as
    | undefined
    | {
        master: () => void;
        worker: (id: number, disconnect: () => void) => void;
      },
  server: undefined as Server | undefined,
  releaseRequest: undefined as undefined | (() => void),
  requestStarted: undefined as undefined | (() => void),
  events: [] as string[],
  redisBootError: undefined as Error | undefined,
  RedisConfigError: class RedisConfigError extends Error {},
  installWorkerRespawn: vi.fn((..._args: unknown[]) => ({ stop: () => undefined })),
}));

vi.mock("throng", () => ({
  default: vi.fn((options: typeof state.throngOptions) => {
    state.throngOptions = options;
    return Promise.resolve();
  }),
}));

vi.mock("#app", async () => {
  const express = (await import("express")).default;
  const app = express();
  app.get("/slow", async (_req, res) => {
    state.requestStarted?.();
    await new Promise<void>((resolve) => (state.releaseRequest = resolve));
    state.events.push("request finished");
    res.json({ ok: true });
  });
  // A billed AI call: it holds a reservation until its signal fires, then releases it and answers.
  app.get("/ai", async (_req, res) => {
    const { aiRequestSignal } = await import("#services/ats/aiDeadline");
    const signal = aiRequestSignal(res);
    state.requestStarted?.();
    await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve()));
    state.events.push("ai aborted, reservation released");
    res.status(504).json({ ok: false });
  });
  const listen = app.listen.bind(app);
  app.listen = ((...args: Parameters<typeof listen>) => {
    state.server = listen(...args);
    return state.server;
  }) as typeof app.listen;
  return { app, default: app };
});

vi.mock("#lib/redis", () => ({
  RedisConfigError: state.RedisConfigError,
  initRedis: vi.fn(async () => {
    if (state.redisBootError) throw state.redisBootError;
  }),
  closeRedis: vi.fn(async () => void state.events.push("redis closed")),
}));
vi.mock("#lib/prisma", () => ({
  closePrisma: vi.fn(async () => void state.events.push("prisma closed")),
}));
vi.mock("#lib/metrics", () => ({ markJobsBaseline: vi.fn(async () => undefined) }));
vi.mock("#lib/workerRespawn", () => ({
  FATAL_CONFIG_EXIT_CODE: 78,
  installWorkerRespawn: state.installWorkerRespawn,
}));
vi.mock("#middleware/logging", () => ({
  flushAuditLogs: vi.fn(async () => void state.events.push("audit flushed")),
}));
vi.mock("#jobs/scheduledJobs", () => ({
  startScheduledJobs: vi.fn(),
  stopScheduledJobs: vi.fn(async () => void state.events.push("jobs stopped, locks released")),
}));
vi.mock("#services/ats/extractPool", () => ({ stopExtractPool: vi.fn() }));
vi.mock("#services/aiPolicy", () => ({ validateAiRuntimeConfig: vi.fn() }));
vi.mock("#services/ats/aiPolicy", () => ({ validateAtsAiRuntimeConfig: vi.fn() }));
vi.mock("#services/ats/enginePolicy", () => ({ validateAtsEngineRuntimeConfig: vi.fn() }));
vi.mock("#auth/runtime", () => ({
  ensureAdminUserExists: vi.fn(async () => undefined),
  validateAuthRuntimeConfig: vi.fn(),
}));
vi.mock("#config/validateRuntimeConfig", () => ({
  validateBillingAndStorageRuntimeConfig: vi.fn(),
  validateEnvironmentConfig: vi.fn(),
}));

type Handler = (...args: unknown[]) => void;
let handlers: Record<string, Handler[]>;
let exit: ReturnType<typeof vi.fn>;

/** What Node does on a fault: every registered listener runs. */
function emit(event: "uncaughtException" | "unhandledRejection", value: unknown) {
  for (const handler of handlers[event] ?? []) handler(value);
}

async function bootIndex(clusteringEnabled: boolean) {
  vi.resetModules();
  const { config } = await import("#config");
  config.server.clusteringEnabled = clusteringEnabled;
  config.server.workers = 2;
  config.port = 0;
  await import("../../src/index.js");
}

async function waitFor(check: () => boolean, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("timed out");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

beforeEach(() => {
  state.throngOptions = undefined;
  state.server = undefined;
  state.events = [];
  state.redisBootError = undefined;
  handlers = {};
  vi.spyOn(process, "on").mockImplementation(((event: string, handler: Handler) => {
    (handlers[event] ??= []).push(handler);
    return process;
  }) as typeof process.on);
  exit = vi.fn((code?: number) => void state.events.push(`exit ${code}`));
  vi.spyOn(process, "exit").mockImplementation(exit as unknown as typeof process.exit);
});

afterEach(async () => {
  state.releaseRequest?.();
  state.server?.closeAllConnections();
  if (state.server?.listening) await new Promise((resolve) => state.server!.close(resolve));
});

/** Starts a request that stays open until `state.releaseRequest` is called. */
async function openRequest(path = "/slow"): Promise<{ response: Promise<Response> }> {
  await waitFor(() => Boolean(state.server?.listening));
  const { port } = state.server!.address() as AddressInfo;
  const started = new Promise<void>((resolve) => (state.requestStarted = resolve));
  const response = fetch(`http://127.0.0.1:${port}${path}`);
  await started;
  return { response };
}

describe("worker faults drain gracefully (V-211)", () => {
  it("a clustered worker's fault finishes the request, stops jobs and flushes audit rows before exiting", async () => {
    await bootIndex(true);

    // `main()` runs in every process, the workers included: it must not install exit-now handlers.
    expect(handlers.uncaughtException ?? []).toHaveLength(0);
    expect(handlers.unhandledRejection ?? []).toHaveLength(0);

    const disconnect = vi.fn(() => void state.events.push("disconnected"));
    state.throngOptions!.worker(2, disconnect);
    const { response } = await openRequest();

    emit("uncaughtException", new Error("boom"));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(exit).not.toHaveBeenCalled();

    state.releaseRequest!();
    expect((await response).status).toBe(200);
    await waitFor(() => exit.mock.calls.length > 0);

    expect(state.events).toEqual([
      "jobs stopped, locks released",
      "request finished",
      "redis closed",
      "audit flushed",
      "prisma closed",
      "disconnected",
      "exit 1",
    ]);
  });

  it("an unhandled rejection in a single-process server drains the same way", async () => {
    await bootIndex(false);
    const { response } = await openRequest();

    emit("unhandledRejection", new Error("forgotten promise"));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(exit).not.toHaveBeenCalled();

    state.releaseRequest!();
    expect((await response).status).toBe(200);
    await waitFor(() => exit.mock.calls.length > 0);

    // The single-process "disconnect" is process.exit itself; the first call ends the process.
    expect(state.events.slice(0, 6)).toEqual([
      "jobs stopped, locks released",
      "request finished",
      "redis closed",
      "audit flushed",
      "prisma closed",
      "exit 1",
    ]);
  });

  it("the cluster primary, which serves nothing, exits at once on its own fault", async () => {
    await bootIndex(true);
    state.throngOptions!.master();

    emit("uncaughtException", new Error("primary boom"));
    expect(exit).toHaveBeenCalledWith(1);
    emit("unhandledRejection", new Error("primary rejection"));
    expect(exit).toHaveBeenCalledTimes(2);
  });
});

describe("a Redis credentials error at boot is fatal, not a respawn loop (V-254)", () => {
  it("the worker exits with the configuration code", async () => {
    state.redisBootError = new state.RedisConfigError("Redis refused the connection: WRONGPASS");
    await bootIndex(false);

    await waitFor(() => exit.mock.calls.length > 0);
    expect(exit).toHaveBeenCalledWith(78);
  });

  it("the primary exits with that code instead of reviving the worker", async () => {
    await bootIndex(true);
    state.throngOptions!.master();

    const options = state.installWorkerRespawn.mock.calls.at(-1)![1] as {
      onFatal: (code: number) => void;
    };
    options.onFatal(78);
    expect(exit).toHaveBeenCalledWith(78);
  });
});

describe("a drain never closes Redis and Postgres under a request still running (V-313)", () => {
  /** Real I/O, fake clocks: the drain's grace timers are what is under test. */
  function fakeClocks() {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
  }
  afterEach(() => void vi.useRealTimers());

  it("an AI call still running at the HTTP grace is aborted and releases its reservation before the pools close", async () => {
    await bootIndex(false);
    const { response } = await openRequest("/ai");
    fakeClocks();

    emit("unhandledRejection", new Error("deploy"));
    await vi.advanceTimersByTimeAsync(9_000);
    expect(state.events).not.toContain("redis closed");

    await vi.advanceTimersByTimeAsync(1_500);
    expect((await response).status).toBe(504);
    await vi.advanceTimersByTimeAsync(500);
    await vi.waitFor(() => expect(exit).toHaveBeenCalled());

    const released = state.events.indexOf("ai aborted, reservation released");
    expect(released).toBeGreaterThanOrEqual(0);
    expect(released).toBeLessThan(state.events.indexOf("redis closed"));
    expect(state.events.indexOf("redis closed")).toBeLessThan(
      state.events.indexOf("prisma closed"),
    );
  });

  it("a request that outlives the HTTP grace keeps Redis and Postgres open until it ends", async () => {
    await bootIndex(false);
    const { response } = await openRequest("/slow");
    fakeClocks();

    emit("unhandledRejection", new Error("deploy"));
    await vi.advanceTimersByTimeAsync(15_000);
    // Past the HTTP grace, but the request is still running: its queries need the pool.
    expect(state.events).not.toContain("redis closed");
    expect(state.events).not.toContain("prisma closed");

    state.releaseRequest!();
    expect((await response).status).toBe(200);
    await vi.advanceTimersByTimeAsync(500);
    await vi.waitFor(() => expect(exit).toHaveBeenCalled());
    expect(state.events.indexOf("request finished")).toBeLessThan(
      state.events.indexOf("redis closed"),
    );
  });

  it("a request that never ends is cut off at the hard cap, before throng's force kill", async () => {
    await bootIndex(false);
    const { response } = await openRequest("/slow");
    response.catch(() => undefined);
    fakeClocks();

    emit("unhandledRejection", new Error("deploy"));
    await vi.advanceTimersByTimeAsync(30_000);
    await vi.waitFor(() => expect(state.events).toContain("prisma closed"));
    expect(state.events).not.toContain("request finished");
  });
});
