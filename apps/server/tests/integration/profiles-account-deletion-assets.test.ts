import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * V-018: account deletion must remove the user's R2 objects. `PortfolioAsset.user` cascades, so
 * the keys have to be read before the rows go and the objects deleted after the commit. Only the
 * S3 client is replaced; the database, cache and request path are real. Both deletion paths
 * (self-service and admin) are covered.
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

import { app } from "#app";
import { config } from "#config";
import { prisma } from "#lib/prisma";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";

beforeAll(() => {
  // The suite boots without R2; the asset service refuses to build a client otherwise.
  config.r2.endpoint = "https://r2.example.test";
  config.r2.bucket = "test-bucket";
  config.r2.accessKeyId = "key";
  config.r2.secretAccessKey = "secret";
});

beforeEach(() => {
  s3Send.mockClear();
});

async function seedAssets(userId: string) {
  const keys = [
    `portfolio/${userId}/${randomUUID()}.png`,
    `portfolio/${userId}/${randomUUID()}.jpg`,
  ];

  for (const [index, key] of keys.entries()) {
    await prisma.portfolioAsset.create({
      data: {
        userId,
        key,
        kind: index === 0 ? "AVATAR" : "PROJECT_COVER",
        mimeType: index === 0 ? "image/png" : "image/jpeg",
        sizeBytes: 1024,
        status: "READY",
      },
    });
  }

  return keys;
}

function deletedKeys() {
  return s3Send.mock.calls
    .map(([command]) => (command as { input: { Bucket: string; Key: string } }).input)
    .filter((input) => input.Bucket === "test-bucket")
    .map((input) => input.Key)
    .sort();
}

describe("account deletion removes the account's R2 objects (V-018)", () => {
  it("DELETE /users/me deletes every PortfolioAsset key from R2 after the rows are gone", async () => {
    const user = await createUserWithSession();
    const keys = await seedAssets(user.id);

    const response = await request(app)
      .delete("/api/v1/users/me")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);

    expect(response.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await prisma.portfolioAsset.count({ where: { key: { in: keys } } })).toBe(0);
    expect(deletedKeys()).toEqual([...keys].sort());
  });

  it("DELETE /admin/users/:id deletes every PortfolioAsset key from R2 too", async () => {
    const adminUser = await createUserWithSession({ email: "admin@example.test" });
    const target = await createUserWithSession();
    const keys = await seedAssets(target.id);

    const response = await request(app)
      .delete(`/api/v1/admin/users/${target.id}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", adminUser.cookie)
      .send({ confirmEmail: target.email, reason: "integration test cleanup" });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: target.id } })).toBeNull();
    expect(await prisma.portfolioAsset.count({ where: { key: { in: keys } } })).toBe(0);
    expect(deletedKeys()).toEqual([...keys].sort());
  });
});
