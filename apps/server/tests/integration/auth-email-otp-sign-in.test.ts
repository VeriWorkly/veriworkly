import { randomBytes } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Email-code sign-in end to end on better-auth 1.7 (GHSA-q84f-53jg-9ppm upgrade), with real
 * Postgres and Redis; only the outgoing code mail is captured.
 *
 * 1.7 spends a code through `secondaryStorage.getAndDelete`, since the codes live only in Redis.
 * Without it every sign-in fails. A code must work exactly once, even for two requests racing
 * with it. 1.7 also checks the Prisma schema before serving auth requests, so these sign-ins
 * passing means the schema satisfies it, and an account written before the upgrade still signs
 * in to the same user.
 */

const { sendAuthOtpEmail } = vi.hoisted(() => ({
  sendAuthOtpEmail: vi.fn(),
}));

vi.mock("#services/mail/index", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#services/mail/index")>()),
  sendAuthOtpEmail,
}));

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";

import { STUDIO_ORIGIN } from "./env.js";
import { createSessionForUser, seedBetterAuthSessionEntries } from "./helpers/sessions.js";

function auth(path: string, body: object) {
  return request(app).post(`/api/v1/auth${path}`).set("Origin", STUDIO_ORIGIN).send(body);
}

async function requestCode(email: string): Promise<string> {
  sendAuthOtpEmail.mockClear();
  const res = await auth("/email-otp/send-verification-otp", { email, type: "sign-in" });
  expect(res.status).toBe(200);
  expect(sendAuthOtpEmail).toHaveBeenCalledTimes(1);
  return sendAuthOtpEmail.mock.calls[0]![0].otp as string;
}

async function verificationKeys(): Promise<string[]> {
  return getRedis().keys("verification:*");
}

function sessionCookieOf(res: request.Response): string | undefined {
  const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
  return cookies.find((cookie) => cookie.startsWith("veriworkly-auth.session_token="));
}

/** A user as 1.6 left it: an OTP-verified account with a linked GitHub row, no `issuer` column. */
async function seedExistingUser({ emailVerified = true } = {}) {
  const suffix = randomBytes(4).toString("hex");
  const email = `existing-${suffix}@example.test`;
  const user = await prisma.user.create({
    data: { email, name: "Existing", username: `existing${suffix}`, emailVerified },
  });
  const github = await prisma.account.create({
    data: {
      id: `acc-${suffix}`,
      userId: user.id,
      providerId: "github",
      accountId: `gh-${suffix}`,
      accessToken: "gho_old",
      scope: "read:user,user:email",
    },
  });
  return { user, github };
}

describe("email-code sign-in on better-auth 1.7", () => {
  beforeEach(async () => {
    sendAuthOtpEmail.mockReset();
    sendAuthOtpEmail.mockResolvedValue(undefined);
    // Each test starts with a fresh limiter, so the per-IP sign-in buckets never carry over.
    await getRedis().flushDb();
  });

  it("signs an account from before the upgrade in to the same user, once per code", async () => {
    const { user, github } = await seedExistingUser();

    const otp = await requestCode(user.email);
    expect(await verificationKeys()).toHaveLength(1);

    const signIn = await auth("/sign-in/email-otp", { email: user.email, otp });
    expect(signIn.status).toBe(200);
    expect(signIn.body.user.id).toBe(user.id);
    expect(sessionCookieOf(signIn)).toBeDefined();

    // Spent: gone from Redis, and the same code does not work again.
    expect(await verificationKeys()).toHaveLength(0);
    const replay = await auth("/sign-in/email-otp", { email: user.email, otp });
    expect(replay.status).toBeGreaterThanOrEqual(400);
    expect(replay.status).toBeLessThan(500);
    expect(sessionCookieOf(replay)).toBeUndefined();

    // No second user and no rewritten account: the pre-upgrade rows are untouched.
    expect(await prisma.user.count({ where: { email: user.email } })).toBe(1);
    const accounts = await prisma.account.findMany({ where: { userId: user.id } });
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      id: github.id,
      providerId: "github",
      accountId: github.accountId,
    });
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
  });

  it("lets only one of two requests racing with the same code sign in", async () => {
    const { user } = await seedExistingUser();
    const otp = await requestCode(user.email);

    const results = await Promise.all([
      auth("/sign-in/email-otp", { email: user.email, otp }),
      auth("/sign-in/email-otp", { email: user.email, otp }),
    ]);

    const statuses = results.map((res) => res.status).sort();
    expect(statuses[0]).toBe(200);
    expect(statuses[1]).toBeGreaterThanOrEqual(400);
    expect(statuses[1]).toBeLessThan(500);
    expect(results.filter((res) => sessionCookieOf(res))).toHaveLength(1);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
  });

  it("signs a new address up with a code and creates exactly one user", async () => {
    const email = `new-${randomBytes(4).toString("hex")}@example.test`;
    const otp = await requestCode(email);

    const signIn = await auth("/sign-in/email-otp", { email, otp });
    expect(signIn.status).toBe(200);
    expect(sessionCookieOf(signIn)).toBeDefined();
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });

  /**
   * A code proves the mailbox, so on an account whose email was never proven every earlier session
   * is dropped before the owner gets in (as in 1.6), and since 1.7 every linked account too (upgrade
   * guide, "Email OTP and magic links"). This is what stops someone who signed up with an unverified GitHub email from
   * keeping access to the real owner's account. It is the one way a GitHub link goes away (V-265
   * otherwise forbids it), and only once: the email is verified afterwards.
   */
  it("drops links and sessions an unproven account collected when the mailbox owner signs in", async () => {
    const { user } = await seedExistingUser({ emailVerified: false });
    const earlier = await createSessionForUser(user.id);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
    // Warm both caches, so the 401 below proves revocation reached them, not just Postgres.
    await seedBetterAuthSessionEntries(user.id, [earlier.sessionToken]);
    const warm = await request(app)
      .get("/api/v1/users/me")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", earlier.cookie);
    expect(warm.status).toBe(200);

    const otp = await requestCode(user.email);
    const signIn = await auth("/sign-in/email-otp", { email: user.email, otp });

    expect(signIn.status).toBe(200);
    expect(signIn.body.user.id).toBe(user.id);
    expect(await prisma.account.count({ where: { userId: user.id } })).toBe(0);
    // Only the session this sign-in just created is left.
    const sessions = await prisma.session.findMany({ where: { userId: user.id } });
    expect(sessions).toHaveLength(1);
    expect(sessionCookieOf(signIn)).toContain(encodeURIComponent(sessions[0]!.token));
    // The session from before the proof no longer works on the next request.
    const stale = await request(app)
      .get("/api/v1/users/me")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", earlier.cookie);
    expect(stale.status).toBe(401);
    expect(await getRedis().get(earlier.sessionToken)).toBeNull();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).toBe(
      true,
    );
  });

  it("refuses a wrong code without spending the right one", async () => {
    const { user } = await seedExistingUser();
    const otp = await requestCode(user.email);
    const wrong = otp === "000000" ? "111111" : "000000";

    const bad = await auth("/sign-in/email-otp", { email: user.email, otp: wrong });
    expect(bad.status).toBeGreaterThanOrEqual(400);
    expect(bad.status).toBeLessThan(500);

    const good = await auth("/sign-in/email-otp", { email: user.email, otp });
    expect(good.status).toBe(200);
    expect(good.body.user.id).toBe(user.id);
  });
});
