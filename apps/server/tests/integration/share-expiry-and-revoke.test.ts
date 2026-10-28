import request from "supertest";
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";

import { STUDIO_ORIGIN } from "./env.js";
import { adminClient } from "./helpers/admin.js";
import { createUserWithSession } from "./helpers/auth.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const admin = adminClient();

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(async () => {
  const keys = await getRedis().keys("rate-limit:*");
  if (keys.length > 0) await getRedis().del(keys);
});

function letters() {
  return Array.from(randomBytes(6), (b) => String.fromCharCode(97 + (b % 26))).join("");
}

async function ownerWithDocument() {
  const suffix = letters();
  const user = await createUserWithSession({ username: `exp${suffix}` });
  const document = await prisma.document.create({
    data: { userId: user.id, title: "Resume", slug: `cv-${suffix}`, content: {} },
  });
  return { user, username: `exp${suffix}`, document };
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

const verify = (username: string, slug: string, password: string) =>
  request(app)
    .post(`/api/v1/shares/public/${username}/${slug}/verify`)
    .set("Origin", STUDIO_ORIGIN)
    .send({ password });

async function storedExpiry(documentId: string) {
  const row = await prisma.shareLink.findFirstOrThrow({ where: { documentId } });
  return row.expiresAt;
}

describe("V-412 share expiry is 7, 14, 30 or 90 days, or never; 7 by default", () => {
  it("a link created without an expiry lasts 7 days, not forever", async () => {
    const { user, document } = await ownerWithDocument();

    const created = await share(user.cookie, { documentId: document.id });
    expect(created.status, JSON.stringify(created.body)).toBe(201);

    const expiresAt = await storedExpiry(document.id);
    expect(expiresAt).not.toBeNull();
    expect(Math.abs(expiresAt!.getTime() - (Date.now() + 7 * DAY_MS))).toBeLessThan(60_000);
  });

  it("an explicit null expiry without noExpiry is the 7-day default too", async () => {
    const { user, document } = await ownerWithDocument();

    const created = await share(user.cookie, { documentId: document.id, expiresAt: null });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(await storedExpiry(document.id)).not.toBeNull();
  });

  it("never is asked for with noExpiry: true", async () => {
    const { user, document } = await ownerWithDocument();

    const created = await share(user.cookie, { documentId: document.id, noExpiry: true });
    expect(created.status).toBe(201);
    expect(await storedExpiry(document.id)).toBeNull();
  });

  it.each([7, 14, 30, 90])("accepts the %i-day date the studio computes", async (days) => {
    const { user, document } = await ownerWithDocument();
    const chosen = new Date(Date.now() + days * DAY_MS);

    const created = await share(user.cookie, {
      documentId: document.id,
      expiresAt: chosen.toISOString(),
      noExpiry: false,
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect((await storedExpiry(document.id))?.toISOString()).toBe(chosen.toISOString());
  });

  it.each([
    ["a date in the past", -DAY_MS],
    ["3 days", 3 * DAY_MS],
    ["45 days", 45 * DAY_MS],
    ["a year", 365 * DAY_MS],
  ])("refuses %s with 400 and creates nothing", async (_label, offset) => {
    const { user, document } = await ownerWithDocument();

    const created = await share(user.cookie, {
      documentId: document.id,
      expiresAt: new Date(Date.now() + offset).toISOString(),
    });
    expect(created.status).toBe(400);
    expect(await prisma.shareLink.count({ where: { documentId: document.id } })).toBe(0);
  });

  it("refuses noExpiry together with a date", async () => {
    const { user, document } = await ownerWithDocument();

    const created = await share(user.cookie, {
      documentId: document.id,
      noExpiry: true,
      expiresAt: new Date(Date.now() + 7 * DAY_MS).toISOString(),
    });
    expect(created.status).toBe(400);
    expect(await prisma.shareLink.count({ where: { documentId: document.id } })).toBe(0);
  });

  it("an API key create without an expiry also gets 7 days", async () => {
    const { user, document } = await ownerWithDocument();
    const key = await request(app)
      .post("/api/v1/api-keys")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie)
      .send({ name: "integration", scopes: ["resume:write"] });
    expect(key.status, JSON.stringify(key.body)).toBe(201);

    const created = await request(app)
      .post("/api/v1/shares")
      .set("x-api-key", key.body.data.key)
      .send({ documentId: document.id, snapshot: {} });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(await storedExpiry(document.id)).not.toBeNull();
  });

  it("an expired link answers 410 on the public read, even after it was cached, and on verify", async () => {
    const { user, username, document } = await ownerWithDocument();

    const created = await share(user.cookie, { documentId: document.id, password: "letmein" });
    expect(created.status).toBe(201);
    const slug = created.body.data.slug as string;

    // Warm the public cache while the link is live.
    expect((await publicRead(username, slug)).status).toBe(200);

    // Eight days on: the cached entry is still in Redis (its TTL is real time), so the read is
    // answered from the cache and has to check the expiry itself. Only Date is faked.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.now() + 8 * DAY_MS));

    const read = await publicRead(username, slug);
    expect(read.status).toBe(410);
    expect((await verify(username, slug, "letmein")).status).toBe(410);
  });
});

describe("V-309 refreshing a link keeps its expiry unless a new one is chosen", () => {
  it("a refresh without an expiry keeps the stored date", async () => {
    const { user, document } = await ownerWithDocument();
    const chosen = new Date(Date.now() + 30 * DAY_MS);
    expect(
      (await share(user.cookie, { documentId: document.id, expiresAt: chosen.toISOString() }))
        .status,
    ).toBe(201);

    const refreshed = await share(user.cookie, { documentId: document.id });
    expect(refreshed.status).toBe(201);
    expect((await storedExpiry(document.id))?.toISOString()).toBe(chosen.toISOString());
  });

  it("a refresh keeps a never link never", async () => {
    const { user, document } = await ownerWithDocument();
    expect((await share(user.cookie, { documentId: document.id, noExpiry: true })).status).toBe(
      201,
    );

    expect((await share(user.cookie, { documentId: document.id })).status).toBe(201);
    expect(await storedExpiry(document.id)).toBeNull();
  });

  it("the studio's keep (resending the stored date, days later) is accepted", async () => {
    const { user, document } = await ownerWithDocument();
    expect((await share(user.cookie, { documentId: document.id })).status).toBe(201);

    // Five days in, the stored date is 2 days away: no option matches it, but it is the link's own.
    const stored = new Date(Date.now() + 2 * DAY_MS);
    await prisma.shareLink.updateMany({
      where: { documentId: document.id },
      data: { expiresAt: stored },
    });

    const kept = await share(user.cookie, {
      documentId: document.id,
      expiresAt: stored.toISOString(),
      noExpiry: false,
    });
    expect(kept.status, JSON.stringify(kept.body)).toBe(201);
    expect((await storedExpiry(document.id))?.toISOString()).toBe(stored.toISOString());
  });
});

describe("V-308 two concurrent shares of one document", () => {
  it("both succeed and leave one link", async () => {
    const { user, document } = await ownerWithDocument();

    const responses = await Promise.all(
      Array.from({ length: 4 }, () => share(user.cookie, { documentId: document.id })),
    );
    expect(responses.map((response) => response.status)).toEqual([201, 201, 201, 201]);
    expect(await prisma.shareLink.count({ where: { documentId: document.id } })).toBe(1);
  });
});

describe("V-413 an admin revoke takes the public URL down at once", () => {
  it("a warmed public link is 404 straight after the revoke, and the row is gone", async () => {
    const { user, username, document } = await ownerWithDocument();
    const created = await share(user.cookie, { documentId: document.id });
    expect(created.status).toBe(201);
    const slug = created.body.data.slug as string;
    const shareLinkId = created.body.data.id as string;

    // Warm: the first read caches the snapshot for up to an hour.
    expect((await publicRead(username, slug)).status).toBe(200);
    expect((await publicRead(username, slug)).status).toBe(200);

    const revoked = await admin
      .request("delete", `/admin/share-links/${shareLinkId}`)
      .send({ reason: "Reported as impersonation", confirm: slug });
    expect(revoked.status, JSON.stringify(revoked.body)).toBe(200);

    expect((await publicRead(username, slug)).status).toBe(404);
    expect(await prisma.shareLink.findUnique({ where: { id: shareLinkId } })).toBeNull();
    expect(
      await prisma.adminAuditEntry.count({
        where: { action: "share_link.revoke", targetId: shareLinkId },
      }),
    ).toBe(1);
  });

  it("the revoke is not applied when its audit entry cannot be written", async () => {
    const { user, username, document } = await ownerWithDocument();
    const created = await share(user.cookie, { documentId: document.id });
    const slug = created.body.data.slug as string;
    const shareLinkId = created.body.data.id as string;

    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION test_refuse_share_audit() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'audit refused'; END; $$ LANGUAGE plpgsql`);
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER test_refuse_share_audit BEFORE INSERT ON "AdminAuditEntry" FOR EACH ROW EXECUTE FUNCTION test_refuse_share_audit()`,
    );
    try {
      const revoked = await admin
        .request("delete", `/admin/share-links/${shareLinkId}`)
        .send({ reason: "Reported", confirm: slug });
      expect(revoked.status).toBe(500);
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS test_refuse_share_audit ON "AdminAuditEntry"`,
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS test_refuse_share_audit()`);
    }

    expect(await prisma.shareLink.findUnique({ where: { id: shareLinkId } })).not.toBeNull();
    expect((await publicRead(username, slug)).status).toBe(200);
  });
});
