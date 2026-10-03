import { beforeEach, describe, expect, it, vi } from "vitest";

const { reserve, commitReservation, releaseReservation, requireEntitlement } = vi.hoisted(() => ({
  reserve: vi.fn(),
  commitReservation: vi.fn(),
  releaseReservation: vi.fn(),
  requireEntitlement: vi.fn(),
}));

vi.mock("#config", () => ({
  config: {
    ai: {
      apiKey: "test-key",
      baseUrl: "https://provider.invalid/v1",
      timeoutMs: 120000,
      siteUrl: "",
    },
  },
}));

vi.mock("#services/ats/aiPolicy", () => ({
  getAtsAiPolicy: vi.fn(() => ({
    prompts: {
      standardAnalysis: "s",
      onlineAnalysis: "o",
      resumeConversion: "r",
    },
    pricing: { creditRevenueUsd: 1, analysisBuckets: [5], onlineMultiplier: 2 },
    models: [],
    resumeConversion: {
      credits: 25,
      model: "conv",
      maxOutputTokens: 1000,
      temperature: 0.2,
      structuredOutputs: false,
    },
    parseRepair: {
      credits: 10,
      model: "repair-model",
      maxOutputTokens: 2000,
      temperature: 0,
      structuredOutputs: false,
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
  EntitlementService: { require: requireEntitlement },
}));

import { AtsRepairService } from "#services/ats/repair";
import type { AtsReport } from "#services/ats/types";
import { EMPTY_PARSED } from "./fixtures/ai-wire-inputs";
import { chatResponse, stubChatApi } from "./helpers/chatApi";

const SOURCE = "Jane Doe\nSenior Engineer, Acme Corporation\nJan 2020 - Present\n";

const report = { parsed: EMPTY_PARSED, wordCount: 400 } as AtsReport;

let api: ReturnType<typeof stubChatApi>;

function respondWith(payload: unknown) {
  api.fetch.mockResolvedValue(
    chatResponse(payload, { usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }),
  );
}

describe("AtsRepairService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api = stubChatApi();
    requireEntitlement.mockResolvedValue(undefined);
    reserve.mockResolvedValue(undefined);
    commitReservation.mockResolvedValue(undefined);
    releaseReservation.mockResolvedValue(undefined);
  });

  it("requires the paid entitlement before spending anything", async () => {
    requireEntitlement.mockRejectedValue(new Error("no plan"));

    await expect(AtsRepairService.repair("u1", "r1", SOURCE, report)).rejects.toThrow();
    expect(reserve).not.toHaveBeenCalled();
    expect(api.fetch).not.toHaveBeenCalled();
  });

  it("merges grounded values and commits the reservation", async () => {
    respondWith({
      name: "Jane Doe",
      roles: [
        {
          title: "Senior Engineer",
          employer: "Acme Corporation",
          start: { year: 2020, month: 1 },
          end: null,
          current: true,
        },
      ],
    });

    const result = await AtsRepairService.repair("u1", "r1", SOURCE, report);

    expect(result.repaired?.name).toBe("Jane Doe");
    expect(result.repaired?.roles[0]!.employer).toBe("Acme Corporation");
    expect(result.rejectedValues).toBe(0);
    expect(result.creditsSpent).toBe(10);
    expect(commitReservation).toHaveBeenCalledOnce();
  });

  it("drops hallucinated values but still commits, and reports the count", async () => {
    // The user got a real repair attempt against a real document; the fabricated row was
    // caught and removed. That is the feature working, so the call is still billed.
    respondWith({
      name: "Jane Doe",
      roles: [
        { title: "Senior Engineer", employer: "Initech", start: null, end: null, current: false },
      ],
    });

    const result = await AtsRepairService.repair("u1", "r1", SOURCE, report);

    expect(result.rejectedValues).toBe(1);
    expect(result.repaired?.roles[0]!.employer).toBe("");
    expect(commitReservation).toHaveBeenCalledOnce();
  });

  it("releases the reservation when the provider fails", async () => {
    api.fetch.mockRejectedValue(new TypeError("fetch failed"));

    await expect(AtsRepairService.repair("u1", "r1", SOURCE, report)).rejects.toThrow();
    expect(releaseReservation).toHaveBeenCalledWith("u1", "r1");
    expect(commitReservation).not.toHaveBeenCalled();
  });

  it("releases the reservation when the response is not valid JSON", async () => {
    api.fetch.mockResolvedValue(chatResponse("not json"));

    await expect(AtsRepairService.repair("u1", "r1", SOURCE, report)).rejects.toThrow();
    expect(releaseReservation).toHaveBeenCalledWith("u1", "r1");
  });

  it("sends the resume as data and never as instructions", async () => {
    respondWith({ name: "Jane Doe" });
    await AtsRepairService.repair("u1", "r1", SOURCE, report);

    const sent = api.body();
    expect(sent.messages[0].role).toBe("system");
    expect(sent.messages[1].role).toBe("user");
    // The document travels inside a JSON envelope, so prose in the resume cannot be read as
    // a new instruction to the model.
    expect(() => JSON.parse(sent.messages[1].content)).not.toThrow();
    expect(sent.temperature).toBe(0);
  });

  it("uses the package's repair prompt when the private policy does not override it", async () => {
    const { DEFAULT_REPAIR_PROMPT } = await import("@veriworkly/ats-engine/ai");
    respondWith({ name: "Jane Doe" });
    await AtsRepairService.repair("u1", "r1", SOURCE, report);

    expect(api.body().messages[0].content).toBe(DEFAULT_REPAIR_PROMPT);
  });
});
