import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * V-045 (portfolio asset lifecycle), V-131 (the public view beacon) and V-135 (validation detail
 * shape on publish). Only the S3 client and the URL presigner are replaced; the database, cache
 * and request path are real.
 */

const { s3Send } = vi.hoisted(() => ({
  s3Send: vi.fn<(command: unknown) => Promise<object>>(async () => ({})),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = s3Send;
  },
  DeleteObjectCommand: class {
    constructor(public input: { Bucket: string; Key: string }) {}
  },
  PutObjectCommand: class {
    constructor(public input: unknown) {}
  },
  HeadObjectCommand: class {
    constructor(public input: unknown) {}
  },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(async () => "https://r2.example.test/signed-put"),
}));

import { app } from "#app";
import { config } from "#config";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { PortfolioAssetService } from "#services/portfolioAssetService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

const DAY_MS = 24 * 60 * 60 * 1000;

beforeAll(() => {
  config.r2.endpoint = "https://r2.example.test";
  config.r2.bucket = "test-bucket";
  config.r2.accessKeyId = "key";
  config.r2.secretAccessKey = "secret";
  config.r2.publicBaseUrl = "https://media.example.test";
});

beforeEach(async () => {
  s3Send.mockClear();
  await getRedis().flushDb();
});

function as(user: TestUser, req: request.Test) {
  return req.set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie);
}

function deletedKeys() {
  return s3Send.mock.calls
    .map(([command]) => (command as { input: { Key?: string } }).input)
    .filter((input) => input && "Key" in input && !("ContentType" in input))
    .map((input) => input.Key)
    .sort();
}

async function seedAsset(
  userId: string,
  overrides: { status?: "PENDING" | "READY"; createdAt?: Date; updatedAt?: Date } = {},
) {
  const asset = await prisma.portfolioAsset.create({
    data: {
      userId,
      key: `portfolio/${userId}/${randomUUID()}.png`,
      kind: "AVATAR",
      mimeType: "image/png",
      sizeBytes: 1024,
      status: overrides.status ?? "READY",
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    },
  });

  if (overrides.updatedAt) {
    await prisma.$executeRaw`UPDATE "PortfolioAsset" SET "updatedAt" = ${overrides.updatedAt} WHERE id = ${asset.id}`;
  }

  return asset;
}

const ref = (asset: { id: string; key: string }) => ({
  id: asset.id,
  url: `https://media.example.test/${asset.key}`,
});

function content(avatar: { id: string; key: string } | null, cover?: { id: string; key: string }) {
  return {
    schemaVersion: 1,
    templateId: "signal",
    identity: {
      name: "Test Person",
      headline: "Builds things",
      bio: "A bio long enough to publish.",
      location: "Somewhere",
      email: "person@example.test",
      availability: "Open",
      avatar: avatar ? ref(avatar) : null,
    },
    seo: { title: "", description: "", socialImage: null },
    socialLinks: [],
    sections: [
      {
        id: "projects",
        type: "projects",
        title: "Work",
        visible: true,
        items: cover ? [{ id: "p1", title: "Project", coverImage: ref(cover) }] : [],
      },
    ],
  };
}

async function saveDraft(user: TestUser, body: object) {
  return as(user, request(app).put("/api/v1/portfolios/draft")).send(body);
}

describe("portfolio asset upload cap (V-045)", () => {
  it("counts every upload in the window, not only the ones still pending", async () => {
    const user = await createUserWithSession();
    for (let i = 0; i < 20; i++) await seedAsset(user.id, { status: "READY" });

    const response = await as(user, request(app).post("/api/v1/portfolio-assets/upload-url")).send({
      kind: "AVATAR",
      mimeType: "image/png",
      sizeBytes: 1024,
    });

    expect(response.status).toBe(429);
  });

  it("an upload older than the window does not count", async () => {
    const user = await createUserWithSession();
    for (let i = 0; i < 20; i++)
      await seedAsset(user.id, { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) });

    const response = await as(user, request(app).post("/api/v1/portfolio-assets/upload-url")).send({
      kind: "AVATAR",
      mimeType: "image/png",
      sizeBytes: 1024,
    });

    expect(response.status).toBe(200);
  });
});

describe("V-224 deleting an upload does not give its slot back", () => {
  function startUpload(user: TestUser) {
    return as(user, request(app).post("/api/v1/portfolio-assets/upload-url")).send({
      kind: "AVATAR",
      mimeType: "image/png",
      sizeBytes: 1024,
    });
  }

  it("an upload deleted while its PUT URL is still valid keeps counting, and the sweep removes whatever was PUT", async () => {
    const user = await createUserWithSession();
    for (let i = 0; i < 19; i++) await seedAsset(user.id, { status: "READY" });

    const started = await startUpload(user);
    expect(started.status).toBe(200);
    const assetId: string = started.body.data.assetId;

    const removed = await as(user, request(app).delete(`/api/v1/portfolio-assets/${assetId}`));
    expect(removed.status).toBe(200);

    // The presigned PUT still works for ten minutes: the slot is not free again.
    expect((await startUpload(user)).status).toBe(429);

    // A completed upload cannot be revived after the delete.
    const completed = await as(user, request(app).post("/api/v1/portfolio-assets/complete")).send({
      assetId,
    });
    expect(completed.status).toBe(404);

    // The row stays until the stale sweep, which deletes the object a late PUT may have written.
    const row = await prisma.portfolioAsset.findUniqueOrThrow({ where: { id: assetId } });
    const old = new Date(Date.now() - 2 * DAY_MS);
    await prisma.$executeRaw`UPDATE "PortfolioAsset" SET "createdAt" = ${old}, "updatedAt" = ${old} WHERE id = ${assetId}`;
    s3Send.mockClear();
    await PortfolioAssetService.cleanupStaleAssets();
    expect(deletedKeys()).toContain(row.key);
    expect(await prisma.portfolioAsset.findUnique({ where: { id: assetId } })).toBeNull();
  });
});

describe("V-224 the admin asset list leaves DELETED holds out unless asked", () => {
  it("excludes them from items, total and size by default, and lists them under the DELETED filter", async () => {
    const owner = await createUserWithSession();
    const moderator = await createUserWithSession({ email: "admin@example.test" });
    await seedAsset(owner.id);
    const held = await seedAsset(owner.id);
    await prisma.portfolioAsset.update({ where: { id: held.id }, data: { status: "DELETED" } });

    const list = (status?: string) =>
      as(
        moderator,
        request(app).get(
          `/api/v1/admin/portfolios/assets?userId=${owner.id}${status ? `&status=${status}` : ""}`,
        ),
      );

    const all = await list();
    expect(all.status, JSON.stringify(all.body)).toBe(200);
    expect(all.body.data.items.map((item: { id: string }) => item.id)).not.toContain(held.id);
    expect(all.body.data.total).toBe(1);
    expect(all.body.data.totalSizeBytes).toBe(1024);

    const deleted = await list("DELETED");
    expect(deleted.body.data.items.map((item: { id: string }) => item.id)).toEqual([held.id]);
    expect(deleted.body.data.total).toBe(1);
  });
});

describe("V-227 published image URLs come from the stored object, never the request", () => {
  it("rewrites an owned image whose url points elsewhere to the media URL of its key", async () => {
    const user = await createUserWithSession();
    const avatar = await seedAsset(user.id);
    const cover = await seedAsset(user.id);
    const body = content(avatar, cover);
    body.identity.avatar = { id: avatar.id, url: "https://tracker.example.test/pixel.png" };

    const draft = await saveDraft(user, { subdomain: `p-${user.id.slice(-8)}`, snapshot: body });
    expect(draft.status).toBe(200);
    const published = await as(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: draft.body.data.id,
      subdomain: draft.body.data.slug,
      revision: draft.body.data.revision,
    });
    expect(published.status, JSON.stringify(published.body)).toBe(201);

    const row = await prisma.portfolioPublication.findUniqueOrThrow({ where: { userId: user.id } });
    const snapshot = row.snapshot as ReturnType<typeof content>;
    expect(snapshot.identity.avatar).toEqual({
      id: avatar.id,
      url: `https://media.example.test/${avatar.key}`,
    });
    expect((snapshot.sections[0].items[0] as { coverImage: unknown }).coverImage).toEqual({
      id: cover.id,
      url: `https://media.example.test/${cover.key}`,
    });
  });

  it("refuses a cover image with no asset id: a hot-linked URL is not an upload", async () => {
    const user = await createUserWithSession();
    const body = content(null);
    body.sections[0].items = [
      { id: "p1", title: "Project", coverImage: { url: "https://elsewhere.example.test/a.png" } },
    ] as never;

    const draft = await saveDraft(user, { subdomain: `p-${user.id.slice(-8)}`, snapshot: body });
    expect(draft.status).toBe(200);
    const published = await as(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: draft.body.data.id,
      subdomain: draft.body.data.slug,
      revision: draft.body.data.revision,
    });
    expect(published.status).toBe(400);
    expect(published.body.message).toMatch(/unavailable or invalid image/);
  });
});

describe("replaced portfolio images are deleted (V-045)", () => {
  it("saving a draft with a new avatar deletes the old object and row after the commit", async () => {
    const user = await createUserWithSession();
    const oldAvatar = await seedAsset(user.id);
    const newAvatar = await seedAsset(user.id);

    const first = await saveDraft(user, {
      subdomain: `p-${user.id.slice(-8)}`,
      snapshot: content(oldAvatar),
    });
    expect(first.status).toBe(200);
    expect(deletedKeys()).toEqual([]);

    const second = await saveDraft(user, {
      documentId: first.body.data.id,
      subdomain: first.body.data.slug,
      revision: first.body.data.revision,
      snapshot: content(newAvatar),
    });
    expect(second.status).toBe(200);

    expect(deletedKeys()).toEqual([oldAvatar.key]);
    expect(await prisma.portfolioAsset.findUnique({ where: { id: oldAvatar.id } })).toBeNull();
    expect(await prisma.portfolioAsset.findUnique({ where: { id: newAvatar.id } })).not.toBeNull();
  });

  it("keeps an image the live portfolio still shows, and deletes it once a publish replaces it", async () => {
    const user = await createUserWithSession();
    const liveAvatar = await seedAsset(user.id);
    const nextAvatar = await seedAsset(user.id);

    const draft = await saveDraft(user, {
      subdomain: `p-${user.id.slice(-8)}`,
      snapshot: content(liveAvatar),
    });
    const published = await as(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: draft.body.data.id,
      subdomain: draft.body.data.slug,
      revision: draft.body.data.revision,
    });
    expect(published.status).toBe(201);

    // The draft moves on; the live page still shows the old avatar, so it stays.
    const edited = await saveDraft(user, {
      documentId: draft.body.data.id,
      subdomain: draft.body.data.slug,
      revision: draft.body.data.revision,
      snapshot: content(nextAvatar),
    });
    expect(edited.status).toBe(200);
    expect(deletedKeys()).toEqual([]);

    // Deleting it by hand is refused while the live page shows it.
    const refused = await as(
      user,
      request(app).delete(`/api/v1/portfolio-assets/${liveAvatar.id}`),
    );
    expect(refused.status).toBe(409);
    expect(deletedKeys()).toEqual([]);

    // Publishing the new draft replaces the live snapshot: now the old avatar goes.
    const republished = await as(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: draft.body.data.id,
      subdomain: draft.body.data.slug,
      revision: edited.body.data.revision,
    });
    expect(republished.status).toBe(201);
    expect(deletedKeys()).toEqual([liveAvatar.key]);
    expect(await prisma.portfolioAsset.findUnique({ where: { id: liveAvatar.id } })).toBeNull();
  });

  async function publishThenSuspend(suspensionReason: string) {
    const user = await createUserWithSession();
    const liveAvatar = await seedAsset(user.id);
    const nextAvatar = await seedAsset(user.id);

    const draft = await saveDraft(user, {
      subdomain: `p-${user.id.slice(-8)}`,
      snapshot: content(liveAvatar),
    });
    const published = await as(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: draft.body.data.id,
      subdomain: draft.body.data.slug,
      revision: draft.body.data.revision,
    });
    expect(published.status).toBe(201);

    await prisma.portfolioPublication.update({
      where: { userId: user.id },
      data: { status: "SUSPENDED", suspensionReason, suspendedAt: new Date() },
    });

    // The draft swaps the avatar while the publication is suspended.
    const edited = await saveDraft(user, {
      documentId: draft.body.data.id,
      subdomain: draft.body.data.slug,
      revision: draft.body.data.revision,
      snapshot: content(nextAvatar),
    });
    expect(edited.status).toBe(200);

    return { user, liveAvatar };
  }

  it.each(["INACTIVE", "grace_expired", `moderation:spam`])(
    "keeps the snapshot's images while it is suspended for %s: a renewal or admin lift restores that snapshot",
    async (reason) => {
      const { user, liveAvatar } = await publishThenSuspend(reason);
      expect(deletedKeys()).toEqual([]);

      const refused = await as(
        user,
        request(app).delete(`/api/v1/portfolio-assets/${liveAvatar.id}`),
      );
      expect(refused.status).toBe(409);

      const old = new Date(Date.now() - 2 * DAY_MS);
      await prisma.$executeRaw`UPDATE "PortfolioAsset" SET "updatedAt" = ${old}, "createdAt" = ${old} WHERE id = ${liveAvatar.id}`;
      await PortfolioAssetService.cleanupStaleAssets();

      expect(deletedKeys()).toEqual([]);
      expect(
        await prisma.portfolioAsset.findUnique({ where: { id: liveAvatar.id } }),
      ).not.toBeNull();
    },
  );

  it("releases the snapshot's images once the user unpublished: republishing uses the draft", async () => {
    const { liveAvatar } = await publishThenSuspend("user_unpublished");

    expect(deletedKeys()).toEqual([liveAvatar.key]);
    expect(await prisma.portfolioAsset.findUnique({ where: { id: liveAvatar.id } })).toBeNull();
  });
});

describe("stale asset cleanup (V-045)", () => {
  it("removes day-old pending uploads and completed images nothing references, and keeps the rest", async () => {
    const user = await createUserWithSession();
    const old = new Date(Date.now() - 2 * DAY_MS);

    const pending = await seedAsset(user.id, { status: "PENDING", createdAt: old });
    const orphan = await seedAsset(user.id, { createdAt: old, updatedAt: old });
    const used = await seedAsset(user.id, { createdAt: old, updatedAt: old });
    const fresh = await seedAsset(user.id);

    await prisma.document.create({
      data: {
        userId: user.id,
        type: "PORTFOLIO",
        title: "Portfolio",
        slug: `p-${user.id.slice(-8)}`,
        content: content(null, used),
      },
    });

    await PortfolioAssetService.cleanupStaleAssets();

    expect(deletedKeys()).toEqual([pending.key, orphan.key].sort());
    const remaining = await prisma.portfolioAsset.findMany({ where: { userId: user.id } });
    expect(remaining.map((asset) => asset.id).sort()).toEqual([used.id, fresh.id].sort());
  });
});

describe("publish image ownership", () => {
  async function publishWithExtraPageCover(cover: { id: string; key: string }, owner: TestUser) {
    const body = {
      ...content(null),
      pages: [
        {
          id: "page-2",
          slug: "more",
          title: "More",
          sections: [
            {
              id: "more-projects",
              type: "projects",
              title: "More work",
              visible: true,
              items: [{ id: "p2", title: "Other", coverImage: ref(cover) }],
            },
          ],
        },
      ],
    };
    const draft = await saveDraft(owner, { subdomain: `p-${owner.id.slice(-8)}`, snapshot: body });
    expect(draft.status).toBe(200);

    return as(owner, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: draft.body.data.id,
      subdomain: draft.body.data.slug,
      revision: draft.body.data.revision,
    });
  }

  it("refuses a cover image on an extra page that belongs to someone else", async () => {
    const owner = await createUserWithSession();
    const stranger = await createUserWithSession();
    const strangersImage = await seedAsset(stranger.id);

    const published = await publishWithExtraPageCover(strangersImage, owner);

    expect(published.status).toBe(400);
    expect(published.body.message).toMatch(/unavailable or invalid image/);
  });

  it("accepts the owner's own cover image on an extra page", async () => {
    const owner = await createUserWithSession();
    const ownImage = await seedAsset(owner.id);

    expect((await publishWithExtraPageCover(ownImage, owner)).status).toBe(201);
  });
});

describe("portfolio publish validation details (V-135)", () => {
  it("answers 400 with [{ path, message }] like every other validation failure", async () => {
    const user = await createUserWithSession();
    const incomplete = { ...content(null), identity: { ...content(null).identity, name: "" } };

    const draft = await saveDraft(user, {
      subdomain: `p-${user.id.slice(-8)}`,
      snapshot: incomplete,
    });
    expect(draft.status).toBe(200);

    const published = await as(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: draft.body.data.id,
      subdomain: draft.body.data.slug,
      revision: draft.body.data.revision,
    });

    expect(published.status).toBe(400);
    expect(published.body.details).toEqual([
      { path: "identity.name", message: expect.any(String) },
    ]);
  });
});

describe("public portfolio view beacon (V-131)", () => {
  async function seedLive() {
    const user = await createUserWithSession();
    const subdomain = `v-${randomUUID().slice(0, 8)}`;
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: "PORTFOLIO",
        title: "Portfolio",
        slug: subdomain,
        templateId: "signal",
        content: content(null),
        visibility: "PUBLIC",
      },
    });
    const publication = await prisma.portfolioPublication.create({
      data: {
        userId: user.id,
        documentId: document.id,
        subdomain,
        templateId: "signal",
        snapshot: content(null),
      },
    });
    return { subdomain, publicationId: publication.id };
  }

  async function bufferedFields() {
    const keys = await getRedis().keys("portfolio:views:buffer:*");
    return keys.length ? Object.keys(await getRedis().hGetAll(keys[0])) : [];
  }

  /**
   * `navigator.sendBeacon(url, JSON.stringify(body))` sends `text/plain`, one of the CORS
   * "simple" types, so the browser sends it from a portfolio subdomain without a preflight. An
   * `application/json` Blob needs one, and credentialed CORS is never granted to wildcard origins.
   */
  it("accepts a text/plain beacon from a portfolio subdomain and reads its referrer", async () => {
    const { subdomain, publicationId } = await seedLive();

    const response = await request(app)
      .post(`/api/v1/portfolios/public/${subdomain}/view`)
      .set("Origin", `https://${subdomain}.veriworkly.com`)
      .set("Content-Type", "text/plain;charset=UTF-8")
      .send(JSON.stringify({ referrer: "https://news.ycombinator.com/item?id=1" }));

    expect(response.status).toBe(202);
    expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
    expect(await bufferedFields()).toEqual([`${publicationId}:news.ycombinator.com`]);
  });

  it("still accepts JSON, and rejects a beacon body that is not a JSON object", async () => {
    const { subdomain, publicationId } = await seedLive();

    const json = await request(app)
      .post(`/api/v1/portfolios/public/${subdomain}/view`)
      .set("Origin", `https://${subdomain}.veriworkly.com`)
      .send({ referrer: "https://example.org/a" });
    expect(json.status).toBe(202);
    expect(await bufferedFields()).toEqual([`${publicationId}:example.org`]);

    const garbage = await request(app)
      .post(`/api/v1/portfolios/public/${subdomain}/view`)
      .set("Origin", `https://${subdomain}.veriworkly.com`)
      .set("Content-Type", "text/plain")
      .send("not json");
    expect(garbage.status).toBe(400);

    const wrongShape = await request(app)
      .post(`/api/v1/portfolios/public/${subdomain}/view`)
      .set("Origin", `https://${subdomain}.veriworkly.com`)
      .set("Content-Type", "text/plain")
      .send(JSON.stringify({ referrer: 42 }));
    expect(wrongShape.status).toBe(400);
    expect(wrongShape.body.details).toEqual([{ path: "referrer", message: expect.any(String) }]);
  });

  it("counts a view whose referrer is longer than 2048 characters, truncating it", async () => {
    const { subdomain, publicationId } = await seedLive();

    const response = await request(app)
      .post(`/api/v1/portfolios/public/${subdomain}/view`)
      .set("Origin", `https://${subdomain}.veriworkly.com`)
      .set("Content-Type", "text/plain")
      .send(JSON.stringify({ referrer: `https://example.org/${"a".repeat(2_500)}` }));

    expect(response.status).toBe(202);
    expect(await bufferedFields()).toEqual([`${publicationId}:example.org`]);
  });

  it("refuses an oversized beacon body", async () => {
    const { subdomain } = await seedLive();

    const response = await request(app)
      .post(`/api/v1/portfolios/public/${subdomain}/view`)
      .set("Origin", `https://${subdomain}.veriworkly.com`)
      .set("Content-Type", "text/plain")
      .send(JSON.stringify({ referrer: `https://example.org/${"a".repeat(8_000)}` }));

    expect(response.status).toBe(413);
  });
});
