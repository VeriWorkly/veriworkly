import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { config } from "#config";
import { prisma } from "#lib/prisma";
import { fetchGitHubApi } from "#services/github/client";
import { getRedis } from "#lib/redis";
import { syncChangelogFromGitHubReleases } from "#services/changelog/index";
import { syncGitHubStatsFromGitHub } from "#services/github/index";
import { runGitHubSync } from "#jobs/githubSyncJob";
import { beginDrain, resetShutdownSignalForTests } from "#lib/shutdown";

import { STUDIO_ORIGIN } from "./env.js";

/**
 * V-056, V-057, V-059 and V-060 through the real stores. GitHub is mocked at the HTTP boundary
 * (`fetch`), so the sync, the client and the changelog read path are all real.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const issue = (id: number) => ({
  id,
  number: id,
  title: `Issue ${id}`,
  state: "open",
  labels: [],
  html_url: `https://github.com/x/y/issues/${id}`,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
});

const original = { ...config.github };

beforeEach(async () => {
  await prisma.gitHubSync.deleteMany();
  Object.assign(config.github, { owner: "x", repo: "y", token: "token" });
});

afterEach(() => {
  Object.assign(config.github, original);
  vi.useRealTimers();
});

describe("GitHub issue sync", () => {
  it("fetches incrementally from when the previous fetch started, not when it finished (V-056)", async () => {
    const urls: string[] = [];
    let firstFetchAt = 0;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      urls.push(String(input));
      if (!firstFetchAt) firstFetchAt = Date.now();
      // A slow fetch: anything updated meanwhile is newer than the fetch start.
      await new Promise((resolve) => setTimeout(resolve, 60));
      return json(urls.length === 1 ? [issue(1)] : []);
    });

    const testStart = Date.now();
    await syncGitHubStatsFromGitHub();
    await syncGitHubStatsFromGitHub();

    expect(urls[0]).not.toContain("since=");
    // The cursor goes back 5 minutes to cover clock skew between this host and GitHub.
    const since = new Date(new URL(urls[1]).searchParams.get("since")!).getTime() + 5 * 60_000;
    expect(since).toBeGreaterThanOrEqual(testStart);
    expect(since).toBeLessThanOrEqual(firstFetchAt);
  });

  it("the cron runs one full sync per UTC day and is incremental otherwise", async () => {
    const urls: string[] = [];
    let page: unknown[] = [issue(1), issue(2)];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      urls.push(String(input));
      return json(page);
    });
    const githubIds = async () =>
      (await prisma.gitHubSyncItem.findMany({ orderBy: { githubId: "asc" } })).map(
        (item) => item.githubId,
      );

    // First run of the day: full.
    await runGitHubSync("cron");
    expect(urls.at(-1)).not.toContain("since=");
    expect(await githubIds()).toEqual(["1", "2"]);

    // Later runs the same day: incremental, so they cannot reconcile deletions.
    page = [];
    await runGitHubSync("cron");
    expect(urls.at(-1)).toContain("since=");
    expect(await githubIds()).toEqual(["1", "2"]);

    // The last full sync was yesterday: the next cron run is full and drops issue 2, which was
    // deleted or transferred on GitHub.
    const row = await prisma.gitHubSync.findFirstOrThrow();
    await prisma.gitHubSync.update({
      where: { id: row.id },
      data: {
        data: {
          ...(row.data as object),
          lastFullSyncAt: new Date(Date.now() - 24 * 3_600_000).toISOString(),
        },
      },
    });
    page = [issue(1)];
    await runGitHubSync("cron");
    expect(urls.at(-1)).not.toContain("since=");
    expect(await githubIds()).toEqual(["1"]);

    // And it counts as today's full sync.
    page = [];
    await runGitHubSync("cron");
    expect(urls.at(-1)).toContain("since=");
  });

  it("records ok on success and error with the message on failure (V-059)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json([issue(1)]));
    await syncGitHubStatsFromGitHub();

    let row = await prisma.gitHubSync.findFirstOrThrow();
    expect(row.lastSyncStatus).toBe("ok");
    expect(row.lastError).toBeNull();
    const syncedAt = row.syncedAt.getTime();

    fetchSpy.mockImplementation(async () => json({ message: "Not Found" }, 404));
    await expect(syncGitHubStatsFromGitHub()).rejects.toThrow(/GitHub API communication failed/);

    row = await prisma.gitHubSync.findFirstOrThrow();
    expect(row.lastSyncStatus).toBe("error");
    expect(row.lastError).toMatch(/GitHub API communication failed/);
    expect(row.lastError!.length).toBeLessThanOrEqual(500);
    // A failure must not look like freshness to the startup check.
    expect(row.syncedAt.getTime()).toBe(syncedAt);

    fetchSpy.mockImplementation(async () => json([]));
    await syncGitHubStatsFromGitHub();
    row = await prisma.gitHubSync.findFirstOrThrow();
    expect(row.lastSyncStatus).toBe("ok");
    expect(row.lastError).toBeNull();
  });
});

describe("GitHub issue sync lost lock", () => {
  it("leaves the sync row alone when the lock is lost, but still records real failures", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json([issue(1)]));
    await syncGitHubStatsFromGitHub();
    const before = await prisma.gitHubSync.findFirstOrThrow();
    expect(before.lastSyncStatus).toBe("ok");

    // Another runner takes the lock while this one is fetching.
    fetchSpy.mockImplementation(async () => {
      await getRedis().set("github:sync:lock", "someone-else", { PX: 10_000 });
      return json([issue(2)]);
    });
    await expect(syncGitHubStatsFromGitHub()).rejects.toMatchObject({ statusCode: 409 });

    const after = await prisma.gitHubSync.findFirstOrThrow();
    expect(after.lastSyncStatus).toBe("ok");
    expect(after.lastError).toBeNull();
    expect(after.etag).toBe(before.etag);
    // The lock is the other runner's, and release did not delete it.
    expect(await getRedis().get("github:sync:lock")).toBe("someone-else");
    await getRedis().del("github:sync:lock");

    fetchSpy.mockImplementation(async () => json({ message: "Not Found" }, 404));
    await expect(syncGitHubStatsFromGitHub()).rejects.toThrow(/GitHub API communication failed/);
    expect((await prisma.gitHubSync.findFirstOrThrow()).lastSyncStatus).toBe("error");
  });
});

describe("GitHub issue sync and a worker that is shutting down (V-342)", () => {
  it("stops between pages without writing an error over the sync row", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json([issue(1)]));
    await syncGitHubStatsFromGitHub();
    const before = await prisma.gitHubSync.findFirstOrThrow();

    // A full first page, so the sync asks for a second one; the drain starts meanwhile.
    fetchSpy.mockImplementation(async () => {
      beginDrain();
      return json(Array.from({ length: 100 }, (_, index) => issue(index + 10)));
    });
    try {
      await expect(syncGitHubStatsFromGitHub(true)).rejects.toMatchObject({ statusCode: 503 });
    } finally {
      resetShutdownSignalForTests();
    }

    const after = await prisma.gitHubSync.findFirstOrThrow();
    expect(after.lastSyncStatus).toBe("ok");
    expect(after.etag).toBe(before.etag);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe("GitHub issue sync completion (V-338)", () => {
  const closed = (id: number, extra: Record<string, unknown>) => ({
    ...issue(id),
    state: "closed",
    ...extra,
  });

  it("does not count issues closed as not planned or pull requests closed unmerged as done", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () =>
        json([
          issue(1),
          closed(2, { state_reason: "completed" }),
          closed(3, { state_reason: "not_planned" }),
          closed(4, { pull_request: { merged_at: null } }),
          closed(5, { pull_request: { merged_at: "2026-01-02T00:00:00Z" } }),
        ]),
      );
    await syncGitHubStatsFromGitHub(true);

    const ids = async () =>
      (await prisma.gitHubSyncItem.findMany({ orderBy: { number: "asc" } })).map(
        (item) => item.number,
      );
    expect(await ids()).toEqual([1, 2, 5]);
    const sync = await prisma.gitHubSync.findFirstOrThrow();
    expect({ total: sync.issueCount, done: sync.doneCount }).toEqual({ total: 3, done: 2 });

    // Closed as not planned later: an incremental sync drops the item it already stored.
    fetchSpy.mockImplementation(async () => json([closed(1, { state_reason: "not_planned" })]));
    await syncGitHubStatsFromGitHub(false);
    expect(await ids()).toEqual([2, 5]);
  });
});

describe("GitHub client", () => {
  it("retries a network error twice, then fails naming the URL (V-057)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    const assertion = expect(fetchGitHubApi("https://api.github.com/x")).rejects.toMatchObject({
      statusCode: 502,
      details: { url: "https://api.github.com/x", cause: "fetch failed" },
    });
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});

describe("/changelog/stats", () => {
  it("makes no GitHub call on a cold cache (V-060)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json([]));

    const res = await request(app).get("/api/v1/changelog/stats").set("Origin", STUDIO_ORIGIN);

    expect(res.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.body.data.contributorCount).toBeGreaterThan(0);
  });

  it("serves the contributors the sync stored and keeps them when a later fetch fails (V-060)", async () => {
    const stats = async () =>
      (await request(app).get("/api/v1/changelog/stats").set("Origin", STUDIO_ORIGIN)).body.data;
    const logins = (data: { topContributors: Array<{ login: string }> }) =>
      data.topContributors.map((c) => c.login);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).includes("/contributors")
        ? json([
            {
              login: "zz-newcomer",
              avatar_url: "https://a/x.png",
              html_url: "https://github.com/zz-newcomer",
              contributions: 3,
              type: "User",
            },
          ])
        : json([]),
    );
    await syncChangelogFromGitHubReleases();
    expect((await stats()).contributorCount).toBeGreaterThan(0);
    expect(logins(await stats())).toContain("zz-newcomer");

    // The next sync's contributor fetch fails: the stored list must survive.
    await getRedis().del("github:repo:contributors:x:y");
    fetchSpy.mockImplementation(async (input) =>
      String(input).includes("/contributors") ? json({ message: "Not Found" }, 404) : json([]),
    );
    await syncChangelogFromGitHubReleases();
    expect(logins(await stats())).toContain("zz-newcomer");
  });

  it("the sync fetches contributors live, not from the 24 h contributors cache", async () => {
    const contributor = (login: string) => ({
      login,
      avatar_url: `https://a/${login}.png`,
      html_url: `https://github.com/${login}`,
      contributions: 3,
      type: "User",
    });
    // Left by an earlier read: without a bypass the sync would store this day-old list again.
    await getRedis().set(
      "github:repo:contributors:x:y",
      JSON.stringify([
        {
          login: "zz-stale",
          avatarUrl: "https://a/s.png",
          htmlUrl: "https://github.com/zz-stale",
          contributions: 1,
        },
      ]),
      { EX: 3600 },
    );
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).includes("/contributors") ? json([contributor("zz-fresh")]) : json([]),
    );

    await syncChangelogFromGitHubReleases();

    const res = await request(app).get("/api/v1/changelog/stats").set("Origin", STUDIO_ORIGIN);
    const logins = (res.body.data.topContributors as Array<{ login: string }>).map((c) => c.login);
    expect(logins).toContain("zz-fresh");
    expect(logins).not.toContain("zz-stale");
  });
});
