import { randomUUID } from "node:crypto";

import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * V-239 (the LinkedIn import keeps every AI guarantee: a bounded body, a client request id that
 * makes a retry free, a deadline signal and the per-user AI slot) and V-240 / V-243 (GitHub
 * failures are answered with what went wrong, never a 401 that signs the studio out, and every
 * GitHub call has a deadline). Only the AI call and `fetch` (GitHub's API) are replaced.
 */

const { convertResume, CONVERSION_CREDITS } = vi.hoisted(() => ({
  convertResume: vi.fn(),
  CONVERSION_CREDITS: 12,
}));

vi.mock("#services/ats/atsAi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#services/ats/atsAi")>()),
  createServerAtsAi: () => ({ convertResume }),
}));

vi.mock("#services/ats/aiPolicy", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#services/ats/aiPolicy")>()),
  getAtsAiPolicy: () => ({
    resumeConversion: {
      model: "test-model",
      maxOutputTokens: 100,
      temperature: 0,
      structuredOutputs: false,
      credits: CONVERSION_CREDITS,
    },
    prompts: { resumeConversion: "convert" },
  }),
}));

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { CreditService } from "#services/creditService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

const PROFILE_TEXT = "Jane Doe. Senior engineer at Example Corp since 2020. Builds things.";

function asUser(user: TestUser) {
  return {
    get: (url: string) =>
      request(app).get(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
    post: (url: string) =>
      request(app).post(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function paidUserWithCredits(amount: number) {
  const user = await createUserWithSession();
  await prisma.entitlementGrant.create({
    data: { userId: user.id, key: "ai_credits", source: "MANUAL", sourceId: randomUUID() },
  });
  const id = randomUUID();
  await CreditService.grant(user.id, amount, {
    requestId: `grant:${id}`,
    source: "integration",
    sourceId: id,
  });
  return user;
}

async function balance(userId: string) {
  return (await prisma.creditWallet.findUniqueOrThrow({ where: { userId } })).balance;
}

afterEach(() => {
  vi.restoreAllMocks();
  convertResume.mockReset();
});

describe("V-239 LinkedIn import keeps the AI guarantees", () => {
  it("refuses pasted text over 50,000 characters with a 400, before any AI call", async () => {
    const user = await paidUserWithCredits(50);

    const response = await asUser(user)
      .post("/api/v1/profiles/import/linkedin")
      .send({ profileText: "x".repeat(50_001), replaceMaster: false });

    expect(response.status).toBe(400);
    expect(convertResume).not.toHaveBeenCalled();
  });

  it("a retry with the same requestId after a lost response pays once and creates one document", async () => {
    const user = await paidUserWithCredits(50);
    convertResume.mockResolvedValue({
      result: { basics: { fullName: "Jane Doe" }, summary: "Builds things." },
      rejected: [],
    });
    const requestId = `li-${randomUUID()}`;

    const first = await asUser(user)
      .post("/api/v1/profiles/import/linkedin")
      .send({ profileText: PROFILE_TEXT, replaceMaster: false, requestId });
    expect(first.status, JSON.stringify(first.body)).toBe(200);

    const retry = await asUser(user)
      .post("/api/v1/profiles/import/linkedin")
      .send({ profileText: PROFILE_TEXT, replaceMaster: false, requestId });
    expect(retry.status, JSON.stringify(retry.body)).toBe(200);
    expect(retry.body.data.id).toBe(first.body.data.id);
    expect(retry.body.data.replayed).toBe(true);

    expect(convertResume).toHaveBeenCalledTimes(1);
    expect(await balance(user.id)).toBe(50 - CONVERSION_CREDITS);
    expect(await prisma.document.count({ where: { userId: user.id } })).toBe(1);
  });

  it("the same requestId with different text is a 409, not a second import", async () => {
    const user = await paidUserWithCredits(50);
    convertResume.mockResolvedValue({
      result: { basics: { fullName: "Jane Doe" }, summary: "Builds things." },
      rejected: [],
    });
    const requestId = `li-${randomUUID()}`;

    expect(
      (
        await asUser(user)
          .post("/api/v1/profiles/import/linkedin")
          .send({ profileText: PROFILE_TEXT, replaceMaster: false, requestId })
      ).status,
    ).toBe(200);
    const before = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const reused = await asUser(user)
      .post("/api/v1/profiles/import/linkedin")
      .send({ profileText: `${PROFILE_TEXT} More.`, replaceMaster: false, requestId });
    expect(reused.status).toBe(409);
    // V-417: the refusal charged nothing, held nothing, made nothing and stamped nothing.
    expect(convertResume).toHaveBeenCalledTimes(1);
    expect(await balance(user.id)).toBe(50 - CONVERSION_CREDITS);
    expect(
      (await prisma.creditWallet.findUniqueOrThrow({ where: { userId: user.id } })).reserved,
    ).toBe(0);
    expect(await prisma.creditReservation.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.document.count({ where: { userId: user.id } })).toBe(1);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.lastLinkedinImportAt).toEqual(before.lastLinkedinImportAt);
  });

  it("hands the model call an abort signal", async () => {
    const user = await paidUserWithCredits(50);
    convertResume.mockResolvedValue({
      result: { basics: { fullName: "Jane Doe" }, summary: "Builds things." },
      rejected: [],
    });

    const response = await asUser(user)
      .post("/api/v1/profiles/import/linkedin")
      .send({ profileText: PROFILE_TEXT, replaceMaster: false });
    expect(response.status).toBe(200);
    expect(convertResume.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("runs inside the per-user AI slot: a third concurrent AI request is refused", async () => {
    const user = await paidUserWithCredits(50);
    const slotKey = `ai:in-flight:${user.id}`;
    // Two provider calls already in flight for this user.
    await getRedis().set(slotKey, "2", { EX: 60 });

    const response = await asUser(user)
      .post("/api/v1/profiles/import/linkedin")
      .send({ profileText: PROFILE_TEXT, replaceMaster: false });

    expect(response.status).toBe(429);
    expect(convertResume).not.toHaveBeenCalled();
    // V-417: refused before anything was charged, held, created or stamped.
    expect(await balance(user.id)).toBe(50);
    expect(await prisma.creditReservation.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.document.count({ where: { userId: user.id } })).toBe(0);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).lastLinkedinImportAt,
    ).toBeNull();
    // The slot counter is back where the two other calls left it.
    expect(await getRedis().get(slotKey)).toBe("2");
  });
});

describe("V-240 / V-243 GitHub failures say what happened", () => {
  async function freeUserWithGithub() {
    const user = await createUserWithSession();
    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: "github",
        accountId: String(Math.floor(Math.random() * 1e9)),
        accessToken: "gho_test",
      },
    });
    return user;
  }

  function importGithub(user: TestUser) {
    return asUser(user)
      .post("/api/v1/profiles/import/github")
      .send({ usernameOrUrl: "octocat", replaceMaster: false });
  }

  it("an expired GitHub token is a 409 GITHUB_RECONNECT_REQUIRED, never a 401", async () => {
    const user = await freeUserWithGithub();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ message: "Bad creds" }, 401));

    const response = await importGithub(user);
    expect(response.status).toBe(409);
    expect(response.body.details?.code).toBe("GITHUB_RECONNECT_REQUIRED");
  });

  it("a GitHub 5xx is a 502 GITHUB_UNAVAILABLE", async () => {
    const user = await freeUserWithGithub();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, 503));

    const response = await importGithub(user);
    expect(response.status).toBe(502);
    expect(response.body.details?.code).toBe("GITHUB_UNAVAILABLE");
  });

  it("a GitHub rate limit is a 503 GITHUB_RATE_LIMITED", async () => {
    const user = await freeUserWithGithub();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0" } }),
    );

    const response = await importGithub(user);
    expect(response.status).toBe(503);
    expect(response.body.details?.code).toBe("GITHUB_RATE_LIMITED");
  });

  it("a network error is a 502 GITHUB_UNAVAILABLE, not a raw 500, and every call carries a deadline", async () => {
    const user = await freeUserWithGithub();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    const response = await importGithub(user);
    expect(response.status).toBe(502);
    expect(response.body.details?.code).toBe("GITHUB_UNAVAILABLE");
    // V-420: the loop passes when it runs zero times, so the call is asserted first.
    expect(fetchSpy).toHaveBeenCalled();
    for (const [, init] of fetchSpy.mock.calls) expect(init?.signal).toBeInstanceOf(AbortSignal);

    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.lastGithubImportAt).toBeNull();
  });

  it("the quota lookup survives a GitHub network error and asks with a deadline", async () => {
    const user = await freeUserWithGithub();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    const response = await asUser(user).get("/api/v1/profiles/import/quota");
    expect(response.status).toBe(200);
    expect(response.body.data.github).toMatchObject({
      hasGithubAccount: true,
      connectedUsername: null,
    });
    expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
