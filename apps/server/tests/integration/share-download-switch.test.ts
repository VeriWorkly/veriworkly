import request from "supertest";
import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { cacheGet, cacheSet, getRedis } from "#lib/redis";
import { cacheNamespaces } from "#lib/cacheKeys";
import { resolveGenerationalKey } from "#lib/cacheGeneration";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";

/**
 * V-421: a share link can turn off its Download button. `allowDownload` is a display preference
 * stored on the link (true by default), set by `POST /shares`, and carried by the public read and
 * the owner's list. The public read is cached, so a change must reach a reader at once.
 */

beforeEach(async () => {
  const keys = await getRedis().keys("rate-limit:*");
  if (keys.length > 0) await getRedis().del(keys);
});

function letters() {
  return Array.from(randomBytes(6), (b) => String.fromCharCode(97 + (b % 26))).join("");
}

async function ownerWithDocument() {
  const suffix = letters();
  const username = `dl${suffix}`;
  const user = await createUserWithSession({ username });
  const document = await prisma.document.create({
    data: { userId: user.id, title: "Resume", slug: `cv-${suffix}`, content: {} },
  });
  return { user, username, document };
}

function share(cookie: string, body: Record<string, unknown>) {
  return request(app)
    .post("/api/v1/shares")
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", cookie)
    .send({ snapshot: { basics: { name: "Owner" } }, ...body });
}

const publicRead = (username: string, slug: string) =>
  request(app).get(`/api/v1/shares/public/${username}/${slug}`).set("Origin", STUDIO_ORIGIN);

const ownerList = (cookie: string, documentId: string) =>
  request(app)
    .get(`/api/v1/shares/documents/${documentId}`)
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", cookie);

async function storedAllowDownload(documentId: string) {
  const row = await prisma.shareLink.findFirstOrThrow({ where: { documentId } });
  return (row as unknown as { allowDownload: unknown }).allowDownload;
}

describe("V-421 a share link can turn off downloads", () => {
  it("is true by default: stored, in the create response, the public read and the owner's list", async () => {
    const { user, username, document } = await ownerWithDocument();

    const created = await share(user.cookie, { documentId: document.id });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(created.body.data.allowDownload).toBe(true);
    expect(await storedAllowDownload(document.id)).toBe(true);

    const read = await publicRead(username, created.body.data.slug);
    expect(read.status, JSON.stringify(read.body)).toBe(200);
    expect(read.body.data.allowDownload).toBe(true);

    const listed = await ownerList(user.cookie, document.id);
    expect(listed.status).toBe(200);
    expect(listed.body.data.items[0].allowDownload).toBe(true);
  });

  it("is stored false when the link is created with allowDownload: false", async () => {
    const { user, username, document } = await ownerWithDocument();

    const created = await share(user.cookie, { documentId: document.id, allowDownload: false });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(created.body.data.allowDownload).toBe(false);
    expect(await storedAllowDownload(document.id)).toBe(false);

    const read = await publicRead(username, created.body.data.slug);
    expect(read.body.data.allowDownload).toBe(false);
    expect(read.body.data.snapshot).toEqual({ basics: { name: "Owner" } });

    const listed = await ownerList(user.cookie, document.id);
    expect(listed.body.data.items[0].allowDownload).toBe(false);
  });

  it("a refresh without allowDownload keeps the stored value, and one with it changes it", async () => {
    const { user, document } = await ownerWithDocument();

    expect(
      (await share(user.cookie, { documentId: document.id, allowDownload: false })).status,
    ).toBe(201);

    const kept = await share(user.cookie, { documentId: document.id });
    expect(kept.status).toBe(201);
    expect(kept.body.data.allowDownload).toBe(false);
    expect(await storedAllowDownload(document.id)).toBe(false);

    const turnedOn = await share(user.cookie, { documentId: document.id, allowDownload: true });
    expect(turnedOn.body.data.allowDownload).toBe(true);
    expect(await storedAllowDownload(document.id)).toBe(true);
  });

  it("refuses a non-boolean allowDownload", async () => {
    const { user, document } = await ownerWithDocument();

    const refused = await share(user.cookie, { documentId: document.id, allowDownload: "no" });
    expect(refused.status).toBe(400);
  });

  it("a change shows on the public read even when that read is cached", async () => {
    const { user, username, document } = await ownerWithDocument();

    const created = await share(user.cookie, { documentId: document.id });
    const slug: string = created.body.data.slug;
    expect((await publicRead(username, slug)).body.data.allowDownload).toBe(true);

    // The read above cached the link.
    const warmKey = await resolveGenerationalKey(cacheNamespaces.publicShare(username), slug);
    expect(warmKey).not.toBeNull();
    expect(await cacheGet(warmKey!)).not.toBeNull();

    const changed = await share(user.cookie, { documentId: document.id, allowDownload: false });
    expect(changed.status).toBe(201);
    expect((await publicRead(username, slug)).body.data.allowDownload).toBe(false);

    await share(user.cookie, { documentId: document.id, allowDownload: true });
    expect((await publicRead(username, slug)).body.data.allowDownload).toBe(true);
  });

  it("a public read cached before the field existed reads as true", async () => {
    const { user, username, document } = await ownerWithDocument();

    const created = await share(user.cookie, { documentId: document.id, allowDownload: false });
    const slug: string = created.body.data.slug;
    expect((await publicRead(username, slug)).body.data.allowDownload).toBe(false);

    const key = await resolveGenerationalKey(cacheNamespaces.publicShare(username), slug);
    const cached = (await cacheGet<Record<string, unknown>>(key!))!;
    delete cached.allowDownload;
    await cacheSet(key!, cached, 60);

    expect((await publicRead(username, slug)).body.data.allowDownload).toBe(true);
  });

  it("the password unlock carries it too, and the password screen does not", async () => {
    const { user, username, document } = await ownerWithDocument();

    const created = await share(user.cookie, {
      documentId: document.id,
      password: "open sesame",
      allowDownload: false,
    });
    const slug: string = created.body.data.slug;

    const locked = await publicRead(username, slug);
    expect(locked.body.data).toEqual({
      passwordRequired: true,
      expiresAt: created.body.data.expiresAt,
    });

    const unlocked = await request(app)
      .post(`/api/v1/shares/public/${username}/${slug}/verify`)
      .set("Origin", STUDIO_ORIGIN)
      .send({ password: "open sesame" });
    expect(unlocked.status).toBe(200);
    expect(unlocked.body.data.allowDownload).toBe(false);
  });
});
