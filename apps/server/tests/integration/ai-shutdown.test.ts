import { randomUUID } from "node:crypto";

import { DEFAULT_POLICY } from "@veriworkly/ats-engine";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "#lib/errors";
import { AI_ACTION_KEYS } from "#services/aiTypes";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * V-313 review: an AI request a deploy cuts off costs the user nothing and tells them to retry.
 * When the drain aborts in-flight AI work, every AI route answers 503 with `Retry-After`, the
 * credit reservation is released, and an ATS scan already counted is given back, also when the
 * abort lands during the job-page fetch (which would otherwise answer a misleading 400).
 */

const { completionCreate } = vi.hoisted(() => ({ completionCreate: vi.fn() }));
vi.mock("#services/aiClient", () => ({
  createAiClient: () => ({ chat: { completions: { create: completionCreate } } }),
}));

const { app } = await import("#app");
const { config } = await import("#config");
const { prisma } = await import("#lib/prisma");
const { CreditService } = await import("#services/creditService");
const { AtsJobFetchService } = await import("#services/ats/jobFetch");
const shutdown = await import("#lib/shutdown");

const MODE = { credits: 3, model: "generate-model", maxOutputTokens: 500 };
const AI_ACTIONS_POLICY = Object.fromEntries(
  AI_ACTION_KEYS.map((action) => [
    action,
    {
      maxTextChars: 4000,
      maxContextChars: 4000,
      maxJobDescriptionChars: 4000,
      systemPrompt: "system",
      userPromptTemplate: "{{text}} {{context}}",
      standard: MODE,
      expert: { ...MODE, credits: 6 },
    },
  ]),
);
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
};
const RESUME = [
  "Jane Doe",
  "jane@example.com",
  "Experience",
  "Staff Engineer, Example Corp, 2019 - Present",
  "Led the platform team and shipped the queue migration.",
  "Skills",
  "Postgres, TypeScript",
].join("\n");

function post(user: TestUser, path: string, body: Record<string, unknown>) {
  return request(app)
    .post(`/api/v1${path}`)
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", user.cookie)
    .send(body)
    .then((response) => response);
}

async function grantCredits(userId: string, amount: number) {
  const id = randomUUID();
  await CreditService.grant(userId, amount, {
    requestId: `grant:${id}`,
    source: "integration",
    sourceId: id,
  });
}

async function wallet(userId: string) {
  return prisma.creditWallet.findUniqueOrThrow({
    where: { userId },
    select: { balance: true, reserved: true },
  });
}

async function scansUsed(user: TestUser) {
  const quota = await request(app)
    .get("/api/v1/ats/quota")
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", user.cookie);
  return quota.body.data.used as number;
}

/** Resolves once `started` has been called, i.e. the request is inside the call being aborted. */
function started() {
  let mark!: () => void;
  const reached = new Promise<void>((resolve) => (mark = resolve));
  return { mark, reached };
}

function rejectOnAbort(signal: AbortSignal | undefined, error: unknown) {
  return new Promise<never>((_, reject) =>
    signal?.addEventListener("abort", () => reject(error), { once: true }),
  );
}

const fetchMock = vi.fn();
const originalAiConfig = { ...config.ai };

beforeAll(() => {
  config.ai.apiKey = "integration-test-key";
  config.ai.baseUrl = "https://provider.invalid/v1";
  config.ai.actionsPolicyJson = JSON.stringify(AI_ACTIONS_POLICY);
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
  completionCreate.mockReset();
});

afterEach(() => shutdown.resetShutdownSignalForTests());

describe("AI requests cut off by a restart (V-313 review)", () => {
  it("ATS analyze during the provider call: 503 with Retry-After, credits released, scan returned", async () => {
    const user = await createUserWithSession();
    await grantCredits(user.id, 50);
    const inCall = started();
    fetchMock.mockImplementation((_url: string, init: { signal?: AbortSignal }) => {
      inCall.mark();
      return rejectOnAbort(
        init.signal,
        new DOMException("The operation was aborted.", "AbortError"),
      );
    });

    const response = post(user, "/ats/analyze", {
      resume: RESUME,
      requestId: `req-${randomUUID()}`,
      jobDescription: "We need a staff engineer who has run platform teams and shipped migrations.",
      fetchJobUrl: false,
    });
    await inCall.reached;
    shutdown.abortInFlightWork();
    const answered = await response;

    expect(answered.status, JSON.stringify(answered.body)).toBe(503);
    expect(Number(answered.headers["retry-after"])).toBeGreaterThan(0);
    expect(await wallet(user.id)).toEqual({ balance: 50, reserved: 0 });
    expect(await scansUsed(user)).toBe(0);
  });

  it("ATS analyze during the job-page fetch: 503, not a 400 about the job page, and the scan returned", async () => {
    const user = await createUserWithSession();
    await grantCredits(user.id, 50);
    const inFetch = started();
    vi.spyOn(AtsJobFetchService, "fetch").mockImplementation((_url, signal) => {
      inFetch.mark();
      // What the real fetch throws when its signal fires.
      return rejectOnAbort(signal, new ApiError(400, "Job page request timed out."));
    });

    const response = post(user, "/ats/analyze", {
      resume: RESUME,
      requestId: `req-${randomUUID()}`,
      jobUrl: "https://jobs.example.invalid/role",
      fetchJobUrl: true,
    });
    await inFetch.reached;
    shutdown.abortInFlightWork();
    const answered = await response;

    expect(answered.status, JSON.stringify(answered.body)).toBe(503);
    expect(answered.body.message).not.toMatch(/job page/i);
    expect(Number(answered.headers["retry-after"])).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await wallet(user.id)).toEqual({ balance: 50, reserved: 0 });
    expect(await scansUsed(user)).toBe(0);
  });

  it("AI generate during the provider call: 503 with Retry-After and the reservation released", async () => {
    const user = await createUserWithSession();
    await grantCredits(user.id, 20);
    const inCall = started();
    completionCreate.mockImplementation((_params: unknown, options?: { signal?: AbortSignal }) => {
      inCall.mark();
      return rejectOnAbort(options?.signal, new DOMException("aborted", "AbortError"));
    });

    const response = post(user, "/ai/generate", {
      action: "rewrite_section",
      mode: "standard",
      input: { text: "Rewrite this line about queues." },
      requestId: `gen-${randomUUID()}`,
    });
    await inCall.reached;
    shutdown.abortInFlightWork();
    const answered = await response;

    expect(answered.status, JSON.stringify(answered.body)).toBe(503);
    expect(Number(answered.headers["retry-after"])).toBeGreaterThan(0);
    expect(await wallet(user.id)).toEqual({ balance: 20, reserved: 0 });
  });

  it("an AI request that arrives once the drain has started is answered 503 and charges nothing", async () => {
    const user = await createUserWithSession();
    await grantCredits(user.id, 20);
    shutdown.abortInFlightWork();

    const answered = await post(user, "/ai/generate", {
      action: "rewrite_section",
      mode: "standard",
      input: { text: "Rewrite this line about queues." },
      requestId: `gen-${randomUUID()}`,
    });

    expect(answered.status, JSON.stringify(answered.body)).toBe(503);
    // Any provider call is handed a signal that has already fired, so it never runs.
    for (const [, options] of completionCreate.mock.calls as Array<
      [unknown, { signal?: AbortSignal }]
    >)
      expect(options?.signal?.aborted).toBe(true);
    expect(await wallet(user.id)).toEqual({ balance: 20, reserved: 0 });
  });
});
