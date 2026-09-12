import { beforeEach, describe, expect, it, vi } from "vitest";

const { completionCreate, reserve, commitReservation, releaseReservation, requireEntitlement } =
  vi.hoisted(() => ({
    completionCreate: vi.fn(),
    reserve: vi.fn(),
    commitReservation: vi.fn(),
    releaseReservation: vi.fn(),
    requireEntitlement: vi.fn(),
  }));

vi.mock("openai", () => ({
  default: class OpenAI {
    chat = { completions: { create: completionCreate } };
  },
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

vi.mock("#services/creditService", () => ({
  CreditService: { reserve, commitReservation, releaseReservation },
}));

vi.mock("#services/entitlementService", () => ({
  EntitlementService: { require: requireEntitlement },
}));

import { AtsRepairService } from "#services/ats/repair";
import type { AtsParsedResume, AtsReport } from "#services/ats/types";

const SOURCE = "Jane Doe\nSenior Engineer, Acme Corporation\nJan 2020 - Present\n";

const emptyParsed: AtsParsedResume = {
  name: "",
  email: "",
  phone: "",
  links: [],
  roles: [],
  education: [],
  skills: [],
  monthsOfExperience: null,
  highestDegree: null,
};

const report = { parsed: emptyParsed, wordCount: 400 } as AtsReport;

function respondWith(payload: unknown) {
  completionCreate.mockResolvedValue({
    id: "cmpl-1",
    choices: [{ message: { content: JSON.stringify(payload) } }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  });
}

describe("AtsRepairService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireEntitlement.mockResolvedValue(undefined);
    reserve.mockResolvedValue(undefined);
    commitReservation.mockResolvedValue(undefined);
    releaseReservation.mockResolvedValue(undefined);
  });

  it("requires the paid entitlement before spending anything", async () => {
    requireEntitlement.mockRejectedValue(new Error("no plan"));

    await expect(AtsRepairService.repair("u1", "r1", SOURCE, report)).rejects.toThrow();
    expect(reserve).not.toHaveBeenCalled();
    expect(completionCreate).not.toHaveBeenCalled();
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
    completionCreate.mockRejectedValue(new Error("provider down"));

    await expect(AtsRepairService.repair("u1", "r1", SOURCE, report)).rejects.toThrow();
    expect(releaseReservation).toHaveBeenCalledWith("u1", "r1");
    expect(commitReservation).not.toHaveBeenCalled();
  });

  it("releases the reservation when the response is not valid JSON", async () => {
    completionCreate.mockResolvedValue({
      id: "cmpl-1",
      choices: [{ message: { content: "not json" } }],
    });

    await expect(AtsRepairService.repair("u1", "r1", SOURCE, report)).rejects.toThrow();
    expect(releaseReservation).toHaveBeenCalledWith("u1", "r1");
  });

  it("sends the resume as data and never as instructions", async () => {
    respondWith({ name: "Jane Doe" });
    await AtsRepairService.repair("u1", "r1", SOURCE, report);

    const sent = completionCreate.mock.calls[0]![0];
    expect(sent.messages[0].role).toBe("system");
    expect(sent.messages[1].role).toBe("user");
    // The document travels inside a JSON envelope, so prose in the resume cannot be read as
    // a new instruction to the model.
    expect(() => JSON.parse(sent.messages[1].content)).not.toThrow();
    expect(sent.temperature).toBe(0);
  });
});
