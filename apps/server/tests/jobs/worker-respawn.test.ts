import { EventEmitter } from "node:events";
import type { Cluster, Worker } from "node:cluster";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { FATAL_CONFIG_EXIT_CODE, installWorkerRespawn, respawnDelayMs } from "#lib/workerRespawn";

/**
 * G LOW: throng revives a dead worker with an immediate `cluster.fork()`, so a boot-time Redis or
 * database failure became a tight fork loop. A worker that dies within 30 s of starting is now
 * revived after 1 s, 2 s, 4 s … capped at 30 s; one that lived longer is revived at once.
 */

describe("respawnDelayMs", () => {
  it("is 0 after a healthy exit and doubles from 1 s per consecutive fast exit, capped at 30 s", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 20].map(respawnDelayMs)).toEqual([
      0, 1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000, 30_000,
    ]);
  });
});

describe("installWorkerRespawn", () => {
  let cluster: EventEmitter & { fork: ReturnType<typeof vi.fn> };
  let nextId = 1;

  const startWorker = () => {
    const worker = { id: nextId++ } as Worker;
    cluster.emit("fork", worker);
    return worker;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    nextId = 1;
    cluster = Object.assign(new EventEmitter(), {
      fork: vi.fn(() => startWorker()),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("backs off on workers that die during boot and resets after a healthy run", () => {
    const respawn = installWorkerRespawn(cluster as unknown as Cluster);

    let worker = startWorker();
    const expected = [1_000, 2_000, 4_000];

    for (const delay of expected) {
      vi.advanceTimersByTime(500);
      cluster.emit("exit", worker, 1, null);

      vi.advanceTimersByTime(delay - 1);
      expect(cluster.fork).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(cluster.fork).toHaveBeenCalledTimes(1);

      worker = cluster.fork.mock.results[0].value as Worker;
      cluster.fork.mockClear();
    }

    // This one stays up past the window: its exit is a crash, not a boot loop, and the counter
    // resets, so the replacement is forked at once.
    vi.advanceTimersByTime(60_000);
    cluster.emit("exit", worker, 1, null);
    expect(cluster.fork).toHaveBeenCalledTimes(1);

    worker = cluster.fork.mock.results[0].value as Worker;
    cluster.fork.mockClear();

    // And the next fast exit starts the schedule from 1 s again.
    vi.advanceTimersByTime(100);
    cluster.emit("exit", worker, 1, null);
    vi.advanceTimersByTime(999);
    expect(cluster.fork).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cluster.fork).toHaveBeenCalledTimes(1);

    respawn.stop();
  });

  it("does not revive anything once shutdown has begun, including a pending backoff", () => {
    const respawn = installWorkerRespawn(cluster as unknown as Cluster);

    const a = startWorker();
    const b = startWorker();

    cluster.emit("exit", a, 1, null); // schedules a revive in 1 s
    respawn.stop();
    cluster.emit("exit", b, 0, "SIGTERM");

    vi.advanceTimersByTime(60_000);
    expect(cluster.fork).not.toHaveBeenCalled();
  });
});

describe("a worker that exits on a fatal configuration error (V-254)", () => {
  it("is not revived: the primary is told to exit, so pm2 shows the app errored", () => {
    const cluster = Object.assign(new EventEmitter(), { fork: vi.fn() });
    const onFatal = vi.fn();
    installWorkerRespawn(cluster as unknown as Cluster, { onFatal });

    cluster.emit("fork", { id: 1 } as Worker);
    cluster.emit("exit", { id: 1 } as Worker, FATAL_CONFIG_EXIT_CODE, null);

    expect(onFatal).toHaveBeenCalledWith(FATAL_CONFIG_EXIT_CODE);
    expect(cluster.fork).not.toHaveBeenCalled();
  });
});
