import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { EntitlementService } from "#services/entitlementService";
import { cacheGet, cacheSet } from "#lib/redis";
import { publicPortfolioCacheKey } from "#utils/portfolioPublicationCache";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * V-025 / V-132 / V-049: the document write paths against a real Postgres, where the races are
 * real. Every test here failed (or could not be expressed) before the fix.
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

async function grantPaid(userId: string) {
  await prisma.entitlementGrant.create({
    data: { userId, key: "ai_credits", source: "MANUAL", sourceId: randomUUID() },
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Holds every create inside its critical section for a while. The entitlement check runs
 * under the per-user advisory lock, so with this delay the second request of a pair is queued
 * on the lock while the first is mid-check; without the lock both would count zero active
 * documents during the overlap and both would insert. Restored automatically (restoreMocks).
 */
function slowEntitlementChecks(ms = 150) {
  const original = EntitlementService.has.bind(EntitlementService);
  vi.spyOn(EntitlementService, "has").mockImplementation(async (...args) => {
    await sleep(ms);
    return original(...args);
  });
}

/** The cursor is reported SYNC_CURSOR_SLACK_MS behind the query start. */
const CURSOR_SLACK_MS = 5_000;

describe("document create races (V-025)", () => {
  it("two concurrent creates with the same id: one 201, one 200 adopting the same row, one row", async () => {
    slowEntitlementChecks();
    const user = await createUserWithSession();
    await grantPaid(user.id);
    const api = asUser(user);
    const id = randomUUID();

    const [a, b] = await Promise.all([
      api.post("/api/v1/documents").send({ type: "RESUME", id, title: "Tab A", content: { a: 1 } }),
      api.post("/api/v1/documents").send({ type: "RESUME", id, title: "Tab B", content: { b: 2 } }),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 201]);

    const adopted = a.status === 200 ? a : b;
    const created = a.status === 201 ? a : b;
    expect(adopted.body.success).toBe(true);
    expect(adopted.body.data.id).toBe(id);
    expect(adopted.body.data.revision).toBe(1);
    expect(adopted.body.data.title).toBe(created.body.data.title);

    expect(await prisma.document.count({ where: { id } })).toBe(1);
  });

  it("a sequential create with an id this user already owns is 200 with the stored row, unchanged", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);
    const id = randomUUID();

    const first = await api.post("/api/v1/documents").send({ type: "RESUME", id, title: "One" });
    expect(first.status).toBe(201);

    const again = await api.post("/api/v1/documents").send({ type: "RESUME", id, title: "Two" });
    expect(again.status).toBe(200);
    expect(again.body.success).toBe(true);
    expect(again.body.data).toMatchObject({ id, title: "One", revision: 1 });

    const row = await prisma.document.findUniqueOrThrow({ where: { id } });
    expect(row.title).toBe("One");
  });

  it("re-creating a soft-deleted id is 409 with the deletedAt, never a silent resurrection", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);
    const id = randomUUID();

    expect(
      (await api.post("/api/v1/documents").send({ type: "RESUME", id, title: "Gone" })).status,
    ).toBe(201);
    expect((await api.delete(`/api/v1/documents/${id}`)).status).toBe(200);

    const again = await api.post("/api/v1/documents").send({ type: "RESUME", id, title: "Back" });
    expect(again.status).toBe(409);
    expect(again.body.details.id).toBe(id);
    expect(typeof again.body.details.deletedAt).toBe("string");

    const row = await prisma.document.findUniqueOrThrow({ where: { id } });
    expect(row.deletedAt).toBeInstanceOf(Date);
    expect(row.title).toBe("Gone");
  });

  it("an id owned by another user is 409", async () => {
    const owner = await createUserWithSession();
    const other = await createUserWithSession();
    const id = randomUUID();

    expect(
      (await asUser(owner).post("/api/v1/documents").send({ type: "RESUME", id })).status,
    ).toBe(201);

    const stolen = await asUser(other).post("/api/v1/documents").send({ type: "RESUME", id });
    expect(stolen.status).toBe(409);
    expect(stolen.body.details).toBeUndefined();
  });

  it("two concurrent creates for a free user: exactly one succeeds and the other is 402", async () => {
    slowEntitlementChecks();

    for (let pair = 0; pair < 3; pair++) {
      const user = await createUserWithSession();
      const api = asUser(user);

      const [a, b] = await Promise.all([
        api.post("/api/v1/documents").send({ type: "RESUME", title: "First tab" }),
        api.post("/api/v1/documents").send({ type: "RESUME", title: "Second tab" }),
      ]);

      expect([a.status, b.status].sort(), `pair ${pair}`).toEqual([201, 402]);
      expect(
        await prisma.document.count({
          where: { userId: user.id, type: "RESUME", deletedAt: null },
        }),
        `pair ${pair}`,
      ).toBe(1);
    }
  });

  it("a free user at the limit gets 402 (plan required), not 403", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);

    expect((await api.post("/api/v1/documents").send({ type: "RESUME" })).status).toBe(201);

    const second = await api.post("/api/v1/documents").send({ type: "RESUME" });
    expect(second.status).toBe(402);
  });

  it("two concurrent creates with the same title get distinct slugs", async () => {
    const user = await createUserWithSession();
    await grantPaid(user.id);
    const api = asUser(user);

    const responses = await Promise.all(
      [0, 1, 2].map(() => api.post("/api/v1/documents").send({ type: "RESUME", title: "Same" })),
    );

    expect(responses.map((response) => response.status)).toEqual([201, 201, 201]);
    const slugs = responses.map((response) => response.body.data.slug as string);
    expect(new Set(slugs).size).toBe(3);
  });
});

describe("document update and delete on soft-deleted rows (V-025)", () => {
  it("PATCH on a soft-deleted document is 404", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);

    const created = await api.post("/api/v1/documents").send({ type: "RESUME", title: "Doomed" });
    const id: string = created.body.data.id;

    expect((await api.delete(`/api/v1/documents/${id}`)).status).toBe(200);

    const patched = await api
      .patch(`/api/v1/documents/${id}`)
      .send({ title: "Ghost write", revision: 1 });
    expect(patched.status).toBe(404);

    const row = await prisma.document.findUniqueOrThrow({ where: { id } });
    expect(row.title).toBe("Doomed");
    expect(row.revision).toBe(1);
  });

  it("deleting an already soft-deleted document is idempotent: 200 with the stored row", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);

    const created = await api.post("/api/v1/documents").send({ type: "RESUME", title: "Once" });
    const id: string = created.body.data.id;

    expect((await api.delete(`/api/v1/documents/${id}`)).status).toBe(200);
    const firstDeletedAt = (await prisma.document.findUniqueOrThrow({ where: { id } })).deletedAt;

    const again = await api.delete(`/api/v1/documents/${id}`);
    expect(again.status).toBe(200);
    expect(again.body.success).toBe(true);

    const row = await prisma.document.findUniqueOrThrow({ where: { id } });
    expect(row.deletedAt?.toISOString()).toBe(firstDeletedAt?.toISOString());

    // Still 404 for an id that never existed and for another user's document.
    expect((await api.delete(`/api/v1/documents/${randomUUID()}`)).status).toBe(404);
    const other = await createUserWithSession();
    expect((await asUser(other).delete(`/api/v1/documents/${id}`)).status).toBe(404);
  });

  it("keeps the slug when the title did not change, and recomputes it when it did", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);

    const created = await api
      .post("/api/v1/documents")
      .send({ type: "RESUME", title: "Keep me", slug: "custom-slug" });
    const id: string = created.body.data.id;
    expect(created.body.data.slug).toBe("custom-slug");

    const sameTitle = await api
      .patch(`/api/v1/documents/${id}`)
      .send({ title: "Keep me", content: { x: 1 }, revision: 1 });
    expect(sameTitle.status).toBe(200);
    expect(sameTitle.body.data.slug).toBe("custom-slug");

    const renamed = await api
      .patch(`/api/v1/documents/${id}`)
      .send({ title: "Brand new", revision: 2 });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.slug).toBe("brand-new");
  });

  /**
   * V-028: every autosave PATCH carries the whole body and used to get the whole body back. The
   * reply is the row without `content` and `metadata`: what the studio reads (id, revision,
   * updatedAt, lastSyncedAt) and the fields a rename changes (title, slug, templateId).
   */
  it("answers a PATCH without echoing the body back", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);

    const created = await api.post("/api/v1/documents").send({ type: "RESUME", title: "Slim" });
    const id: string = created.body.data.id;

    const patched = await api.patch(`/api/v1/documents/${id}`).send({
      title: "Slim",
      content: { basics: { name: "x".repeat(10_000) } },
      metadata: { note: "y".repeat(10_000) },
      templateId: "modern",
      revision: 1,
    });

    expect(patched.status).toBe(200);
    expect(patched.body.data).toMatchObject({
      id,
      revision: 2,
      title: "Slim",
      slug: "slim",
      templateId: "modern",
      type: "RESUME",
    });
    expect(typeof patched.body.data.updatedAt).toBe("string");
    expect(typeof patched.body.data.lastSyncedAt).toBe("string");
    expect(patched.body.data).not.toHaveProperty("content");
    expect(patched.body.data).not.toHaveProperty("metadata");
    expect(JSON.stringify(patched.body).length).toBeLessThan(2_000);

    // The body itself was stored.
    const stored = await api.get(`/api/v1/documents/${id}`);
    expect(stored.body.data.content.basics.name).toHaveLength(10_000);
  });
});

describe("GET /documents?updatedSince (V-132)", () => {
  it("returns a server cursor and tombstones for documents deleted after it", async () => {
    const user = await createUserWithSession();
    await grantPaid(user.id);
    const api = asUser(user);

    const a = await api.post("/api/v1/documents").send({ type: "RESUME", title: "A" });
    const b = await api.post("/api/v1/documents").send({ type: "RESUME", title: "B" });
    const idA: string = a.body.data.id;
    const idB: string = b.body.data.id;

    // The app runs in this process, so both ends of the request bracket the moment the service
    // read its clock. How long auth and routing take before that moment varies with machine load,
    // so the cursor is pinned between the two ends rather than to a fixed distance from the start.
    const requestedAt = Date.now();
    const full = await api.get("/api/v1/documents");
    const respondedAt = Date.now();
    expect(full.status).toBe(200);
    expect(typeof full.body.serverTime).toBe("string");
    expect(Number.isNaN(Date.parse(full.body.serverTime))).toBe(false);
    // The cursor sits behind the query start by exactly the slack, never ahead of it.
    const cursorAt = Date.parse(full.body.serverTime);
    expect(cursorAt).toBeGreaterThanOrEqual(requestedAt - CURSOR_SLACK_MS);
    expect(cursorAt).toBeLessThanOrEqual(respondedAt - CURSOR_SLACK_MS);
    expect(full.body.data.map((d: { id: string }) => d.id).sort()).toEqual([idA, idB].sort());

    const cursor: string = full.body.serverTime;
    await sleep(20);

    expect((await api.delete(`/api/v1/documents/${idB}`)).status).toBe(200);

    // Both documents were created inside the slack window, so the live one overlaps into the
    // incremental response (harmless) while the deleted one is only ever a tombstone.
    const incremental = await api.get(`/api/v1/documents?updatedSince=${cursor}`);
    expect(incremental.status).toBe(200);
    const incrementalIds = incremental.body.data.map((d: { id: string }) => d.id);
    expect(incrementalIds).toContain(idA);
    expect(incrementalIds).not.toContain(idB);
    expect(incremental.body.deleted).toHaveLength(1);
    expect(incremental.body.deleted[0].id).toBe(idB);
    expect(typeof incremental.body.deleted[0].deletedAt).toBe("string");
    expect(typeof incremental.body.serverTime).toBe("string");

    const nextCursor: string = incremental.body.serverTime;
    await sleep(20);

    const edited = await api
      .patch(`/api/v1/documents/${idA}`)
      .send({ title: "A edited", revision: 1 });
    expect(edited.status).toBe(200);

    // Not cached: the second incremental call must see the edit that happened after the first.
    const second = await api.get(`/api/v1/documents?updatedSince=${nextCursor}`);
    const secondA = second.body.data.find((d: { id: string }) => d.id === idA);
    expect(secondA?.title).toBe("A edited");
    expect(second.body.deleted.map((d: { id: string }) => d.id)).toEqual([idB]);

    const repeat = await api.get(`/api/v1/documents?updatedSince=${nextCursor}`);
    expect(repeat.body.data.find((d: { id: string }) => d.id === idA)?.title).toBe("A edited");
  });

  it("a cursor equal to a document's updatedAt still returns it (gte, not gt)", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);

    const created = await api.post("/api/v1/documents").send({ type: "RESUME", title: "Edge" });
    const updatedAt: string = created.body.data.updatedAt;

    const listed = await api.get(`/api/v1/documents?updatedSince=${updatedAt}`);
    expect(listed.body.data.map((d: { id: string }) => d.id)).toEqual([created.body.data.id]);
  });
});

describe("soft-deleting a PORTFOLIO document (V-049)", () => {
  it("suspends the live publication and clears its public cache in the same flow", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);

    const created = await api
      .post("/api/v1/documents")
      .send({ type: "PORTFOLIO", title: "Site", templateId: "signal" });
    expect(created.status).toBe(201);
    const documentId: string = created.body.data.id;

    const subdomain = `site${randomUUID().slice(0, 8)}`;
    await prisma.portfolioPublication.create({
      data: {
        userId: user.id,
        documentId,
        subdomain,
        templateId: "signal",
        snapshot: { hello: "world" },
        status: "LIVE",
      },
    });
    await prisma.document.update({ where: { id: documentId }, data: { visibility: "PUBLIC" } });
    const siteKey = (await publicPortfolioCacheKey(subdomain))!;
    await cacheSet(siteKey, { stale: true }, 600);

    const deleted = await api.delete(`/api/v1/documents/${documentId}`);
    expect(deleted.status).toBe(200);

    const publication = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(publication.status).toBe("SUSPENDED");
    expect(publication.suspensionReason).toBe("user_unpublished");
    expect(publication.suspendedAt).toBeInstanceOf(Date);

    const row = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    expect(row.deletedAt).toBeInstanceOf(Date);
    expect(row.visibility).toBe("PRIVATE");

    // The site's generation moved on: the old entry is unreachable, the new key empty.
    expect(await publicPortfolioCacheKey(subdomain)).not.toBe(siteKey);
    expect(await cacheGet((await publicPortfolioCacheKey(subdomain))!)).toBeNull();
  });

  it("leaves another document's publication alone", async () => {
    const user = await createUserWithSession();
    await grantPaid(user.id);
    const api = asUser(user);

    const live = await api.post("/api/v1/documents").send({ type: "PORTFOLIO", title: "Live" });
    const draft = await api.post("/api/v1/documents").send({ type: "PORTFOLIO", title: "Draft" });

    const subdomain = `keep${randomUUID().slice(0, 8)}`;
    await prisma.portfolioPublication.create({
      data: {
        userId: user.id,
        documentId: live.body.data.id,
        subdomain,
        templateId: "signal",
        snapshot: {},
        status: "LIVE",
      },
    });

    expect((await api.delete(`/api/v1/documents/${draft.body.data.id}`)).status).toBe(200);

    const publication = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(publication.status).toBe("LIVE");
  });
});
