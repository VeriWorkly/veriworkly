import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "#app";
import { auth } from "#auth/index";
import { githubAccountRaceGuard } from "#auth/githubLinking";
import { prisma } from "#lib/prisma";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * GitHub linking rules (V-265) against real Postgres and better-auth's own adapter: a linked
 * GitHub cannot be unlinked, a second different GitHub cannot be added (the hook runs on every
 * account row better-auth creates), and one GitHub account cannot belong to two users.
 */

async function linkAccount(user: TestUser, providerId: string, accountId: string) {
  return prisma.account.create({
    data: { id: randomUUID(), userId: user.id, providerId, accountId },
  });
}

async function createThroughBetterAuth(userId: string, accountId: string) {
  const context = await auth.$context;
  return context.internalAdapter.createAccount({ userId, providerId: "github", accountId });
}

function githubRows(userId: string) {
  return prisma.account.findMany({ where: { userId, providerId: "github" } });
}

describe("GitHub linking rules (V-265)", () => {
  it("refuses to unlink GitHub with GITHUB_UNLINK_FORBIDDEN, and still unlinks other providers", async () => {
    const user = await createUserWithSession();
    await linkAccount(user, "github", "gh-1");
    await linkAccount(user, "google", "google-1");
    await linkAccount(user, "linkedin", "linkedin-1");

    const unlink = (providerId: string) =>
      request(app)
        .post("/api/v1/auth/unlink-account")
        .set("Origin", STUDIO_ORIGIN)
        .set("Cookie", user.cookie)
        .send({ providerId });

    const refused = await unlink("github");
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe("GITHUB_UNLINK_FORBIDDEN");
    expect(await githubRows(user.id)).toHaveLength(1);

    const google = await unlink("google");
    expect(google.status).toBe(200);
    expect(await prisma.account.count({ where: { userId: user.id, providerId: "google" } })).toBe(
      0,
    );
  });

  it("links a first GitHub account", async () => {
    const user = await createUserWithSession();

    await expect(createThroughBetterAuth(user.id, "gh-first")).resolves.toMatchObject({
      accountId: "gh-first",
    });
    expect(await githubRows(user.id)).toHaveLength(1);
  });

  it("refuses a second, different GitHub account with GITHUB_ALREADY_LINKED", async () => {
    const user = await createUserWithSession();
    await linkAccount(user, "github", "gh-original");

    await expect(createThroughBetterAuth(user.id, "gh-other")).rejects.toMatchObject({
      statusCode: 403,
      body: expect.objectContaining({ code: "GITHUB_ALREADY_LINKED" }),
    });

    const rows = await githubRows(user.id);
    expect(rows.map((row) => row.accountId)).toEqual(["gh-original"]);
  });

  it("cannot put one GitHub account on two VeriWorkly users", async () => {
    const owner = await createUserWithSession();
    const other = await createUserWithSession();
    await linkAccount(owner, "github", "gh-shared");

    // `Account` is unique on (providerId, accountId); better-auth's link callback also checks
    // the owner first and redirects with account_already_linked_to_different_user.
    await expect(createThroughBetterAuth(other.id, "gh-shared")).rejects.toThrow();

    const owners = await prisma.account.findMany({
      where: { providerId: "github", accountId: "gh-shared" },
      select: { userId: true },
    });
    expect(owners).toEqual([{ userId: owner.id }]);
  });

  it("has the partial unique index behind the rule (db:drift cannot see it)", async () => {
    const rows = await prisma.$queryRaw<Array<{ indexdef: string }>>`
      SELECT indexdef FROM pg_indexes
      WHERE tablename = 'Account' AND indexname = 'Account_userId_github_key'`;

    expect(rows).toHaveLength(1);
    expect(rows[0].indexdef).toMatch(/CREATE UNIQUE INDEX .* \("userId"\)/);
    expect(rows[0].indexdef).toMatch(/WHERE \("providerId" = 'github'::text\)/);
  });

  it("lets Postgres refuse a second GitHub row even when the hook is bypassed", async () => {
    const user = await createUserWithSession();
    await linkAccount(user, "github", "gh-a");

    await expect(linkAccount(user, "github", "gh-b")).rejects.toMatchObject({ code: "P2002" });
    // Other providers are untouched by the index.
    await linkAccount(user, "google", "g-1");
    await linkAccount(user, "linkedin", "l-1");
  });

  it("maps the index violation to GITHUB_ALREADY_LINKED on the client better-auth uses", async () => {
    const user = await createUserWithSession();
    await linkAccount(user, "github", "gh-map-a");

    const guarded = prisma.$extends(githubAccountRaceGuard);
    await expect(
      guarded.account.create({
        data: { id: randomUUID(), userId: user.id, providerId: "github", accountId: "gh-map-b" },
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      body: expect.objectContaining({ code: "GITHUB_ALREADY_LINKED" }),
    });

    // A GitHub account owned by someone else keeps its own P2002, not this code.
    const other = await createUserWithSession();
    await expect(
      guarded.account.create({
        data: { id: randomUUID(), userId: other.id, providerId: "github", accountId: "gh-map-a" },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("treats a duplicate insert of the same GitHub for the same user as already linked", async () => {
    const user = await createUserWithSession();
    const existing = await linkAccount(user, "github", "gh-double");

    const guarded = prisma.$extends(githubAccountRaceGuard);
    await expect(
      guarded.account.create({
        data: { id: randomUUID(), userId: user.id, providerId: "github", accountId: "gh-double" },
      }),
    ).resolves.toMatchObject({ id: existing.id, userId: user.id });
    expect(await githubRows(user.id)).toHaveLength(1);
  });

  it("settles a double-clicked link of the same GitHub without an error", async () => {
    const user = await createUserWithSession();

    const results = await Promise.allSettled([
      createThroughBetterAuth(user.id, "gh-click"),
      createThroughBetterAuth(user.id, "gh-click"),
    ]);

    expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"]);
    expect(await githubRows(user.id)).toHaveLength(1);
  });

  it("lets exactly one of two racing links for different GitHub accounts win", async () => {
    const user = await createUserWithSession();

    const results = await Promise.allSettled([
      createThroughBetterAuth(user.id, "gh-race-1"),
      createThroughBetterAuth(user.id, "gh-race-2"),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const [refused] = results.filter((result) => result.status === "rejected");
    expect((refused as PromiseRejectedResult).reason).toMatchObject({
      statusCode: 403,
      body: expect.objectContaining({ code: "GITHUB_ALREADY_LINKED" }),
    });
    expect(await githubRows(user.id)).toHaveLength(1);
  });
});
