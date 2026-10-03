import { beforeEach, describe, expect, it, vi } from "vitest";

import recorded from "./fixtures/ai-wire-bodies.json" with { type: "json" };
import { WIRE_INPUTS } from "./fixtures/ai-wire-inputs";
import { chatResponse, stubChatApi } from "./helpers/chatApi";

/**
 * Wire compatibility with the call sites as they were before `@veriworkly/ats-engine/ai`.
 *
 * `ai-wire-bodies.json` was recorded from the OpenAI-SDK implementation, with this file's
 * policy and `WIRE_INPUTS`. Each call site must still send exactly that body: same model, same
 * prompts, same user envelope, same response format and gateway routing. A difference here is a
 * change to what production asks the model for, and has to be deliberate.
 */

vi.mock("#config", () => ({
  config: {
    nodeEnv: "test",
    ai: {
      apiKey: "test-key",
      baseUrl: "https://gateway.invalid/api/v1",
      timeoutMs: 90000,
      siteUrl: "https://veriworkly.invalid",
    },
  },
}));

vi.mock("#services/ats/aiPolicy", () => ({
  getAtsAiPolicy: () => ({
    prompts: {
      standardAnalysis: "standard-prompt",
      onlineAnalysis: "online-prompt",
      resumeConversion: "conversion-prompt",
    },
    pricing: { creditRevenueUsd: 1, analysisBuckets: [5, 25], onlineMultiplier: 2 },
    models: [
      {
        model: "analysis-model",
        tiers: ["standard", "detailed", "advanced", "expert"],
        inputUsdPerMillion: 0,
        outputUsdPerMillion: 0,
        maxOutputTokens: 1200,
        retries: 0,
        feeMultiplier: 1,
        temperature: 0.3,
        structuredOutputs: true,
        providerOptions: { provider: { order: ["openai"] } },
      },
    ],
    resumeConversion: {
      credits: 25,
      model: "conversion-model",
      maxOutputTokens: 4000,
      temperature: 0.1,
      retries: 0,
      structuredOutputs: true,
    },
    parseRepair: {
      credits: 10,
      model: "repair-model",
      maxOutputTokens: 2000,
      temperature: 0,
      retries: 0,
      structuredOutputs: false,
      providerOptions: { transforms: ["middle-out"] },
    },
  }),
}));

vi.mock("#services/ats/enginePolicy", async () => {
  const { DEFAULT_POLICY } = await import("@veriworkly/ats-engine");
  return { getAtsEnginePolicy: () => DEFAULT_POLICY };
});
vi.mock("#services/creditService", () => ({
  CreditService: { reserve: vi.fn(), commitReservation: vi.fn(), releaseReservation: vi.fn() },
}));
vi.mock("#services/entitlementService", () => ({
  EntitlementService: { require: vi.fn(), has: vi.fn(async () => true) },
}));
vi.mock("#lib/prisma", () => ({ prisma: {} }));

import { AtsAiService } from "#services/ats/ai";
import { AtsRepairService } from "#services/ats/repair";
import { ProfileImportService } from "#services/profileImportService";

const insights = {
  explanation: "",
  missingEvidence: [],
  keywordOpportunities: [],
  recommendedImprovements: [],
  priorityOrder: [],
};
const converted = { basics: {}, experience: [] };
const { resumeText, jobDescription, report } = WIRE_INPUTS;

let api: ReturnType<typeof stubChatApi>;

describe("ATS AI wire format", () => {
  beforeEach(() => {
    api = stubChatApi();
  });

  it("sends standard analysis exactly as before", async () => {
    api.fetch.mockResolvedValue(chatResponse(insights));
    await AtsAiService.analyze("u", "r1", resumeText, jobDescription, report, false);
    expect(api.body()).toEqual(recorded.bodies.analyzeStandard);
  });

  it("sends online analysis exactly as before", async () => {
    api.fetch.mockResolvedValue(chatResponse(insights));
    await AtsAiService.analyze("u", "r2", resumeText, jobDescription, report, true);
    expect(api.body()).toEqual(recorded.bodies.analyzeOnline);
  });

  it("sends resume conversion exactly as before", async () => {
    api.fetch.mockResolvedValue(chatResponse(converted));
    await AtsAiService.convertResume("u", "r3", resumeText);
    expect(api.body()).toEqual(recorded.bodies.convertResume);
  });

  it("sends parse repair exactly as before", async () => {
    api.fetch.mockResolvedValue(chatResponse({ name: null }));
    await AtsRepairService.repair("u", "r4", resumeText, report);
    expect(api.body()).toEqual(recorded.bodies.repairParse);
  });

  /**
   * The one intended difference. The LinkedIn import and the ATS conversion are now the same
   * task, so the import gains the conversion's untrusted-data instruction (and an explicit
   * `stream: false`, which was already the default). Everything else is unchanged.
   */
  it("sends the profile import as the conversion task", async () => {
    api.fetch.mockResolvedValue(chatResponse(converted));
    await (
      ProfileImportService as unknown as { parseTextToResumeSchema(t: string): Promise<unknown> }
    )
      .parseTextToResumeSchema(resumeText)
      .catch(() => undefined);

    const before = recorded.bodies.profileImport;
    const conversion = recorded.bodies.convertResume;
    expect(api.body()).toEqual({ ...before, messages: conversion.messages, stream: false });
    expect(JSON.parse(before.messages[1]!.content).resume).toBe(
      JSON.parse(conversion.messages[1]!.content).resume,
    );
  });

  it("posts to the configured gateway with the same credentials and referer", async () => {
    api.fetch.mockResolvedValue(chatResponse(insights));
    await AtsAiService.analyze("u", "r5", resumeText, jobDescription, report, false);

    const [url, init] = api.fetch.mock.calls[0]!;
    expect(url).toBe(`${recorded.client.baseURL}/chat/completions`);
    expect(init.headers).toMatchObject({
      authorization: `Bearer ${recorded.client.apiKey}`,
      ...recorded.client.defaultHeaders,
    });
  });
});
