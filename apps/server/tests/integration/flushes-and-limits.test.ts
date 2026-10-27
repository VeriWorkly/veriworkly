import { randomUUID } from "node:crypto";

import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { flushAuditLogs, setAuditLogPersistence } from "#middleware/logging";
import { PortfolioService } from "#services/portfolioService";
import { ShareService } from "#services/shareService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * V-103 / V-124 / V-110 / V-029 / V-114 / V-098 / V-109 / V-130: the view flushes, body limits,
 * request audit log and the autosave limiter class, against a real Postgres and Redis.
 */

function asUser(user: TestUser) {
  return {
    get: (url: string) =>
      request(app).get(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
    post: (url: string) =>
      request(app).post(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
    patch: (url: string) =>
      request(app).patch(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
    put: (url: string) =>
      request(app).put(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
  };
}

async function seedPublication() {
  const user = await createUserWithSession();
  const document = await prisma.document.create({
    data: { userId: user.id, type: "PORTFOLIO", title: "Site", slug: "site", content: {} },
  });
  return prisma.portfolioPublication.create({
    data: {
      userId: user.id,
      documentId: document.id,
      subdomain: `site${randomUUID().slice(0, 8)}`,
      templateId: "signal",
      snapshot: {},
    },
  });
}

describe("portfolio views flush (V-103, V-124)", () => {
  it("flushes 2,000 distinct referrers for one day and the totals match", async () => {
    const publication = await seedPublication();
    const dateKey = "2026-10-01";
    const fields: Record<string, string> = {};
    for (let i = 0; i < 2000; i += 1) fields[`${publication.id}:ref${i}.example`] = "2";

    const redis = getRedis();
    await redis.hSet(`portfolio:views:buffer:${dateKey}`, fields);
    await redis.hSet(`portfolio:views:pending:${publication.id}`, dateKey, "4000");

    const transaction = vi.spyOn(prisma, "$transaction");
    const result = await PortfolioService.flushViewsForDate(dateKey);
    expect(result.flushedCount).toBe(4000);
    expect(transaction.mock.calls.every(([arg]) => Array.isArray(arg))).toBe(true);
    transaction.mockRestore();

    const rows = await prisma.portfolioViewDaily.aggregate({
      where: { publicationId: publication.id },
      _sum: { count: true },
      _count: true,
    });
    expect(rows._count).toBe(2000);
    expect(rows._sum.count).toBe(4000);
    // A day's pending count that reaches zero is deleted, not kept as "0" forever (V-113).
    expect(await redis.hGet(`portfolio:views:pending:${publication.id}`, dateKey)).toBeNull();

    // A second flush of the same day adds to the rows instead of failing on the unique key.
    await redis.hSet(`portfolio:views:buffer:${dateKey}`, `${publication.id}:ref0.example`, "3");
    await PortfolioService.flushViewsForDate(dateKey);
    const first = await prisma.portfolioViewDaily.findFirstOrThrow({
      where: { publicationId: publication.id, referrerHost: "ref0.example" },
    });
    expect(first.count).toBe(5);
  });

  it("after a crash-after-commit the retry still removes the views from pending", async () => {
    const publication = await seedPublication();
    const dateKey = "2026-10-02";
    const processingKey = `portfolio:views:buffer:${dateKey}:processing`;
    const batchId = randomUUID();

    const redis = getRedis();
    await redis.hSet(processingKey, `${publication.id}:google.com`, "7");
    await redis.set(`${processingKey}:batch-id`, batchId);
    await redis.hSet(`portfolio:views:pending:${publication.id}`, dateKey, "7");
    // The earlier attempt committed (batch row + counts) and died before cleaning up Redis.
    await prisma.viewFlushBatch.create({ data: { id: batchId, kind: "portfolio" } });
    await prisma.portfolioViewDaily.create({
      data: {
        publicationId: publication.id,
        date: new Date(`${dateKey}T00:00:00.000Z`),
        referrerHost: "google.com",
        count: 7,
      },
    });

    await PortfolioService.flushViewsForDate(dateKey);

    expect(await redis.exists(processingKey)).toBe(0);
    expect(await redis.hGet(`portfolio:views:pending:${publication.id}`, dateKey)).toBeNull();
    const row = await prisma.portfolioViewDaily.findFirstOrThrow({
      where: { publicationId: publication.id },
    });
    expect(row.count).toBe(7);
  });
});

describe("portfolio view recording (V-114)", () => {
  afterEach(() => vi.useRealTimers());

  it("cannot overshoot the per-day field cap under concurrent views", async () => {
    const publication = await seedPublication();
    // V-363: Date stands still for this test, so the request and the key read below name the same
    // UTC day even when the run crosses midnight.
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    const dateKey = new Date().toISOString().slice(0, 10);
    const key = `portfolio:views:buffer:${dateKey}`;
    const filler: Record<string, string> = {};
    for (let i = 0; i < 9_999; i += 1) filler[`other${i}:x.example`] = "1";
    await getRedis().hSet(key, filler);

    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        PortfolioService.bufferView(publication.id, `new${i}.example`),
      ),
    );

    // One new field fits under the cap; the other 19 fold into the publication's direct field.
    expect(await getRedis().hLen(key)).toBe(10_001);
    expect(await getRedis().hGet(key, `${publication.id}:`)).toBe("19");
    expect(await getRedis().hGet(`portfolio:views:pending:${publication.id}`, dateKey)).toBe("20");
    expect(await getRedis().ttl(key)).toBeGreaterThan(0);
  });
});

describe("share views flush (V-110, V-029)", () => {
  async function seedShareLinks(count: number) {
    const user = await createUserWithSession();
    const docs = Array.from({ length: count }, (_, i) => ({
      id: randomUUID(),
      userId: user.id,
      title: `Doc ${i}`,
      slug: `doc-${i}`,
      content: {},
    }));
    await prisma.document.createMany({ data: docs });
    const links = docs.map((doc, i) => ({
      id: randomUUID(),
      userId: user.id,
      documentId: doc.id,
      slug: `doc-${i}`,
      snapshot: {},
    }));
    await prisma.shareLink.createMany({ data: links });
    return links.map((link) => link.id);
  }

  it("flushes 1,000 links' counters without a per-link update", async () => {
    const ids = await seedShareLinks(1000);
    const timestamp = Date.UTC(2026, 9, 3, 12, 0, 0);
    const redis = getRedis();
    await redis.hSet("share:links:view_count", Object.fromEntries(ids.map((id) => [id, "3"])));
    await redis.hSet(
      "share:links:last_viewed",
      Object.fromEntries(ids.map((id) => [id, String(timestamp)])),
    );

    const transaction = vi.spyOn(prisma, "$transaction");
    const result = await ShareService.flushShareViews();
    // A batch of statements, not an interactive callback looping one update per link.
    expect(transaction.mock.calls.every(([arg]) => Array.isArray(arg))).toBe(true);
    transaction.mockRestore();

    expect(result.flushedLinks).toBe(1000);
    const totals = await prisma.shareLink.aggregate({
      where: { id: { in: ids } },
      _sum: { viewCount: true },
    });
    expect(totals._sum.viewCount).toBe(3000);
    const sample = await prisma.shareLink.findUniqueOrThrow({ where: { id: ids[0]! } });
    expect(sample.lastViewedAt?.getTime()).toBe(timestamp);
    expect(await redis.exists("share:links:view_count:processing")).toBe(0);
  });

  it("drains leftover :processing keys even when no new views arrived", async () => {
    const [id] = await seedShareLinks(1);
    const redis = getRedis();
    await redis.hSet("share:links:view_count:processing", id!, "4");
    await redis.hSet("share:links:last_viewed:processing", id!, String(Date.now()));
    await redis.lPush(
      "share:views:buffer:processing",
      JSON.stringify({ shareLinkId: id, ipAddress: null, userAgent: null, timestamp: Date.now() }),
    );

    const result = await ShareService.flushShareViews();

    expect(result.flushedLinks).toBe(1);
    expect(result.flushedViews).toBe(1);
    expect((await prisma.shareLink.findUniqueOrThrow({ where: { id: id! } })).viewCount).toBe(4);
    expect(await redis.exists("share:links:view_count:processing")).toBe(0);
    expect(await redis.exists("share:views:buffer:processing")).toBe(0);
  });

  it("prunes ShareView rows past 30 days in a separate batched step", async () => {
    const [id] = await seedShareLinks(1);
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    await prisma.shareView.createMany({
      data: [
        ...Array.from({ length: 12 }, () => ({ shareLinkId: id!, createdAt: old })),
        { shareLinkId: id!, createdAt: new Date() },
      ],
    });

    const deleted = await ShareService.pruneShareViews({ batchSize: 5 });

    expect(deleted).toBe(12);
    expect(await prisma.shareView.count({ where: { shareLinkId: id! } })).toBe(1);
  });

  it("keeps rows and counts together at the buffer cap: a view past it is neither (V-029)", async () => {
    const [id] = await seedShareLinks(1);
    const redis = getRedis();
    await redis.lPush(
      "share:views:buffer",
      Array.from({ length: 10_000 }, () => JSON.stringify({ shareLinkId: id, timestamp: 1 })),
    );

    await ShareService.recordShareView(id!, "203.0.113.9", "agent");

    expect(await redis.lLen("share:views:buffer")).toBe(10_000);
    expect(await redis.hGet("share:links:view_count", id!)).toBeNull();
    expect(await redis.get("share:views:dropped")).toBe("1");
    await redis.del(["share:views:buffer", "share:views:dropped"]);
  });

  it("records a share view in one round trip with a TTL on every key", async () => {
    const [id] = await seedShareLinks(1);
    await ShareService.recordShareView(id!, "203.0.113.9", "agent");
    const redis = getRedis();
    expect(await redis.hGet("share:links:view_count", id!)).toBe("1");
    for (const key of ["share:views:buffer", "share:links:view_count", "share:links:last_viewed"])
      expect(await redis.ttl(key)).toBeGreaterThan(0);
  });
});

describe("JSON body limits (V-098)", () => {
  const big = "x".repeat(200 * 1024);

  it("refuses a 200 kb body on a route outside the document/profile/import routers", async () => {
    const response = await request(app)
      .post("/api/v1/contact")
      .set("Origin", STUDIO_ORIGIN)
      .send({ name: "A", email: "a@example.test", message: big });
    expect(response.status).toBe(413);
  });

  it("accepts a 200 kb body on PATCH /documents/:id", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);
    const created = await api.post("/api/v1/documents").send({ type: "RESUME", title: "Big" });
    const response = await api
      .patch(`/api/v1/documents/${created.body.data.id}`)
      .send({ content: { blob: big }, revision: 1 });
    expect(response.status).toBe(200);
  });

  it("accepts a 200 kb snapshot on share create", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);
    const created = await api.post("/api/v1/documents").send({ type: "RESUME", title: "Shared" });
    const response = await api
      .post("/api/v1/shares")
      .send({ documentId: created.body.data.id, snapshot: { blob: big } });
    expect(response.status).toBe(201);
  });

  it("parses a 200 kb portfolio draft (the 4 MB parser, not the 100 kb one)", async () => {
    const user = await createUserWithSession();
    const response = await asUser(user)
      .put("/api/v1/portfolios/draft")
      .send({ subdomain: `big${randomUUID().slice(0, 8)}`, snapshot: { blob: big } });
    expect(response.status).not.toBe(413);
  });

  it("parses a 200 kb body on the AI/ATS text routes (256 kb) but not 300 kb", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);
    expect((await api.post("/api/v1/ats/check").send({ resumeText: big })).status).not.toBe(413);
    expect((await api.post("/api/v1/ai/generate").send({ prompt: big })).status).not.toBe(413);
    const tooBig = "x".repeat(300 * 1024);
    expect((await api.post("/api/v1/ats/check").send({ resumeText: tooBig })).status).toBe(413);
  });
});

describe("request audit log (V-109)", () => {
  beforeAll(() => setAuditLogPersistence(true));
  afterAll(() => setAuditLogPersistence(null));

  it("writes no AuditLog row for a 409 autosave conflict, and batches the rest", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);
    const created = await api.post("/api/v1/documents").send({ type: "RESUME", title: "Doc" });
    const id: string = created.body.data.id;
    expect((await api.patch(`/api/v1/documents/${id}`).send({ revision: 1 })).status).toBe(200);
    const before = await prisma.auditLog.count();

    const conflict = await api.patch(`/api/v1/documents/${id}`).send({ title: "x", revision: 1 });
    expect(conflict.status).toBe(409);
    const invalid = await api.patch(`/api/v1/documents/${id}`).send({ revision: "nope" });
    expect(invalid.status).toBe(400);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const forbidden = await api.get("/api/v1/admin/users");
    expect(forbidden.status).toBe(403);

    await flushAuditLogs();
    const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows.slice(before).map((row) => row.status)).toEqual([400, 403]);
  });
});

describe("autosave limiter class (V-130)", () => {
  it("lets 150 PATCHes through while 101 GETs on another class still hit its limit", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);
    const created = await api.post("/api/v1/documents").send({ type: "RESUME", title: "Typing" });
    const id: string = created.body.data.id;

    let revision = created.body.data.revision as number;
    for (let i = 0; i < 150; i += 1) {
      const response = await api
        .patch(`/api/v1/documents/${id}`)
        .send({ content: { n: i }, revision });
      expect(response.status, `PATCH #${i + 1}`).toBe(200);
      revision = response.body.data.revision;
    }

    let last: request.Response | undefined;
    for (let i = 0; i < 101; i += 1) last = await api.get("/api/v1/documents");
    expect(last!.status).toBe(429);
    expect(Number(last!.headers["retry-after"])).toBeGreaterThan(0);
  });
});

describe("portfolio view beacon (V-052)", () => {
  afterEach(() => vi.useRealTimers());

  it("counts a view without reading the published page, and 404s a subdomain that serves nothing", async () => {
    const publication = await seedPublication();
    // V-363: Date stands still for this test, so the request and the key read below name the same
    // UTC day even when the run crosses midnight.
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    const pageRead = vi.spyOn(PortfolioService, "getPublicPortfolio");

    await PortfolioService.recordView(publication.subdomain, "https://www.google.com/");

    expect(pageRead).not.toHaveBeenCalled();
    pageRead.mockRestore();
    const dateKey = new Date().toISOString().slice(0, 10);
    expect(await getRedis().hGet(`portfolio:views:pending:${publication.id}`, dateKey)).toBe("1");

    await expect(
      PortfolioService.recordView(`missing${randomUUID().slice(0, 6)}`),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
