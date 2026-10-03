import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AtsReport } from "#services/ats/types";
import { EMPTY_PARSED } from "./fixtures/ai-wire-inputs";
import { chatResponse, httpError, stubChatApi } from "./helpers/chatApi";

const reserve = vi.fn();
const commitReservation = vi.fn();
const releaseReservation = vi.fn();

vi.mock("#config", () => ({
  config: {
    ai: {
      apiKey: "test-key",
      baseUrl: "https://provider.invalid/v1",
      timeoutMs: 1000,
      siteUrl: "",
    },
  },
}));

/**
 * Priced so the expensive model cannot be served at any bucket, which is the shape the shipped
 * policy actually had: "expert" was entered on document size alone and then priced itself out,
 * so the request returned no analysis at all after spending the caller's scan.
 */
vi.mock("#services/ats/aiPolicy", () => ({
  getAtsAiPolicy: vi.fn(() => ({
    prompts: {
      standardAnalysis: "standard-prompt",
      onlineAnalysis: "online-prompt",
      resumeConversion: "conversion-prompt",
    },
    pricing: { creditRevenueUsd: 0.005, analysisBuckets: [5, 25], onlineMultiplier: 2 },
    models: [
      {
        model: "cheap-model",
        tiers: ["standard", "detailed", "advanced"],
        inputUsdPerMillion: 0.5,
        outputUsdPerMillion: 2,
        maxOutputTokens: 1800,
        retries: 1,
        feeMultiplier: 1.1,
        temperature: 0.35,
      },
      {
        model: "expensive-model",
        tiers: ["expert"],
        inputUsdPerMillion: 30,
        outputUsdPerMillion: 100,
        maxOutputTokens: 8000,
        retries: 0,
        feeMultiplier: 1.1,
        temperature: 0.1,
      },
    ],
    resumeConversion: {
      credits: 25,
      model: "conversion-model",
      maxOutputTokens: 4000,
      temperature: 0.1,
    },
  })),
}));

vi.mock("#services/ats/enginePolicy", async () => {
  const { DEFAULT_POLICY } = await import("@veriworkly/ats-engine");
  return { getAtsEnginePolicy: () => DEFAULT_POLICY };
});

vi.mock("#services/creditService", () => ({
  CreditService: { reserve, commitReservation, releaseReservation },
}));

vi.mock("#services/entitlementService", () => ({
  EntitlementService: { require: vi.fn() },
}));

function report(readinessScore: number): AtsReport {
  return {
    version: "ats-v2",
    readinessScore,
    jobMatchScore: null,
    matchedKeywords: [],
    missingKeywords: [],
    parsingWarnings: [],
    strengths: [],
    failedChecks: [],
    prioritizedFixes: [],
    rules: [],
    categories: [],
    checksPassed: 0,
    checksTotal: 0,
    wordCount: 400,
    parsed: EMPTY_PARSED,
  };
}

const insights = JSON.stringify({
  explanation: "ok",
  missingEvidence: [],
  keywordOpportunities: [],
  recommendedImprovements: [],
  priorityOrder: [],
});

let api: ReturnType<typeof stubChatApi>;
const model = (index = 0) => api.body(index).model;

describe("ATS AI routing", () => {
  beforeEach(() => {
    api = stubChatApi();
    vi.clearAllMocks();
    reserve.mockResolvedValue({ cost: 5 });
    commitReservation.mockResolvedValue({ balanceAfter: 10 });
    releaseReservation.mockResolvedValue(true);
    api.fetch.mockResolvedValue(chatResponse(insights, { id: "completion_1" }));
  });

  it("falls back to a cheaper tier rather than returning no analysis at all", async () => {
    const { AtsAiService } = await import("#services/ats/ai");

    // Large enough to be graded "expert", where only the model that cannot be afforded lives.
    const result = await AtsAiService.analyze(
      "user_1",
      "request_big",
      "x".repeat(45_000),
      undefined,
      report(90),
      false,
    );

    expect(result.routed).toBe(true);
    expect(result.ai).not.toBeNull();
    expect(model()).toBe("cheap-model");
  });

  it("reads temperature from policy instead of a hardcoded call-site value", async () => {
    const { AtsAiService } = await import("#services/ats/ai");
    await AtsAiService.analyze(
      "user_1",
      "request_temp",
      "short resume",
      undefined,
      report(90),
      false,
    );

    expect(api.body().temperature).toBe(0.35);
  });

  it("escalates on the share of points lost, not on a count of error rules", async () => {
    const { AtsAiService } = await import("#services/ats/ai");

    // A badly failing short resume should still be graded above the floor tier. The old
    // thresholds counted error-severity failures against a rule set holding five of them, so
    // the top tier was unreachable and the middle one needed every error rule to fail at once.
    await AtsAiService.analyze("user_1", "request_bad", "short", undefined, report(20), false);

    const metadata = commitReservation.mock.calls[0][2].metadata;
    expect(metadata.complexity).toBe("expert");
    // Graded expert, served by the affordable model — both are recorded.
    expect(metadata.servedTier).toBe("advanced");
  });

  /**
   * Routing budgets `retries + 1` calls when it prices a model against its credit bucket, but
   * nothing ever made a second attempt — one malformed body threw away a request that had
   * already reserved margin for exactly this.
   */
  it("retries a malformed response, on one reservation, and keeps the result", async () => {
    api.fetch
      .mockResolvedValueOnce(chatResponse("{ truncated", { id: "c1" }))
      .mockResolvedValueOnce(chatResponse(insights, { id: "c2" }));

    const { AtsAiService } = await import("#services/ats/ai");
    const result = await AtsAiService.analyze(
      "user_1",
      "request_retry",
      "short resume",
      undefined,
      report(90),
      false,
    );

    expect(api.fetch).toHaveBeenCalledTimes(2);
    expect(result.ai).not.toBeNull();
    // One reservation covers every attempt: the caller pays for the analysis, not for how many
    // tries it took to get valid JSON back.
    expect(reserve).toHaveBeenCalledTimes(1);
    expect(commitReservation).toHaveBeenCalledTimes(1);
    expect(releaseReservation).not.toHaveBeenCalled();
  });

  it("retries an empty completion", async () => {
    api.fetch
      .mockResolvedValueOnce(chatResponse("", { id: "c1" }))
      .mockResolvedValueOnce(chatResponse(insights, { id: "c2" }));

    const { AtsAiService } = await import("#services/ats/ai");
    await AtsAiService.analyze("user_1", "req", "resume", undefined, report(90), false);

    expect(api.fetch).toHaveBeenCalledTimes(2);
  });

  it("gives up once the retry budget is spent, and releases the reservation", async () => {
    api.fetch.mockResolvedValue(chatResponse("{", { id: "c" }));

    const { AtsAiService } = await import("#services/ats/ai");
    await expect(
      AtsAiService.analyze("user_1", "req", "resume", undefined, report(90), false),
    ).rejects.toThrow(/could not be completed/);

    // retries: 1 on the model this request routes to, so two attempts and no more.
    expect(api.fetch).toHaveBeenCalledTimes(2);
    expect(releaseReservation).toHaveBeenCalledWith("user_1", "req");
  });

  it("does not retry a request the provider rejected on its merits", async () => {
    api.fetch.mockResolvedValue(httpError(400, "bad request"));

    const { AtsAiService } = await import("#services/ats/ai");
    await expect(
      AtsAiService.analyze("user_1", "req", "resume", undefined, report(90), false),
    ).rejects.toThrow();

    // A 4xx means the same request will be refused again; sending it twice spends the budget
    // for the same answer. A 429 is the exception and is retried.
    expect(api.fetch).toHaveBeenCalledTimes(1);
  });

  it("retries a rate-limited request", async () => {
    api.fetch
      .mockResolvedValueOnce(httpError(429, "slow down"))
      .mockResolvedValueOnce(chatResponse(insights));

    const { AtsAiService } = await import("#services/ats/ai");
    const result = await AtsAiService.analyze(
      "user_1",
      "req",
      "resume",
      undefined,
      report(90),
      false,
    );

    expect(api.fetch).toHaveBeenCalledTimes(2);
    expect(result.ai).not.toBeNull();
    expect(commitReservation.mock.calls[0]![2].metadata).toMatchObject({ attempts: 2 });
  });

  it("reports the failure instead of a silent success when nothing can be routed", async () => {
    const policy = await import("#services/ats/aiPolicy");
    vi.mocked(policy.getAtsAiPolicy).mockReturnValueOnce({
      prompts: { standardAnalysis: "s", onlineAnalysis: "o", resumeConversion: "c" },
      pricing: { creditRevenueUsd: 0.005, analysisBuckets: [5], onlineMultiplier: 2 },
      models: [],
      resumeConversion: { credits: 25, model: "m", maxOutputTokens: 100, temperature: 0.1 },
    } as unknown as ReturnType<typeof policy.getAtsAiPolicy>);

    const { AtsAiService } = await import("#services/ats/ai");
    const result = await AtsAiService.analyze(
      "user_1",
      "req",
      "resume",
      undefined,
      report(90),
      false,
    );

    expect(result).toEqual({ ai: null, creditsSpent: 0, routed: false });
    expect(reserve).not.toHaveBeenCalled();
  });
});
