import { afterEach, describe, expect, it, vi } from "vitest";

import { getRedis } from "#lib/redis";
import { withJobLock } from "#lib/jobLock";
import { getJobLastSuccess } from "#lib/metrics";
import { ShareService } from "#services/shareService";
import { startViewsFlushJob, stopViewsFlushJob } from "#jobs/viewsFlushJob";

/**
 * V-127 / Phase 4: the cron locks are token-checked but were never renewed, so a run that outlived
 * its TTL let a second runner start beside it. These run against real Redis because the point is
 * the Lua scripts and the TTL arithmetic, not the call shape.
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("withJobLock", () => {
  afterEach(async () => {
    await getRedis().flushDb();
  });

  it("renews the lock while a run outlives its TTL, so a second runner does not start", async () => {
    const key = "test:job-lock:renew";
    const second = vi.fn(async () => "second");

    // V-362: a 1.5 s TTL renewed every 300 ms, so a stall shorter than a second on a busy runner
    // cannot let the key lapse; the check comes after two full TTLs.
    const first = withJobLock(key, { ttlMs: 1_500, renewEveryMs: 300 }, async () => {
      await sleep(4_000);
      return "first";
    });

    // Well past the 1.5 s TTL: without renewal the key would be gone by now.
    await sleep(3_200);
    expect(await getRedis().pTTL(key)).toBeGreaterThan(0);
    await expect(withJobLock(key, { ttlMs: 1_500 }, second)).resolves.toBeUndefined();
    expect(second).not.toHaveBeenCalled();

    await expect(first).resolves.toBe("first");
    // Released with compare-and-delete once the run finished.
    expect(await getRedis().exists(key)).toBe(0);
  });

  it("a runner that lost its lock sees stillOwner() false, stops, and never deletes the new holder's lock", async () => {
    const key = "test:job-lock:lost";
    let pages = 0;

    const run = withJobLock(key, { ttlMs: 2_000, renewEveryMs: 100 }, async (stillOwner) => {
      // A long job checking ownership between pages.
      while (await stillOwner()) {
        pages += 1;
        if (pages > 100) return "ran to the end";
        await sleep(50);
      }
      return "stopped";
    });

    await sleep(200);
    // Another worker took the key (e.g. it expired during a Redis stall and was re-acquired).
    await getRedis().set(key, "someone-else", { PX: 5_000 });

    await expect(run).resolves.toBe("stopped");
    expect(pages).toBeLessThan(100);

    // Neither the renewal nor the release touched the other holder's key.
    await sleep(250);
    expect(await getRedis().get(key)).toBe("someone-else");
  });

  it("stillOwner() is false once the key was deleted out from under the run", async () => {
    const key = "test:job-lock:deleted";

    const result = await withJobLock(key, { ttlMs: 2_000 }, async (stillOwner) => {
      const before = await stillOwner();
      await getRedis().del(key);
      return [before, await stillOwner()];
    });

    expect(result).toEqual([true, false]);
  });

  it("release never deletes a lock another holder now owns", async () => {
    const key = "test:job-lock:release";

    await withJobLock(key, { ttlMs: 5_000 }, async () => {
      await getRedis().set(key, "someone-else", { PX: 5_000 });
    });

    expect(await getRedis().get(key)).toBe("someone-else");
  });

  it("never rejects when the job throws, and still releases", async () => {
    const key = "test:job-lock:throws";

    await expect(
      withJobLock(key, { ttlMs: 5_000 }, async () => {
        throw new Error("boom");
      }),
    ).resolves.toBeUndefined();

    expect(await getRedis().exists(key)).toBe(0);
  });
});

describe("job stop() drains the in-flight run", () => {
  it("stopViewsFlushJob resolves only after the running flush finishes", async () => {
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => (finish = resolve));
    let pruneStarted = false;

    vi.spyOn(ShareService, "pruneShareViews").mockImplementation(async () => {
      pruneStarted = true;
      await gate;
      return 0 as never;
    });

    startViewsFlushJob(); // fires the startup run
    await vi.waitFor(() => expect(pruneStarted).toBe(true), { timeout: 5_000 });

    let stopped = false;
    const stopping = Promise.resolve(stopViewsFlushJob()).then(() => (stopped = true));

    await sleep(200);
    expect(stopped).toBe(false);

    finish();
    await stopping;
    expect(stopped).toBe(true);
    expect(await getRedis().exists("views:flush:lock")).toBe(0);
  });
});

describe("withJobLock job health", () => {
  afterEach(async () => {
    await getRedis().flushDb();
  });

  // Each case uses its own job name: successes live in a process-wide map.
  it("records a success only when a run finishes without throwing while holding the lock", async () => {
    await withJobLock("test:health:ok", { ttlMs: 2_000, job: "views-flush" }, async () => "done");
    expect((await getJobLastSuccess()).has("views-flush")).toBe(true);

    await withJobLock("test:health:throws", { ttlMs: 2_000, job: "usage-metrics" }, async () => {
      throw new Error("boom");
    });
    expect((await getJobLastSuccess()).has("usage-metrics")).toBe(false);

    await getRedis().set("test:health:held", "someone-else", { PX: 5_000 });
    await withJobLock("test:health:held", { ttlMs: 2_000, job: "credit-sweep" }, async () => "x");
    expect((await getJobLastSuccess()).has("credit-sweep")).toBe(false);

    await withJobLock("test:health:lost", { ttlMs: 2_000, job: "retention" }, async () => {
      await getRedis().set("test:health:lost", "someone-else", { PX: 5_000 });
    });
    expect((await getJobLastSuccess()).has("retention")).toBe(false);
  });
});
