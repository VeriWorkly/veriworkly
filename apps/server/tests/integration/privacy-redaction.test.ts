import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { cacheSessionUser, revokeSessionCaches, sessionCacheKeyForToken } from "#utils/authCache";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * V-231 a deleted account's identity does not survive in the admin audit log.
 * V-235 the affiliate dashboard shows earnings, not the customer behind them.
 * V-236 the public leaderboard carries no ids, usernames or images and ranks active affiliates only.
 * V-122 a revoked session cannot be re-cached by a lookup that was already in flight.
 */

let adminPromise: Promise<TestUser> | null = null;
function admin() {
  return (adminPromise ??= createUserWithSession({ email: "admin@example.test" }));
}

function as(user: TestUser, req: request.Test) {
  return req.set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie);
}

describe("V-231 admin audit after an account deletion", () => {
  it("keeps the deletion's own reason and no email, name or username of the person", async () => {
    const moderator = await admin();
    const target = await createUserWithSession({ email: "jane.private@example.test" });

    const rename = await as(moderator, request(app).patch(`/api/v1/admin/users/${target.id}`)).send(
      { name: "Jane Private", username: "janeprivate", reason: "Support ticket 42" },
    );
    expect(rename.status, JSON.stringify(rename.body)).toBe(200);

    const removed = await as(
      moderator,
      request(app).delete(`/api/v1/admin/users/${target.id}`),
    ).send({ confirmEmail: target.email, reason: "Requested erasure" });
    expect(removed.status, JSON.stringify(removed.body)).toBe(200);

    const entries = await prisma.adminAuditEntry.findMany({ where: { targetId: target.id } });
    const text = JSON.stringify(entries);
    expect(text).not.toContain("jane.private");
    expect(text).not.toContain("Jane Private");
    expect(text).not.toContain("janeprivate");

    const deletion = entries.find((entry) => entry.action === "user.delete");
    expect(deletion?.reason).toBe("Requested erasure");
    const update = entries.find((entry) => entry.action === "user.update");
    expect(update?.reason).toBe("Removed with the account");
  });
});

async function seedAffiliate(status: "ACTIVE" | "SUSPENDED", name: string, cents: number) {
  const user = await createUserWithSession({ name });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      affiliateStatus: status,
      affiliateCode: `code${randomUUID().slice(0, 8)}`,
      image: "https://images.example.test/me.png",
    },
  });
  await prisma.affiliateCommission.create({
    data: {
      affiliateId: user.id,
      amountCents: cents,
      rateBps: 2000,
      status: "AVAILABLE",
      providerPaymentId: `pay_${randomUUID()}`,
      subscriptionId: `sub_${randomUUID()}`,
      reason: "Shared address with affiliate (held for review)",
    },
  });
  return user;
}

describe("V-235 affiliate dashboard commission rows", () => {
  it("carry the affiliate's earnings only", async () => {
    const affiliate = await seedAffiliate("ACTIVE", "Dash Board", 500);

    const response = await as(affiliate, request(app).get("/api/v1/affiliates/me"));
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    const [row] = response.body.data.commissions as Array<Record<string, unknown>>;
    expect(row).toMatchObject({ amountCents: 500, status: "AVAILABLE", rateBps: 2000 });
    for (const field of [
      "providerPaymentId",
      "subscriptionId",
      "referralId",
      "reason",
      "affiliateId",
    ])
      expect(row, field).not.toHaveProperty(field);
  });
});

describe("V-236 public affiliate leaderboard", () => {
  it("lists active affiliates by display name only", async () => {
    await getRedis().flushDb();
    await seedAffiliate("ACTIVE", "Ada Lovelace", 90_000);
    await seedAffiliate("SUSPENDED", "Mallory Banned", 99_000);

    const response = await request(app)
      .get("/api/v1/affiliates/leaderboard?period=all_time")
      .set("Origin", STUDIO_ORIGIN);
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    const rows = response.body.data as Array<{ rank: number; user: Record<string, unknown> }>;
    const text = JSON.stringify(rows);
    expect(text).not.toContain("Mallory");
    expect(text).not.toContain("images.example.test");
    const ada = rows.find((row) => row.user?.name === "Ada L.");
    expect(ada?.rank).toBe(1);
    expect(Object.keys(ada!.user).sort()).toEqual(["affiliateTier", "name"]);
  });
});

describe("V-122 revoked session cache", () => {
  it("a revocation leaves a tombstone that refuses the in-flight write", async () => {
    const token = randomUUID();
    const key = sessionCacheKeyForToken(token);

    await revokeSessionCaches([token]);
    await cacheSessionUser(key, { id: "u", email: null, name: null });
    expect(await getRedis().get(key)).toBeNull();

    const other = sessionCacheKeyForToken(randomUUID());
    await cacheSessionUser(other, { id: "u", email: null, name: null });
    expect(JSON.parse((await getRedis().get(other))!)).toEqual({
      id: "u",
      email: null,
      name: null,
    });
  });

  it("sign-out through the API cannot be undone by a cached lookup", async () => {
    const user = await createUserWithSession();
    const me = () => as(user, request(app).get("/api/v1/users/me"));
    expect((await me()).status).toBe(200);

    const signOut = await as(user, request(app).post("/api/v1/auth/sign-out")).send({});
    expect(signOut.status).toBeLessThan(300);

    const key = sessionCacheKeyForToken(user.sessionToken);
    expect(await getRedis().get(`${key}:revoked`)).toBe("1");
    expect((await me()).status).toBe(401);
  });
});

describe("admin document audit entries carry no document title or slug", () => {
  it("delete, restore and share revoke record ids only", async () => {
    const moderator = await admin();
    const owner = await createUserWithSession();
    const document = await prisma.document.create({
      data: {
        userId: owner.id,
        title: "Secret Plans CV",
        slug: "secret-plans-cv",
        content: { basics: { name: "Owner" } },
        visibility: "UNLISTED",
      },
    });
    const share = await prisma.shareLink.create({
      data: { userId: owner.id, documentId: document.id, slug: "secret-plans-cv", snapshot: {} },
    });

    const revoked = await as(
      moderator,
      request(app).delete(`/api/v1/admin/share-links/${share.id}`),
    ).send({ reason: "Reported", confirm: "secret-plans-cv" });
    expect(revoked.status, JSON.stringify(revoked.body)).toBe(200);
    for (const step of ["delete", "restore"] as const) {
      const response =
        step === "delete"
          ? await as(moderator, request(app).delete(`/api/v1/admin/documents/${document.id}`)).send(
              { reason: "Reported" },
            )
          : await as(
              moderator,
              request(app).post(`/api/v1/admin/documents/${document.id}/restore`),
            ).send({ reason: "Reviewed" });
      expect(response.status, JSON.stringify(response.body)).toBe(200);
    }

    const entries = await prisma.adminAuditEntry.findMany({
      where: { action: { in: ["document.delete", "document.restore", "share_link.revoke"] } },
    });
    expect(entries).toHaveLength(3);
    expect(JSON.stringify(entries)).not.toMatch(/secret-plans-cv|Secret Plans/);
    const revokeEntry = entries.find((entry) => entry.action === "share_link.revoke");
    expect(revokeEntry?.metadata).toMatchObject({ documentId: document.id, ownerId: owner.id });
  });
});
