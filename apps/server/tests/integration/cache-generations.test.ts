import { randomBytes } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { cacheGet, cacheSet, getRedis } from "#lib/redis";
import {
  bumpGeneration,
  generationCounterKey,
  generationalKey,
  getGeneration,
  singleFlight,
} from "#lib/cacheGeneration";
import { cacheNamespaces } from "#lib/cacheKeys";
import { ShareService } from "#services/shareService";
import { PortfolioService } from "#services/portfolioService";
import { getAdminOverview } from "#services/admin/adminOverviewService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * Cache invalidation without keyspace SCANs (V-020/V-079/V-104), the cache-aside repopulation
 * race (V-122), negative caches for unknown API keys and missing shares, and single-flight on
 * the expensive cold reads (V-117). Real Postgres and Redis; the only doubles are spies that
 * count calls or inject a concurrent write between a reader's DB load and its cache write.
 */

function asUser(user: TestUser) {
  return {
    get: (url: string) =>
      request(app).get(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
    post: (url: string) =>
      request(app).post(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
    patch: (url: string) =>
      request(app).patch(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
    delete: (url: string) =>
      request(app).delete(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
  };
}

function publicGet(path: string) {
  return request(app).get(path).set("Origin", STUDIO_ORIGIN);
}

function letters(count: number) {
  return Array.from(randomBytes(count), (b) => String.fromCharCode(97 + (b % 26))).join("");
}

/** Counts every keyspace-walking command issued through the shared client. */
function countKeyspaceScans() {
  const redis = getRedis() as unknown as Record<string, (...args: unknown[]) => unknown>;
  const spies = ["scan", "SCAN", "scanIterator", "keys", "KEYS"]
    .filter((name) => typeof redis[name] === "function")
    .map((name) => vi.spyOn(redis, name as never));

  return () => spies.reduce((total, spy) => total + spy.mock.calls.length, 0);
}

async function createDocument(api: ReturnType<typeof asUser>, title: string) {
  const created = await api
    .post("/api/v1/documents")
    .send({ type: "RESUME", title, content: { basics: { name: "Test" } } });
  expect(created.status).toBe(201);
  return { id: created.body.data.id as string, revision: created.body.data.revision as number };
}

describe("cache invalidation issues no keyspace SCAN", () => {
  it("document create, update, delete and share create/revoke never SCAN", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);

    // Warm the list so there is something to invalidate.
    expect((await api.get("/api/v1/documents")).status).toBe(200);

    const scans = countKeyspaceScans();

    const { id, revision } = await createDocument(api, "First");
    const updated = await api.patch(`/api/v1/documents/${id}`).send({ title: "Second", revision });
    expect(updated.status).toBe(200);

    const share = await api.post("/api/v1/shares").send({ documentId: id, snapshot: { a: 1 } });
    expect(share.status).toBe(201);
    const revoked = await api.delete(
      `/api/v1/shares/documents/${id}/links/${share.body.data.id as string}`,
    );
    expect(revoked.status).toBe(200);

    expect((await api.delete(`/api/v1/documents/${id}`)).status).toBe(200);

    expect(scans()).toBe(0);
  });

  it("a list read after a write returns the new data", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);

    const { id, revision } = await createDocument(api, "Before");
    expect((await api.get("/api/v1/documents")).body.data[0].title).toBe("Before");

    await api.patch(`/api/v1/documents/${id}`).send({ title: "After", revision });
    expect((await api.get("/api/v1/documents")).body.data[0].title).toBe("After");

    await api.delete(`/api/v1/documents/${id}`);
    expect((await api.get("/api/v1/documents")).body.data).toEqual([]);
  });
});

describe("V-122 a reader that loaded before a write cannot cache the stale row", () => {
  it("document: the write lands between the reader's DB load and its cache write", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);
    const { id, revision } = await createDocument(api, "Original");

    const original = prisma.document.findFirst.bind(prisma.document);
    vi.spyOn(prisma.document, "findFirst").mockImplementationOnce((async (args: never) => {
      const stale = await original(args);
      const write = await api.patch(`/api/v1/documents/${id}`).send({ title: "Fresh", revision });
      expect(write.status).toBe(200);
      return stale;
    }) as never);

    const racing = await api.get(`/api/v1/documents/${id}`);
    expect(racing.body.data.title).toBe("Original");

    const next = await api.get(`/api/v1/documents/${id}`);
    expect(next.body.data.title).toBe("Fresh");
  });

  it("document list: same race on the list cache", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);
    const { id, revision } = await createDocument(api, "Original");

    const original = prisma.document.findMany.bind(prisma.document);
    vi.spyOn(prisma.document, "findMany").mockImplementationOnce((async (args: never) => {
      const stale = await original(args);
      const write = await api.patch(`/api/v1/documents/${id}`).send({ title: "Fresh", revision });
      expect(write.status).toBe(200);
      return stale;
    }) as never);

    expect((await api.get("/api/v1/documents")).body.data[0].title).toBe("Original");
    expect((await api.get("/api/v1/documents")).body.data[0].title).toBe("Fresh");
  });

  it("public share: a revoke that lands mid-read is not undone by the reader's cache write", async () => {
    const username = `owner${letters(8)}`;
    const user = await createUserWithSession({ username });
    const api = asUser(user);
    const { id } = await createDocument(api, "Shared");

    const share = await api.post("/api/v1/shares").send({ documentId: id, snapshot: { a: 1 } });
    expect(share.status).toBe(201);
    const slug: string = share.body.data.slug;
    const shareId: string = share.body.data.id;

    const original = ShareService.getPublicShareLinkByUsernameAndSlug.bind(ShareService);
    vi.spyOn(ShareService, "getPublicShareLinkByUsernameAndSlug").mockImplementationOnce(
      async (u, s) => {
        const stale = await original(u, s);
        const revoke = await api.delete(`/api/v1/shares/documents/${id}/links/${shareId}`);
        expect(revoke.status).toBe(200);
        return stale;
      },
    );

    expect((await publicGet(`/api/v1/shares/public/${username}/${slug}`)).status).toBe(200);
    expect((await publicGet(`/api/v1/shares/public/${username}/${slug}`)).status).toBe(404);
  });
});

describe("V-223 public portfolio: a takedown mid-read is not undone by the reader's cache write", () => {
  it("an unpublish that lands between the reader's DB load and its cache write wins", async () => {
    const user = await createUserWithSession();
    const subdomain = `site${letters(10)}`;
    const snapshot = { schemaVersion: 1, templateId: "signal", identity: { name: "Owner" } };
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: "PORTFOLIO",
        title: "Portfolio",
        slug: subdomain,
        templateId: "signal",
        content: snapshot,
        visibility: "PUBLIC",
      },
    });
    await prisma.portfolioPublication.create({
      data: { userId: user.id, documentId: document.id, subdomain, templateId: "signal", snapshot },
    });

    const original = prisma.portfolioPublication.findFirst.bind(prisma.portfolioPublication);
    vi.spyOn(prisma.portfolioPublication, "findFirst").mockImplementationOnce((async (
      args: never,
    ) => {
      const stale = await original(args);
      const unpublish = await asUser(user).post("/api/v1/portfolios/unpublish");
      expect(unpublish.status).toBe(200);
      return stale;
    }) as never);

    expect((await publicGet(`/api/v1/portfolios/public/${subdomain}`)).status).toBe(200);
    expect((await publicGet(`/api/v1/portfolios/public/${subdomain}`)).status).toBe(404);
  });
});

describe("negative caches", () => {
  it("an unknown but well-formed API key hits the database once for two requests", async () => {
    const findFirst = vi.spyOn(prisma.apiKey, "findFirst");
    const key = `vw_${randomBytes(32).toString("hex")}`;

    for (let i = 0; i < 2; i += 1) {
      const response = await request(app).get("/api/v1/users/me").set("X-API-Key", key);
      expect(response.status).toBe(401);
    }

    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it("a newly created API key authenticates at once", async () => {
    const user = await createUserWithSession();
    const created = await asUser(user).post("/api/v1/api-keys").send({ name: "fresh" });
    expect(created.status).toBe(201);

    const response = await request(app)
      .get("/api/v1/users/me")
      .set("X-API-Key", created.body.data.key);
    expect(response.status).toBe(200);
  });

  it("a missing share is read from the database once, and creating it makes it readable at once", async () => {
    const username = `owner${letters(8)}`;
    const user = await createUserWithSession({ username });
    const slug = `resume-${letters(8)}`;
    const document = await prisma.document.create({
      data: { userId: user.id, title: "Resume", slug, content: { basics: { name: "Owner" } } },
    });

    const lookup = vi.spyOn(ShareService, "getPublicShareLinkByUsernameAndSlug");

    expect((await publicGet(`/api/v1/shares/public/${username}/${slug}`)).status).toBe(404);
    expect((await publicGet(`/api/v1/shares/public/${username}/${slug}`)).status).toBe(404);
    expect(lookup).toHaveBeenCalledTimes(1);

    const share = await asUser(user)
      .post("/api/v1/shares")
      .send({ documentId: document.id, snapshot: { a: 1 } });
    expect(share.status).toBe(201);
    expect(share.body.data.slug).toBe(slug);

    const readable = await publicGet(`/api/v1/shares/public/${username}/${slug}`);
    expect(readable.status).toBe(200);
    expect(readable.body.data.snapshot).toEqual({ a: 1 });
  });
});

describe("V-117 single-flight on cold reads", () => {
  it("five concurrent cold admin overview requests build it once", async () => {
    const redis = getRedis();
    const setEx = vi.spyOn(redis, "setEx");

    const results = await Promise.all(Array.from({ length: 5 }, () => getAdminOverview(30)));

    expect(results.every(Boolean)).toBe(true);

    const overviewWrites = setEx.mock.calls.filter(([key]) =>
      String(key).startsWith("admin:overview"),
    );
    expect(overviewWrites).toHaveLength(1);
  });

  it("five concurrent cold public portfolio list requests query once", async () => {
    const findMany = vi.spyOn(prisma.portfolioPublication, "findMany");

    await Promise.all(
      Array.from({ length: 5 }, () => PortfolioService.listPublicPortfolios(10, 0)),
    );

    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it("a builder that outlives the lock TTL lets at most one more waiter build", async () => {
    const key = `test:single-flight:${letters(8)}`;
    const lockTtlMs = 200;
    let builds = 0;

    const build = async () => {
      builds += 1;
      await new Promise((resolve) => setTimeout(resolve, 300));
      await cacheSet(key, { built: builds }, 60);
      return { built: builds };
    };
    const readCache = () => cacheGet<{ built: number }>(key);

    const results = await Promise.all(
      Array.from({ length: 6 }, () => singleFlight(key, lockTtlMs, build, readCache)),
    );

    expect(results.every(Boolean)).toBe(true);
    expect(builds).toBeLessThanOrEqual(2);
  });
});

describe("generation values never repeat", () => {
  it("an evicted counter does not resurrect entries written under an older generation", async () => {
    const namespace = `test:evict:${letters(8)}`;

    await bumpGeneration(namespace);
    const before = (await getGeneration(namespace))!;
    await cacheSet(generationalKey(namespace, before, "item"), { stale: true }, 3600);

    // Eviction (volatile-lru) or TTL lapse between two bumps.
    await getRedis().del(generationCounterKey(namespace));
    await bumpGeneration(namespace);

    const after = (await getGeneration(namespace))!;
    expect(after).not.toBe(before);
    expect(await cacheGet(generationalKey(namespace, after, "item"))).toBeNull();

    // A read that finds the counter missing does not restart it at an old value either.
    await getRedis().del(generationCounterKey(namespace));
    expect(await getGeneration(namespace)).not.toBe(before);
    expect(BigInt((await getGeneration(namespace))!)).toBeGreaterThan(BigInt(after));
  });
});

describe("a privacy invalidation survives a Redis blip (V-370)", () => {
  /**
   * Makes every generation bump fail while `failing()` is true, as a reconnecting or timing-out
   * Redis would; every other command (the rate limiter, the cache reads) goes through.
   */
  function failBumpsWhile(failing: () => boolean) {
    const redis = getRedis();
    const original = redis.eval.bind(redis);
    return vi.spyOn(redis, "eval").mockImplementation(((
      script: string,
      options?: { keys?: string[] },
    ) => {
      const isBump = script.includes("INCR") && options?.keys?.[0]?.startsWith("cache:gen:");
      if (isBump && failing()) return Promise.reject(new Error("Redis command timed out"));
      return original(script, options as never);
    }) as typeof redis.eval);
  }

  async function sharedDocument() {
    const username = `owner${letters(8)}`;
    const user = await createUserWithSession({ username });
    const api = asUser(user);
    const { id, revision } = await createDocument(api, "Shared");
    const share = await api.post("/api/v1/shares").send({ documentId: id, snapshot: { a: 1 } });
    expect(share.status).toBe(201);
    const path = `/api/v1/shares/public/${username}/${share.body.data.slug as string}`;
    // Cached by this read.
    expect((await publicGet(path)).status).toBe(200);
    return { api, id, revision, shareId: share.body.data.id as string, path, username };
  }

  it("a revoke during a short blip still takes the public copy down at once", async () => {
    const { api, id, shareId, path } = await sharedDocument();
    let failures = 1;
    failBumpsWhile(() => failures-- > 0);

    const revoke = await api.delete(`/api/v1/shares/documents/${id}/links/${shareId}`);

    expect(revoke.status).toBe(200);
    expect((await publicGet(path)).status).toBe(404);
  });

  it("a revoke during a longer outage takes the public copy down once Redis is back", async () => {
    const { api, id, shareId, path } = await sharedDocument();
    let down = true;
    failBumpsWhile(() => down);

    const revoke = await api.delete(`/api/v1/shares/documents/${id}/links/${shareId}`);
    expect(revoke.status).toBe(200);
    down = false;

    await vi.waitFor(async () => expect((await publicGet(path)).status).toBe(404), {
      timeout: 10_000,
      interval: 200,
    });
  });

  it("making the document private during an outage hides the share once Redis is back", async () => {
    const { api, id, revision, path } = await sharedDocument();
    let down = true;
    failBumpsWhile(() => down);

    const hidden = await api
      .patch(`/api/v1/documents/${id}`)
      .send({ visibility: "PRIVATE", revision });
    expect(hidden.status, JSON.stringify(hidden.body)).toBe(200);
    down = false;

    await vi.waitFor(async () => expect((await publicGet(path)).status).toBe(404), {
      timeout: 10_000,
      interval: 200,
    });
  });

  it("never caches a public share for more than five minutes, whatever is lost", async () => {
    const { path, username } = await sharedDocument();
    const slug = path.split("/").pop()!;
    const namespace = cacheNamespaces.publicShare(username);
    const generation = (await getGeneration(namespace))!;
    const ttl = await getRedis().ttl(generationalKey(namespace, generation, slug));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(300);
  });
});
