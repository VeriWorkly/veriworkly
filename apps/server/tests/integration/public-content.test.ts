import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { config } from "#config";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { fetchGitHubApi, GITHUB_PROJECT_URL } from "#services/github/index";
import { syncChangelogFromGitHubReleases } from "#services/changelog/index";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * Public content contracts (Phase 2 items 6 and 10): GitHub board, roadmap and changelog reads
 * as the site calls them, the admin roadmap/changelog writes as the studio sends them, and the
 * GitHub client and changelog sync at the fetch boundary. V-054, V-055, V-057, V-061..V-064,
 * V-067, V-083, V-084, V-158, V-164.
 */

const API = "/api/v1";

const publicGet = (url: string) => request(app).get(url).set("Origin", STUDIO_ORIGIN);

let adminPromise: Promise<TestUser> | undefined;
const adminUser = () =>
  (adminPromise ??= createUserWithSession({ email: "admin@example.test", emailVerified: true }));

async function asAdmin() {
  const admin = await adminUser();
  return {
    post: (url: string) =>
      request(app).post(url).set("Origin", STUDIO_ORIGIN).set("Cookie", admin.cookie),
    put: (url: string) =>
      request(app).put(url).set("Origin", STUDIO_ORIGIN).set("Cookie", admin.cookie),
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

beforeEach(async () => {
  await prisma.gitHubSync.deleteMany();
  await prisma.roadmapFeature.deleteMany();
  await prisma.changelogEntry.deleteMany();
});

/** A fixed permutation (i * 7 mod n, 7 coprime to 30) that is neither sorted nor reversed. */
function scrambled<T>(items: T[]): T[] {
  return items.map((_, i) => items[(i * 7) % items.length]);
}

afterEach(async () => {
  vi.restoreAllMocks();
  await getRedis().flushDb();
});

describe("GET /github/stats and /github/issues (V-054, V-064, V-062)", () => {
  it("keeps the legacy project key when GITHUB_PROJECT_URL is unset, so stored stats still serve", () => {
    expect(GITHUB_PROJECT_URL).toBe("");
  });

  async function seedSync() {
    const nextSyncAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const sync = await prisma.gitHubSync.create({
      data: {
        projectName: "VeriWorkly/veriworkly",
        // GITHUB_PROJECT_URL is unset in this suite: the row production already holds under "".
        projectUrl: "",
        issueCount: 3,
        onlyIssueCount: 2,
        prCount: 1,
        todoCount: 1,
        inProgressCount: 1,
        doneCount: 1,
        data: {},
        nextSyncAt,
      },
    });

    const sameUpdatedAt = new Date("2026-09-01T00:00:00.000Z");
    await prisma.gitHubSyncItem.createMany({
      data: [
        {
          syncId: sync.id,
          githubId: "1",
          number: 1,
          title: "Old issue",
          status: "todo",
          kind: "issue",
          url: "https://github.com/x/y/issues/1",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-02-01T00:00:00.000Z"),
        },
        {
          syncId: sync.id,
          githubId: "2",
          number: 2,
          title: "Recent issue",
          status: "in-progress",
          kind: "issue",
          url: "https://github.com/x/y/issues/2",
          // Afternoon of 2026-08-01: a date-only createdTo=2026-08-01 must still include it.
          createdAt: new Date("2026-08-01T15:00:00.000Z"),
          updatedAt: sameUpdatedAt,
        },
        {
          syncId: sync.id,
          githubId: "3",
          number: 3,
          title: "Recent PR",
          status: "done",
          kind: "pull-request",
          url: "https://github.com/x/y/pull/3",
          createdAt: new Date("2026-08-15T00:00:00.000Z"),
          updatedAt: sameUpdatedAt,
        },
      ],
    });

    return { sync, nextSyncAt };
  }

  it("returns totalItems, projectUrl and nextSyncAt (total kept for now)", async () => {
    const { nextSyncAt } = await seedSync();

    const response = await publicGet(`${API}/github/stats`);
    expect(response.status).toBe(200);
    expect(response.body.data.stats.totalItems).toBe(3);
    expect(response.body.data.stats.total).toBe(3);
    expect(response.body.data).toHaveProperty("projectUrl");
    expect(response.body.data.nextSyncAt).toBe(nextSyncAt.toISOString());
  });

  it("returns only public item fields plus a page-level syncedAt", async () => {
    await seedSync();

    const response = await publicGet(`${API}/github/issues`);
    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(3);
    expect(typeof response.body.data.syncedAt).toBe("string");

    for (const item of response.body.data.items) {
      expect(item).not.toHaveProperty("syncId");
      expect(item).not.toHaveProperty("githubId");
      expect(item).not.toHaveProperty("insertedAt");
      expect(Object.keys(item).sort()).toEqual(
        [
          "createdAt",
          "id",
          "kind",
          "labels",
          "number",
          "status",
          "title",
          "updatedAt",
          "url",
        ].sort(),
      );
    }
  });

  it("filters by createdFrom/createdTo/updatedFrom/updatedTo", async () => {
    await seedSync();

    const created = await publicGet(
      `${API}/github/issues?createdFrom=2026-07-01T00:00:00.000Z&createdTo=2026-08-10T00:00:00.000Z`,
    );
    expect(created.status).toBe(200);
    expect(created.body.data.items.map((i: { number: number }) => i.number)).toEqual([2]);

    const updated = await publicGet(`${API}/github/issues?updatedTo=2026-03-01T00:00:00.000Z`);
    expect(updated.status).toBe(200);
    expect(updated.body.data.items.map((i: { number: number }) => i.number)).toEqual([1]);

    const updatedFrom = await publicGet(`${API}/github/issues?updatedFrom=2026-08-31`);
    expect(updatedFrom.status).toBe(200);
    expect(updatedFrom.body.data.total).toBe(2);

    // A bare date as the upper bound covers that whole UTC day.
    const dateOnlyTo = await publicGet(
      `${API}/github/issues?createdFrom=2026-07-01&createdTo=2026-08-01`,
    );
    expect(dateOnlyTo.status).toBe(200);
    expect(dateOnlyTo.body.data.items.map((i: { number: number }) => i.number)).toEqual([2]);

    // None of the date-filtered queries above were cached.
    expect(await getRedis().keys("github:issues:*")).toEqual([]);
  });

  it("rejects an unknown query key and page+offset together with 400", async () => {
    await seedSync();

    expect((await publicGet(`${API}/github/issues?statuss=todo`)).status).toBe(400);
    expect((await publicGet(`${API}/github/issues?page=2&offset=20`)).status).toBe(400);
    expect((await publicGet(`${API}/roadmap?foo=bar`)).status).toBe(400);
    expect((await publicGet(`${API}/roadmap?page=1&offset=0`)).status).toBe(400);
    expect((await publicGet(`${API}/changelog?foo=bar`)).status).toBe(400);
    expect((await publicGet(`${API}/changelog?page=1&offset=0`)).status).toBe(400);

    // A blank value counts as absent, so it is not "both".
    expect((await publicGet(`${API}/roadmap?page=1&offset=`)).status).toBe(200);
    expect((await publicGet(`${API}/github/issues?page=&offset=0`)).status).toBe(200);
  });

  it("pages items with equal updatedAt in a stable (updatedAt desc, id asc) order", async () => {
    const { sync } = await seedSync();
    await prisma.gitHubSyncItem.deleteMany({ where: { syncId: sync.id } });

    const updatedAt = new Date("2026-09-10T00:00:00.000Z");
    const ids = Array.from({ length: 30 }, (_, i) => `gh-tie-${String(i).padStart(2, "0")}`);

    // Inserted in a scrambled order (an index on updatedAt returns equal keys in insertion
    // order, so reverse insertion would read back as id order), then half rewritten: the
    // physical order is neither id order nor its reverse.
    for (const [index, id] of scrambled(ids).entries()) {
      await prisma.gitHubSyncItem.create({
        data: {
          id,
          syncId: sync.id,
          githubId: id,
          number: 100 + index,
          title: id,
          status: "todo",
          kind: "issue",
          url: `https://github.com/x/y/issues/${100 + index}`,
          createdAt: updatedAt,
          updatedAt,
        },
      });
    }
    for (const id of ids.filter((_, i) => i % 2 === 0)) {
      await prisma.gitHubSyncItem.update({ where: { id }, data: { title: `${id} edited` } });
    }

    const seen: string[] = [];
    for (let offset = 0; offset < ids.length; offset += 7) {
      const response = await publicGet(`${API}/github/issues?limit=7&offset=${offset}`);
      expect(response.status).toBe(200);
      seen.push(...response.body.data.items.map((item: { id: string }) => item.id));
    }

    expect(seen).toEqual(ids);
  });
});

describe("roadmap reads (V-062, V-061, V-067)", () => {
  it("pages 30 items with identical createdAt in a stable (createdAt, id asc) order", async () => {
    const createdAt = new Date("2026-05-01T00:00:00.000Z");
    const ids = Array.from({ length: 30 }, (_, i) => `same-${String(i).padStart(2, "0")}`);

    // Inserted in a scrambled order, then half rewritten so those rows move in the heap.
    for (const id of scrambled(ids)) {
      await prisma.roadmapFeature.create({
        data: { id, title: id, description: "Same timestamp", status: "todo", createdAt },
      });
    }
    for (const id of ids.filter((_, i) => i % 2 === 0)) {
      await prisma.roadmapFeature.update({ where: { id }, data: { title: `${id} edited` } });
    }

    for (const sort of ["newest", "oldest"]) {
      const seen: string[] = [];
      for (let offset = 0; offset < ids.length; offset += 7) {
        const response = await publicGet(`${API}/roadmap?sort=${sort}&limit=7&offset=${offset}`);
        expect(response.status).toBe(200);
        seen.push(...response.body.data.items.map((item: { id: string }) => item.id));
      }
      expect(seen).toEqual(ids);
    }
  });

  it("accepts any offset but caches only shallow pages; bounds excludeId and tag", async () => {
    await prisma.roadmapFeature.create({
      data: { id: "deep-a", title: "A", description: "A", status: "todo" },
    });

    expect((await publicGet(`${API}/roadmap?offset=1001`)).status).toBe(200);
    expect((await publicGet(`${API}/changelog?offset=250`)).status).toBe(200);
    expect(await getRedis().keys("roadmap:list:*")).toEqual([]);
    expect(await getRedis().keys("changelog:list:*")).toEqual([]);

    expect((await publicGet(`${API}/roadmap?offset=0`)).status).toBe(200);
    expect(await getRedis().keys("roadmap:list:*")).toHaveLength(1);

    expect((await publicGet(`${API}/roadmap?excludeId=${"x".repeat(101)}`)).status).toBe(400);
    expect((await publicGet(`${API}/changelog?tag=${"t".repeat(61)}`)).status).toBe(400);
  });

  it("does not cache an excludeId query", async () => {
    await prisma.roadmapFeature.create({
      data: { id: "cache-a", title: "A", description: "A", status: "todo" },
    });

    const response = await publicGet(`${API}/roadmap?excludeId=cache-z`);
    expect(response.status).toBe(200);
    expect(await getRedis().keys("roadmap:list:*")).toEqual([]);
  });

  it("feature detail carries no interactions", async () => {
    await prisma.roadmapFeature.create({
      data: { id: "detail-a", title: "A", description: "A", status: "todo" },
    });

    const response = await publicGet(`${API}/roadmap/detail-a`);
    expect(response.status).toBe(200);
    expect(response.body.data).not.toHaveProperty("interactions");
  });
});

describe("admin roadmap and changelog writes (V-063, V-083, V-084)", () => {
  // Every admin write carries its audit reason (V-081).
  const ADMIN_REASON = "Roadmap and changelog upkeep";

  it("creates a roadmap item from the studio payload with null dates (201)", async () => {
    const admin = await asAdmin();

    const response = await admin.post(`${API}/admin/roadmap`).send({
      reason: ADMIN_REASON,
      title: "Studio item",
      description: "From the studio form",
      status: "todo",
      eta: null,
      startedAt: null,
      completedAt: null,
      completedQuarter: null,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.startedAt).toBeNull();
  });

  it("keeps custom keys in details and refuses an oversized details object (V-083)", async () => {
    const admin = await asAdmin();

    const response = await admin.post(`${API}/admin/roadmap`).send({
      reason: ADMIN_REASON,
      title: "With metadata",
      description: "Custom details",
      details: { problem: "Slow exports", rolloutPercent: 25, owner: { team: "core" } },
    });
    expect(response.status).toBe(201);
    expect(response.body.data.details).toEqual({
      problem: "Slow exports",
      rolloutPercent: 25,
      owner: { team: "core" },
    });

    const tooBig = await admin.post(`${API}/admin/roadmap`).send({
      reason: ADMIN_REASON,
      title: "Too big",
      description: "Oversized details",
      details: { blob: "x".repeat(70 * 1024) },
    });
    expect(tooBig.status).toBe(400);

    // Measured in UTF-8 bytes: 40,000 two-byte characters are 80 KB, though only 40,000 chars.
    const multiByte = await admin.post(`${API}/admin/roadmap`).send({
      reason: ADMIN_REASON,
      title: "Too big in bytes",
      description: "Multi-byte details",
      details: { blob: "é".repeat(40_000) },
    });
    expect(multiByte.status).toBe(400);
  });

  it("derives the quarter for done + null, clears it when reopened, keeps an explicit one", async () => {
    const admin = await asAdmin();

    const derived = await admin.post(`${API}/admin/roadmap`).send({
      reason: ADMIN_REASON,
      id: "quarter-a",
      title: "Done, blank quarter",
      description: "Studio sends null for a blank field",
      status: "done",
      completedAt: "2026-05-10T12:00:00Z",
      completedQuarter: null,
    });
    expect(derived.status).toBe(201);
    expect(derived.body.data.completedQuarter).toBe("Q2 2026");

    // The studio prefills the stored quarter, so the reopen carries it; it must still clear.
    const reopened = await admin.put(`${API}/admin/roadmap/quarter-a`).send({
      reason: ADMIN_REASON,
      status: "todo",
      completedQuarter: "Q2 2026",
    });
    expect(reopened.status).toBe(200);
    expect(reopened.body.data.completedQuarter).toBeNull();
    expect(reopened.body.data.completedAt).toBeNull();

    const explicit = await admin.put(`${API}/admin/roadmap/quarter-a`).send({
      reason: ADMIN_REASON,
      status: "done",
      completedAt: "2026-05-10T12:00:00Z",
      completedQuarter: "Q1 2026",
    });
    expect(explicit.status).toBe(200);

    // V-341: a partial update that leaves the quarter out keeps the hand-set one.
    const renamed = await admin
      .put(`${API}/admin/roadmap/quarter-a`)
      .send({ title: "Renamed", reason: ADMIN_REASON });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.completedQuarter).toBe("Q1 2026");
    expect(explicit.body.data.completedQuarter).toBe("Q1 2026");
  });

  it("accepts offset datetimes and honours a sent completedQuarter", async () => {
    const admin = await asAdmin();

    const response = await admin.post(`${API}/admin/roadmap`).send({
      reason: ADMIN_REASON,
      title: "Done item",
      description: "Shipped",
      status: "done",
      startedAt: "2026-03-31T23:30:00-02:00",
      completedAt: "2026-03-31T23:30:00-02:00",
      completedQuarter: "Q4 2025",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.completedQuarter).toBe("Q4 2025");

    const recomputed = await admin.post(`${API}/admin/roadmap`).send({
      reason: ADMIN_REASON,
      title: "Done item, no quarter",
      description: "Shipped",
      status: "done",
      completedAt: "2026-03-31T23:30:00-02:00",
    });

    expect(recomputed.status).toBe(201);
    // 2026-04-01T01:30Z in UTC: the quarter follows UTC, not the server's local zone.
    expect(recomputed.body.data.completedQuarter).toBe("Q2 2026");
  });

  it("clears the ETA when the studio sends eta: null", async () => {
    await prisma.roadmapFeature.create({
      data: { id: "eta-a", title: "A", description: "A", status: "todo", eta: "Q1 2027" },
    });

    const admin = await asAdmin();
    const response = await admin
      .put(`${API}/admin/roadmap/eta-a`)
      .send({ eta: null, reason: ADMIN_REASON });
    expect(response.status).toBe(200);

    const row = await prisma.roadmapFeature.findUniqueOrThrow({ where: { id: "eta-a" } });
    expect(row.eta).toBeNull();
  });

  it("answers a duplicate roadmap id and a duplicate changelog version with 409", async () => {
    const admin = await asAdmin();

    const body = {
      id: "dup-roadmap",
      title: "Dup",
      description: "Dup",
      status: "todo",
      reason: ADMIN_REASON,
    };
    expect((await admin.post(`${API}/admin/roadmap`).send(body)).status).toBe(201);
    expect((await admin.post(`${API}/admin/roadmap`).send(body)).status).toBe(409);

    const entry = { version: "9.9.9", title: "Nine", type: "patch", reason: ADMIN_REASON };
    expect((await admin.post(`${API}/admin/changelog`).send(entry)).status).toBe(201);
    expect(
      (await admin.post(`${API}/admin/changelog`).send({ ...entry, id: "other-id" })).status,
    ).toBe(409);
  });
});

describe("GitHub client and changelog sync at the fetch boundary (V-057, V-158, V-164)", () => {
  it("retries a 403 that carries x-ratelimit-remaining: 0", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("rate limited", {
          status: 403,
          headers: { "x-ratelimit-remaining": "0", "retry-after": "1" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const response = await fetchGitHubApi("https://api.github.com/repos/x/y/issues", "token");
    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("fails at once when the rate limit resets more than 30 s from now", async () => {
    const resetEpoch = Math.floor(Date.now() / 1000) + 3600;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", {
        status: 403,
        headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(resetEpoch) },
      }),
    );

    await expect(
      fetchGitHubApi("https://api.github.com/repos/x/y/issues", "token"),
    ).rejects.toMatchObject({
      statusCode: 502,
      details: { url: "https://api.github.com/repos/x/y/issues", status: 403 },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("does not retry a plain 403 (bad token scope)", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("forbidden", { status: 403 }));

    await expect(
      fetchGitHubApi("https://api.github.com/repos/x/y/issues", "token"),
    ).rejects.toMatchObject({ statusCode: 502 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("wraps a network error in ApiError(502) naming the URL", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    vi.useFakeTimers({ toFake: ["setTimeout"] });

    try {
      const pending = fetchGitHubApi("https://api.github.com/repos/x/y/releases", "token");
      const assertion = expect(pending).rejects.toMatchObject({
        statusCode: 502,
        details: { url: "https://api.github.com/repos/x/y/releases" },
      });
      await vi.runAllTimersAsync();
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("completes when two release tags slugify to the same id", async () => {
    const original = { ...config.github };
    Object.assign(config.github, { owner: "x", repo: "y", token: "token" });

    const release = (id: number, tag: string, publishedAt: string) => ({
      id,
      tag_name: tag,
      name: `${tag} - release`,
      body: "### Added\n- something",
      html_url: `https://github.com/x/y/releases/tag/${tag}`,
      published_at: publishedAt,
      draft: false,
      prerelease: false,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/releases") && url.includes("page=1")) {
        // GitHub lists newest first.
        return jsonResponse([
          release(2, "v3.0.0.1", "2026-09-02T00:00:00Z"),
          release(1, "v3.0.0-1", "2026-09-01T00:00:00Z"),
        ]);
      }
      return jsonResponse([]);
    });

    try {
      const first = await syncChangelogFromGitHubReleases();
      expect(first.created).toBe(1);

      const rows = await prisma.changelogEntry.findMany({ where: { id: "v3-0-0-1" } });
      expect(rows).toHaveLength(1);
      expect(await getRedis().get("changelog:release-sync:last-run")).not.toBeNull();

      const second = await syncChangelogFromGitHubReleases();
      expect(second.created).toBe(0);
    } finally {
      Object.assign(config.github, original);
    }
  });
});

describe("offset paging has an upper bound (V-064)", () => {
  it("answers 400, not 500, to a page or offset past the last row a list serves", async () => {
    for (const query of ["page=1e300", "offset=1e300", "page=99999999"]) {
      const response = await request(app)
        .get(`${API}/roadmap?${query}`)
        .set("Origin", STUDIO_ORIGIN);
      expect(response.status, query).toBe(400);
    }

    const user = await createUserWithSession();
    const keys = await request(app)
      .get(`${API}/api-keys?page=1e300`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);
    expect(keys.status).toBe(400);
    expect(keys.body.details).toEqual([expect.objectContaining({ path: "page" })]);
  });
});
