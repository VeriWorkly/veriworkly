import http from "node:http";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";

import { DEFAULT_POLICY } from "@veriworkly/ats-engine";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { config } from "#config";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { AtsAiService } from "#services/ats/ai";
import { AtsJobFetchService } from "#services/ats/jobFetch";
import { AtsQuotaService } from "#services/ats/quota";
import { CreditService } from "#services/creditService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * The paid AI paths against the real database, Redis and Express stack, with only the provider
 * replaced: the global `fetch` the engine's OpenAI-compatible adapter posts with is stubbed, so
 * the request body, the abort signal and the retry loop are exactly production's.
 *
 * Every case ends on the ledger: a reservation the user never received an answer for must be
 * RELEASED and the wallet back where it started.
 */

const ATS_AI_POLICY = {
  prompts: { standardAnalysis: "analyse", onlineAnalysis: "analyse online", resumeConversion: "c" },
  pricing: { creditRevenueUsd: 1, analysisBuckets: [5], onlineMultiplier: 2 },
  models: [
    {
      model: "analysis-model",
      tiers: ["standard", "detailed", "advanced", "expert"],
      inputUsdPerMillion: 0,
      outputUsdPerMillion: 0,
      maxOutputTokens: 1000,
      retries: 0,
      feeMultiplier: 1,
    },
  ],
  resumeConversion: { credits: 25, model: "conversion-model", maxOutputTokens: 4000 },
  parseRepair: { credits: 10, model: "repair-model", maxOutputTokens: 2000 },
};

const ANALYSIS_CREDITS = 5;
const REPAIR_CREDITS = 10;

/** Enough prose for `needsRepair` (no dated roles, more than 160 words) and no skills for a repair to fill. */
const THIN_RESUME = [
  "Jane Doe",
  "Seasoned builder of resilient services and the teams that run them. Spent the better part of a",
  "decade on platform work: queues, schedulers, deployment tooling, the unglamorous pieces that",
  "make product teams fast. Known for calm incident command and for writing the runbook before",
  "the outage rather than after it. Comfortable across the stack from Postgres query plans to the",
  "React component that renders their output, and happiest when deleting code that no longer",
  "earns its keep. Mentors generously, reviews thoroughly, ships often. Previously led migration",
  "of a monolith to services without a single customer-visible incident, cut infrastructure spend",
  "by a third through right-sizing and reserved capacity, and built the internal developer portal",
  "that every team now starts from. Believes observability is a product feature. Strong written",
  "communicator who has presented at internal engineering summits and external meetups alike.",
  "Looking for a staff role on a team that values craft and measured ambition in equal parts and",
  "keeps its promises to users. References available on request from former managers and peers",
  "across three companies and two continents, covering both technical depth and leadership range.",
  "Fluent in English and German, conversational in Hindi. Open to relocation and remote work.",
].join("\n");

const ANALYSIS_REPLY = {
  explanation: "Targeted review",
  missingEvidence: [],
  keywordOpportunities: [],
  recommendedImprovements: [],
  priorityOrder: [],
};

function chatResponse(content: unknown, id = `cmpl-${randomUUID()}`) {
  const body = {
    id,
    choices: [{ finish_reason: "stop", message: { content: JSON.stringify(content) } }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };
  return { ok: true, status: 200, text: async () => JSON.stringify(body) };
}

function providerError(status: number) {
  return { ok: false, status, text: async () => JSON.stringify({ error: { message: "boom" } }) };
}

type FetchInit = { body: string; signal?: AbortSignal };
type PendingCall = { init: FetchInit; resolve: (value: unknown) => void };

/** A provider that never answers until the test lets it, and honours the request's abort. */
function pendingProvider(calls: PendingCall[]) {
  return (_url: string, init: FetchInit) =>
    new Promise((resolve, reject) => {
      calls.push({ init, resolve });
      init.signal?.addEventListener("abort", () =>
        reject(new DOMException("The operation was aborted.", "AbortError")),
      );
    });
}

async function waitFor<T>(read: () => Promise<T>, ok: (value: T) => boolean, timeoutMs = 5_000) {
  const until = Date.now() + timeoutMs;
  let last = await read();
  while (!ok(last) && Date.now() < until) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    last = await read();
  }
  return last;
}

async function grantCredits(userId: string, amount: number) {
  const id = randomUUID();
  await CreditService.grant(userId, amount, {
    requestId: `grant:${id}`,
    source: "integration",
    sourceId: id,
  });
}

async function grantEntitlement(userId: string, startsAt = new Date()) {
  await prisma.entitlementGrant.create({
    // `createdAt` is the period anchor; `startsAt` is what the webhooks rewrite.
    data: {
      userId,
      key: "ai_credits",
      source: "MANUAL",
      sourceId: randomUUID(),
      startsAt,
      createdAt: startsAt,
    },
  });
}

async function wallet(userId: string) {
  return prisma.creditWallet.findUniqueOrThrow({
    where: { userId },
    select: { balance: true, reserved: true },
  });
}

async function reservationStatus(requestId: string) {
  // Request ids are unique per user, not globally, so this is a scan by request id on purpose.
  // The ledger stores a client id under the `ai:` prefix (V-228).
  const row = await prisma.creditReservation.findFirst({
    where: { requestId: `ai:${requestId}` },
    select: { status: true },
  });
  return row?.status ?? null;
}

function analyzeBody(overrides: Record<string, unknown> = {}) {
  return {
    resume: THIN_RESUME,
    requestId: `req-${randomUUID()}`,
    jobDescription: "We need a staff engineer who has run platform teams and shipped migrations.",
    fetchJobUrl: false,
    ...overrides,
  };
}

function analyze(user: TestUser, body: Record<string, unknown>) {
  return request(app)
    .post("/api/v1/ats/analyze")
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", user.cookie)
    .send(body);
}

const fetchMock = vi.fn();
const originalAiConfig = { ...config.ai };

beforeAll(() => {
  config.ai.apiKey = "integration-test-key";
  config.ai.baseUrl = "https://provider.invalid/v1";
  config.ai.atsAiPolicyJson = JSON.stringify(ATS_AI_POLICY);
  config.ai.atsEnginePolicyJson = JSON.stringify(DEFAULT_POLICY);
  vi.stubGlobal("fetch", fetchMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
  Object.assign(config.ai, originalAiConfig);
});

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("V-034 a client that disconnects before the provider answers is not charged", () => {
  it("releases the reservation and leaves the wallet untouched", async () => {
    const user = await createUserWithSession();
    await grantCredits(user.id, 50);
    const calls: PendingCall[] = [];
    fetchMock.mockImplementation(pendingProvider(calls));

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    const body = analyzeBody();

    try {
      const clientRequest = http.request({
        host: "127.0.0.1",
        port,
        method: "POST",
        path: "/api/v1/ats/analyze",
        headers: {
          "content-type": "application/json",
          origin: STUDIO_ORIGIN,
          cookie: user.cookie,
        },
      });
      clientRequest.on("error", () => undefined);
      clientRequest.end(JSON.stringify(body));

      // The provider call is in flight, so the credits are reserved and nothing has answered.
      await waitFor(
        async () => calls.length,
        (count) => count >= 1,
      );
      expect(await reservationStatus(body.requestId)).toBe("PENDING");
      expect(await wallet(user.id)).toEqual({ balance: 50 - ANALYSIS_CREDITS, reserved: 5 });

      clientRequest.destroy();

      const status = await waitFor(
        () => reservationStatus(body.requestId),
        (value) => value === "RELEASED",
      );
      expect(status).toBe("RELEASED");
      expect(await wallet(user.id)).toEqual({ balance: 50, reserved: 0 });
      // The abort reached the provider call: nothing waits on a dead client.
      expect(calls[0]!.init.signal?.aborted).toBe(true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

describe("V-035 a zero-credit account cannot make the server fetch a job page", () => {
  it("answers 402 before any outbound request and without spending a scan", async () => {
    const user = await createUserWithSession();
    const outbound = vi
      .spyOn(AtsJobFetchService, "fetch")
      .mockResolvedValue("A job description long enough to count as a posting for scoring.");

    const response = await analyze(
      user,
      analyzeBody({
        jobDescription: undefined,
        jobUrl: "https://jobs.example.invalid/role",
        fetchJobUrl: true,
      }),
    );

    expect(response.status).toBe(402);
    expect(outbound).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await AtsQuotaService.summary(user.id, "127.0.0.1")).used).toBe(0);
  });
});

describe("V-036 a repair whose analysis then fails is not charged", () => {
  it("releases the repair reservation when the analysis errors", async () => {
    const user = await createUserWithSession();
    await grantEntitlement(user.id);
    await grantCredits(user.id, 100);
    // Repair fills skills with a grounded value, then the analysis call fails outright.
    fetchMock
      .mockResolvedValueOnce(chatResponse({ skills: ["Postgres"] }))
      .mockResolvedValueOnce(providerError(500));
    const body = analyzeBody({ repairParse: true });

    const response = await analyze(user, body);

    expect(response.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await reservationStatus(`${body.requestId}:repair`)).toBe("RELEASED");
    expect(await reservationStatus(body.requestId)).toBe("RELEASED");
    expect(await wallet(user.id)).toEqual({ balance: 100, reserved: 0 });
  });

  it("commits the repair when the analysis succeeds", async () => {
    const user = await createUserWithSession();
    await grantEntitlement(user.id);
    await grantCredits(user.id, 100);
    fetchMock
      .mockResolvedValueOnce(chatResponse({ skills: ["Postgres"] }))
      .mockResolvedValueOnce(chatResponse(ANALYSIS_REPLY));
    const body = analyzeBody({ repairParse: true });

    const response = await analyze(user, body);

    expect(response.status).toBe(200);
    expect(response.body.data.repair).toMatchObject({ creditsSpent: REPAIR_CREDITS });
    expect(await reservationStatus(`${body.requestId}:repair`)).toBe("COMMITTED");
    expect(await reservationStatus(body.requestId)).toBe("COMMITTED");
    expect(await wallet(user.id)).toEqual({
      balance: 100 - REPAIR_CREDITS - ANALYSIS_CREDITS,
      reserved: 0,
    });
  });
});

describe("V-037 the paid scan period is anchored on the grant, not on today", () => {
  it("counts a MANUAL ai_credits grant's scans in one period across two days", async () => {
    const user = await createUserWithSession();
    await grantEntitlement(user.id, new Date("2026-10-10T00:00:00Z"));
    // The tier itself follows the balance (owner decision 1); the grant only anchors the period.
    await grantCredits(user.id, 100);
    const keysFor = () => getRedis().keys(`ats:quota:subscriber:${user.id}:*`);

    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-25T12:00:00Z") });
    const dayOne = await AtsQuotaService.consume(user.id, "127.0.0.1");
    expect(dayOne.tier).toBe("subscriber");
    expect(dayOne.used).toBe(1);

    vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
    const dayTwo = await AtsQuotaService.consume(user.id, "127.0.0.1");

    expect(dayTwo.used).toBe(2);
    expect(await keysFor()).toHaveLength(1);
    // The period closes on the grant's day of the month, not 30 days after each request.
    expect(dayTwo.resetsAt).toBe("2026-11-10T00:00:00.000Z");
  });
});

/**
 * V-398, owner decision 2: payers are never shown free. A subscriber or pass holder with an empty
 * wallet keeps the paid scan tier; an admin comp with an empty wallet does not.
 */
describe("V-398 the scan quota never calls a payer free", () => {
  async function grant(userId: string, source: "SUBSCRIPTION" | "SYSTEM" | "MANUAL", pass = false) {
    await prisma.entitlementGrant.create({
      data: {
        userId,
        key: "portfolio_publish",
        source,
        sourceId: randomUUID(),
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ...(pass ? { metadata: { pass: true } } : {}),
      },
    });
  }

  async function quotaTier(user: TestUser) {
    const quota = await request(app)
      .get("/api/v1/ats/quota")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);
    expect(quota.status).toBe(200);
    return quota.body.data as { tier: string; limit: number; canConvertResume: boolean };
  }

  it("keeps a subscriber with no credits on the paid tier", async () => {
    const user = await createUserWithSession();
    await grant(user.id, "SUBSCRIPTION");

    expect(await quotaTier(user)).toMatchObject({
      tier: "subscriber",
      limit: 300,
      canConvertResume: false,
    });
  });

  it("keeps a pass holder with no credits on the paid tier", async () => {
    const user = await createUserWithSession();
    await grant(user.id, "SYSTEM", true);

    expect(await quotaTier(user)).toMatchObject({ tier: "subscriber", limit: 300 });
  });

  // Owner decision 2026-10-28: dunning gives no paid features and reads free; a pause reads
  // `paused`, on the free limits.
  it.each([
    ["paused", "paused"],
    ["on_hold", "free"],
  ])(
    "a PAST_DUE subscription whose provider status is %s reads %s, on the free limits",
    async (rawStatus, tier) => {
      const user = await createUserWithSession();
      await prisma.subscription.create({
        data: {
          userId: user.id,
          provider: "dodo",
          providerSubId: `sub_${randomUUID()}`,
          productKey: "portfolio_pro",
          status: "PAST_DUE",
          rawStatus,
          interval: "MONTHLY",
          currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        },
      });

      expect(await quotaTier(user)).toMatchObject({ tier, limit: 2 });
    },
  );

  it("leaves an admin comp or a non-pass system grant with no credits on the free tier", async () => {
    const comp = await createUserWithSession();
    await grant(comp.id, "MANUAL");
    const system = await createUserWithSession();
    await grant(system.id, "SYSTEM");

    expect(await quotaTier(comp)).toMatchObject({ tier: "free", limit: 2 });
    expect(await quotaTier(system)).toMatchObject({ tier: "free", limit: 2 });
  });
});

describe("owner decision 1 (V-178, V-179): credits from any source pay for every ATS AI action", () => {
  it("a credit-pack buyer with no ai_credits grant gets repair, conversion and the paid tier", async () => {
    const user = await createUserWithSession();
    await grantCredits(user.id, 100);

    const quota = await request(app)
      .get("/api/v1/ats/quota")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);
    expect(quota.status).toBe(200);
    expect(quota.body.data).toMatchObject({
      tier: "subscriber",
      canConvertResume: true,
      canRepair: true,
    });

    fetchMock
      .mockResolvedValueOnce(chatResponse({ skills: ["Postgres"] }))
      .mockResolvedValueOnce(chatResponse(ANALYSIS_REPLY));
    const body = analyzeBody({ repairParse: true });
    const analysed = await analyze(user, body);
    expect(analysed.status).toBe(200);
    expect(analysed.body.data.repair).toMatchObject({ creditsSpent: REPAIR_CREDITS });
    expect(await reservationStatus(`${body.requestId}:repair`)).toBe("COMMITTED");

    fetchMock.mockResolvedValueOnce(
      chatResponse({
        basics: {
          fullName: "Jane Doe",
          role: "",
          headline: "",
          email: "",
          phone: "",
          location: "",
        },
        links: [],
        summary: "",
        experience: [],
        education: [],
        projects: [],
        skills: [],
      }),
    );
    const converted = await request(app)
      .post("/api/v1/ats/convert-resume")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie)
      .send({ resume: THIN_RESUME, requestId: `conv-${randomUUID()}` });
    expect(converted.status, JSON.stringify(converted.body)).toBe(200);
    expect(await wallet(user.id)).toEqual({
      balance: 100 - REPAIR_CREDITS - ANALYSIS_CREDITS - 25,
      reserved: 0,
    });
  });

  it("an unrouted analysis hands the repair back as well as the scan", async () => {
    const user = await createUserWithSession();
    await grantCredits(user.id, 100);
    // No model could be served inside its margin (the router's `routed: false`).
    vi.spyOn(AtsAiService, "analyze").mockResolvedValueOnce({
      ai: null,
      creditsSpent: 0,
      routed: false,
    });
    fetchMock.mockResolvedValueOnce(chatResponse({ skills: ["Postgres"] }));
    const body = analyzeBody({ repairParse: true });

    const response = await analyze(user, body);

    expect(response.status).toBe(200);
    expect(response.body.data.aiStatus).toBe("unavailable");
    expect(response.body.data.repair.creditsSpent).toBe(0);
    expect(response.body.data.quota.used).toBe(0);
    expect(await reservationStatus(`${body.requestId}:repair`)).toBe("RELEASED");
    expect(await wallet(user.id)).toEqual({ balance: 100, reserved: 0 });
  });
});

describe("V-201 resume conversion checks document capacity before charging", () => {
  const CONVERTED = {
    basics: { fullName: "Jane Doe", role: "", headline: "", email: "", phone: "", location: "" },
    links: [],
    summary: "",
    experience: [],
    education: [],
    projects: [],
    skills: [],
  };

  function convert(user: TestUser, requestId: string) {
    return request(app)
      .post("/api/v1/ats/convert-resume")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie)
      .send({ resume: THIN_RESUME, requestId });
  }

  async function seedResume(userId: string) {
    await prisma.document.create({
      data: { userId, title: "Resume", slug: `resume-${randomUUID().slice(0, 8)}`, content: {} },
    });
  }

  it("refuses a free account that already keeps its one resume: 402, no reservation, no charge", async () => {
    const user = await createUserWithSession();
    await grantCredits(user.id, 100);
    await seedResume(user.id);
    const requestId = `conv-${randomUUID()}`;

    const response = await convert(user, requestId);

    expect(response.status, JSON.stringify(response.body)).toBe(402);
    expect(response.body.message).toContain("Free accounts can keep 1 active resume");
    expect(response.body.details).toMatchObject({ code: "DOCUMENT_LIMIT", type: "RESUME" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await reservationStatus(requestId)).toBeNull();
    expect(await prisma.creditTransaction.count({ where: { userId: user.id } })).toBe(1);
    expect(await wallet(user.id)).toEqual({ balance: 100, reserved: 0 });
  });

  it("the documents route answers the same 402 code", async () => {
    const user = await createUserWithSession();
    await seedResume(user.id);

    const response = await request(app)
      .post("/api/v1/documents")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie)
      .send({ title: "Second resume", type: "RESUME" });

    expect(response.status, JSON.stringify(response.body)).toBe(402);
    expect(response.body.details).toMatchObject({ code: "DOCUMENT_LIMIT", type: "RESUME" });
  });

  it("converts for an account with paid access even when it already has a resume", async () => {
    const user = await createUserWithSession();
    await grantCredits(user.id, 100);
    await grantEntitlement(user.id);
    await seedResume(user.id);
    fetchMock.mockResolvedValueOnce(chatResponse(CONVERTED));

    const response = await convert(user, `conv-${randomUUID()}`);

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(await wallet(user.id)).toEqual({ balance: 75, reserved: 0 });
  });
});

describe("V-038 the AI limiter class and the per-user in-flight cap", () => {
  it("limits /api/v1/ats/analyze with the AI class, not the generic one", async () => {
    const previous = config.ai.rateLimitMaxRequests;
    config.ai.rateLimitMaxRequests = 2;
    // The cases above already spent this IP's buckets; the class is judged from a clean window.
    await getRedis().del([
      "rate-limit:POST:/api/v1/ats/analyze:127.0.0.1",
      "rate-limit:global:127.0.0.1",
    ]);
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 3; i += 1) {
        // An invalid body: the limiter answers before validation does, so the class shows
        // through regardless of what the handler would have said.
        const res = await request(app)
          .post("/api/v1/ats/analyze")
          .set("Origin", STUDIO_ORIGIN)
          .send({});
        statuses.push(res.status);
      }
      expect(statuses[2]).toBe(429);
      expect(statuses.slice(0, 2)).not.toContain(429);
    } finally {
      config.ai.rateLimitMaxRequests = previous;
    }
  });

  it("refuses a third concurrent AI call for one user with 429", async () => {
    const user = await createUserWithSession();
    await grantEntitlement(user.id);
    await grantCredits(user.id, 100);
    const calls: PendingCall[] = [];
    fetchMock.mockImplementation(pendingProvider(calls));

    // `.then` sends the request: a superagent request is lazy until it is awaited.
    const first = analyze(user, analyzeBody()).then((res) => res);
    const second = analyze(user, analyzeBody()).then((res) => res);
    let third: Promise<request.Response> | undefined;
    try {
      await waitFor(
        async () => calls.length,
        (count) => count >= 2,
      );

      third = analyze(user, analyzeBody()).then((res) => res);
      // Either the cap answers at once, or the third call reaches the provider: that is the bug.
      const outcome = await Promise.race([
        third.then((res) => ({ status: res.status, message: String(res.body.message) })),
        waitFor(
          async () => calls.length,
          (count) => count >= 3,
          3_000,
        ).then(() => ({
          status: "provider called",
          message: "",
        })),
      ]);

      expect(outcome.status).toBe(429);
      expect(outcome.message).toMatch(/in progress/i);
      expect(calls).toHaveLength(2);
    } finally {
      for (const call of calls) call.resolve(chatResponse(ANALYSIS_REPLY));
      const settled = await Promise.all([first, second]);
      expect(settled.map((res) => res.status)).toEqual([200, 200]);
      await third;
    }
  });
});

describe("V-034 a client that disconnects during the job fetch", () => {
  it("never reserves or commits anything once the page arrives", async () => {
    const user = await createUserWithSession();
    await grantCredits(user.id, 50);
    let releasePage: (text: string) => void = () => undefined;
    const pageRequested = new Promise<void>((resolve) => {
      vi.spyOn(AtsJobFetchService, "fetch").mockImplementation(
        () =>
          new Promise<string>((resolvePage) => {
            releasePage = resolvePage;
            resolve();
          }),
      );
    });
    fetchMock.mockResolvedValue(chatResponse(ANALYSIS_REPLY));

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    const body = analyzeBody({
      jobDescription: undefined,
      jobUrl: "https://jobs.example.invalid/role",
      fetchJobUrl: true,
    });

    try {
      const clientRequest = http.request({
        host: "127.0.0.1",
        port,
        method: "POST",
        path: "/api/v1/ats/analyze",
        headers: {
          "content-type": "application/json",
          origin: STUDIO_ORIGIN,
          cookie: user.cookie,
        },
      });
      clientRequest.on("error", () => undefined);
      clientRequest.end(JSON.stringify(body));

      await pageRequested;
      clientRequest.destroy();
      await new Promise((resolve) => setTimeout(resolve, 100));
      releasePage("A job description long enough to count as a posting for scoring.");

      // Whatever the server does next, it never charges: no provider call, no committed row.
      // V-362: wait until the handler has finished (its AI slot is released), not a fixed time.
      const slot = await waitFor(
        () => getRedis().get(`ai:in-flight:${user.id}`),
        (value) => !value || value === "0",
      );
      expect(slot === null || slot === "0").toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(await reservationStatus(body.requestId)).not.toBe("COMMITTED");
      expect(await wallet(user.id)).toEqual({ balance: 50, reserved: 0 });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
