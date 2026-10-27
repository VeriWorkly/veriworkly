import { randomBytes } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

/**
 * V-244 (the master-profile cache cannot keep a row older than a committed save), V-245 (share
 * views record the viewer, not the studio server) and V-246 (share snapshots are bounded and
 * never echoed back to the owner). Real Postgres and Redis.
 */

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { buildResumeShell } from "#services/profileImportService";
import { hashForAnalytics } from "#utils/analyticsHash";

import { INTERNAL_API_KEY_VALUE, STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

function asUser(user: TestUser) {
  return {
    get: (url: string) =>
      request(app).get(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
    post: (url: string) =>
      request(app).post(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
    put: (url: string) =>
      request(app).put(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
  };
}

function profile(fullName: string) {
  return buildResumeShell({
    basics: {
      fullName,
      role: "Engineer",
      headline: "Builds things.",
      email: "jane@example.test",
      phone: "",
      location: "Remote",
      linkEmail: true,
      linkPhone: false,
      linkLocation: true,
    },
    links: [],
    summary: "Builds things.",
    projects: [],
    skills: [],
  });
}

async function sharedDocument(user: TestUser, snapshot: object = { basics: { name: "Owner" } }) {
  const api = asUser(user);
  const created = await api
    .post("/api/v1/documents")
    .send({ type: "RESUME", title: "Resume", content: { basics: { name: "Owner" } } });
  expect(created.status).toBe(201);
  const share = await api
    .post("/api/v1/shares")
    .send({ documentId: created.body.data.id, snapshot });
  return { documentId: created.body.data.id as string, share };
}

async function bufferedViews() {
  const raw = await getRedis().lRange("share:views:buffer", 0, -1);
  return raw.map((entry) => JSON.parse(entry) as { ipAddress: string | null; userAgent: string });
}

describe("V-244 master profile cache", () => {
  it("a read that loaded before a save cannot cache the old row over it", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);
    const first = await api.put("/api/v1/profiles/master").send({ profile: profile("Original") });
    expect(first.status).toBe(200);

    const original = prisma.masterProfile.findUnique.bind(prisma.masterProfile);
    vi.spyOn(prisma.masterProfile, "findUnique").mockImplementationOnce((async (args: never) => {
      const stale = await original(args);
      const saved = await api
        .put("/api/v1/profiles/master")
        .send({ profile: profile("Fresh"), expectedUpdatedAt: first.body.data.updatedAt });
      expect(saved.status).toBe(200);
      return stale;
    }) as never);

    const racing = await api.get("/api/v1/profiles/master");
    expect(racing.body.data.profile.content.basics.fullName).toBe("Original");

    const next = await api.get("/api/v1/profiles/master");
    expect(next.body.data.profile.content.basics.fullName).toBe("Fresh");
    vi.restoreAllMocks();
  });
});

describe("V-245 share views record the viewer", () => {
  it("uses the forwarded client IP and user agent from the studio's server render", async () => {
    const user = await createUserWithSession({ username: `own${randomBytes(4).toString("hex")}` });
    const { share } = await sharedDocument(user);
    const owner = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    await getRedis().del("share:views:buffer");

    const response = await request(app)
      .get(`/api/v1/shares/public/${owner.username}/${share.body.data.slug}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("User-Agent", "node")
      .set("x-internal-key", INTERNAL_API_KEY_VALUE)
      .set("x-forwarded-client-ip", "203.0.113.7")
      .set("x-forwarded-client-user-agent", "Mozilla/5.0 Recruiter");
    expect(response.status).toBe(200);

    await vi.waitFor(async () => expect(await bufferedViews()).toHaveLength(1));
    const [view] = await bufferedViews();
    expect(view.ipAddress).toBe(hashForAnalytics("203.0.113.7"));
    expect(view.userAgent).toBe("Mozilla/5.0 Recruiter");
  });

  it("ignores the forwarded user agent without the internal key", async () => {
    const user = await createUserWithSession({ username: `own${randomBytes(4).toString("hex")}` });
    const { share } = await sharedDocument(user);
    const owner = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    await getRedis().del("share:views:buffer");

    await request(app)
      .get(`/api/v1/shares/public/${owner.username}/${share.body.data.slug}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("User-Agent", "Direct Browser")
      .set("x-forwarded-client-user-agent", "Spoofed");

    await vi.waitFor(async () => expect(await bufferedViews()).toHaveLength(1));
    expect((await bufferedViews())[0].userAgent).toBe("Direct Browser");
  });
});

describe("V-246 share snapshots are bounded and not echoed", () => {
  it("refuses a snapshot over 1 MB with a 413", async () => {
    const user = await createUserWithSession();
    const { share } = await sharedDocument(user, { blob: "x".repeat(1_100_000) });
    expect(share.status).toBe(413);
  });

  it("the create response and the owner's list carry no snapshot, and say whether a password is set", async () => {
    const user = await createUserWithSession();
    const { documentId, share } = await sharedDocument(user);
    expect(share.status).toBe(201);
    expect(share.body.data).not.toHaveProperty("snapshot");
    expect(share.body.data).not.toHaveProperty("passwordHash");
    expect(share.body.data.hasPassword).toBe(false);

    const list = await asUser(user).get(`/api/v1/shares/documents/${documentId}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0]).not.toHaveProperty("snapshot");
    expect(list.body.data.items[0]).not.toHaveProperty("passwordHash");
    expect(list.body.data.items[0].hasPassword).toBe(false);
  });
});
