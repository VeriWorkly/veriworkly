import { beforeEach, describe, expect, it, vi } from "vitest";

const completionCreate = vi.fn();
const reserve = vi.fn();
const commitReservation = vi.fn();
const releaseReservation = vi.fn();
const requireEntitlement = vi.fn();

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

vi.mock("#services/atsAiPolicy", () => ({
  getAtsAiPolicy: vi.fn(() => ({
    prompts: {
      standardAnalysis: "standard-analysis-prompt",
      onlineAnalysis: "online-analysis-prompt",
      resumeConversion: "resume-conversion-prompt",
    },
    pricing: {
      creditRevenueUsd: 1,
      analysisBuckets: [5, 25],
      onlineMultiplier: 2,
    },
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
    resumeConversion: {
      credits: 25,
      model: "conversion-model",
      maxOutputTokens: 4000,
      temperature: 0.1,
    },
  })),
}));

vi.mock("#services/creditService", () => ({
  CreditService: { reserve, commitReservation, releaseReservation },
}));

vi.mock("#services/entitlementService", () => ({
  EntitlementService: { require: requireEntitlement },
}));

const report = {
  version: "ats-v1" as const,
  readinessScore: 75,
  jobMatchScore: 70,
  parsingWarnings: [],
  strengths: ["Clear structure"],
  failedChecks: [],
  prioritizedFixes: [],
  rules: [],
};

describe("ATS AI service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reserve.mockResolvedValue({ cost: 5 });
    commitReservation.mockResolvedValue({ balanceAfter: 20 });
    releaseReservation.mockResolvedValue(true);
    requireEntitlement.mockResolvedValue(undefined);
  });

  it("uses the job-page-specific private prompt for online analysis", async () => {
    completionCreate.mockResolvedValue({
      id: "analysis_1",
      choices: [
        {
          message: {
            content: JSON.stringify({
              explanation: "Targeted review",
              missingEvidence: [],
              keywordOpportunities: [],
              recommendedImprovements: [],
              priorityOrder: [],
            }),
          },
        },
      ],
    });
    const { AtsAiService } = await import("../../src/services/atsAiService");

    await AtsAiService.analyze("user_1", "request_online", "Resume text", "Job text", report, true);

    expect(completionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: "system", content: "online-analysis-prompt" },
          expect.objectContaining({ role: "user" }),
        ],
      }),
    );
    expect(reserve).toHaveBeenCalledWith("user_1", 10, "ats_analysis", "request_online");
  });

  it("requires Pro access and returns validated structured resume data", async () => {
    completionCreate.mockResolvedValue({
      id: "conversion_1",
      choices: [
        {
          message: {
            content: JSON.stringify({
              basics: {
                fullName: "Avery Shah",
                role: "Product Engineer",
                headline: "",
                email: "avery@example.com",
                phone: "",
                location: "Remote",
              },
              links: [],
              summary: "Builds reliable products.",
              experience: [],
              education: [],
              projects: [],
              skills: [{ name: "Engineering", keywords: ["TypeScript"] }],
            }),
          },
        },
      ],
    });
    const { AtsAiService } = await import("../../src/services/atsAiService");

    const result = await AtsAiService.convertResume("user_1", "request_convert", "Old resume");

    expect(requireEntitlement).toHaveBeenCalledWith(
      "user_1",
      "ai_credits",
      expect.stringContaining("active AI Credits"),
    );
    expect(reserve).toHaveBeenCalledWith("user_1", 25, "ats_resume_conversion", "request_convert");
    expect(result.resume.basics.fullName).toBe("Avery Shah");
    expect(result.creditsSpent).toBe(25);
  });

  it("resiliently parses LLM conversion outputs containing nulls or missing fields", async () => {
    completionCreate.mockResolvedValue({
      id: "conversion_resilient",
      choices: [
        {
          message: {
            content: JSON.stringify({
              basics: {
                fullName: "Jane Doe",
                role: null,
                headline: undefined,
                email: "jane@example.com",
                phone: null,
                location: null,
              },
              links: null,
              summary: null,
              experience: [
                {
                  company: "Corp",
                  role: null,
                  location: undefined,
                  startDate: "2020",
                  endDate: null,
                  current: null,
                  summary: null,
                  highlights: [null, "achieved sales target", undefined],
                },
              ],
              education: null,
              projects: undefined,
              skills: null,
            }),
          },
        },
      ],
    });
    const { AtsAiService } = await import("../../src/services/atsAiService");

    const result = await AtsAiService.convertResume("user_1", "request_resilient", "Old resume");

    expect(result.resume.basics.fullName).toBe("Jane Doe");
    expect(result.resume.basics.role).toBe("");
    expect(result.resume.basics.headline).toBe("");
    expect(result.resume.basics.phone).toBe("");
    expect(result.resume.basics.location).toBe("");
    expect(result.resume.links).toEqual([]);
    expect(result.resume.summary).toBe("");
    expect(result.resume.experience[0].role).toBe("");
    expect(result.resume.experience[0].location).toBe("");
    expect(result.resume.experience[0].endDate).toBe("");
    expect(result.resume.experience[0].current).toBe(false);
    expect(result.resume.experience[0].highlights).toEqual(["", "achieved sales target", ""]);
    expect(result.resume.education).toEqual([]);
    expect(result.resume.projects).toEqual([]);
    expect(result.resume.skills).toEqual([]);
  });

  it("releases conversion credits when provider output is invalid", async () => {
    completionCreate.mockResolvedValue({
      id: "conversion_2",
      choices: [{ message: { content: "{" } }],
    });
    const { AtsAiService } = await import("../../src/services/atsAiService");

    await expect(
      AtsAiService.convertResume("user_1", "request_invalid", "Old resume"),
    ).rejects.toThrow("could not be completed");
    expect(releaseReservation).toHaveBeenCalledWith("user_1", "request_invalid");
  });
});
