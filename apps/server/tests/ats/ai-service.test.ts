import { beforeEach, describe, expect, it, vi } from "vitest";

import { chatResponse, stubChatApi } from "./helpers/chatApi";
import { EMPTY_PARSED } from "./fixtures/ai-wire-inputs";

const reserve = vi.fn();
const commitReservation = vi.fn();
const releaseReservation = vi.fn();
const requireEntitlement = vi.fn();

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
        temperature: 0.2,
        structuredOutputs: false,
      },
    ],
    resumeConversion: {
      credits: 25,
      model: "conversion-model",
      maxOutputTokens: 4000,
      temperature: 0.1,
      retries: 0,
      structuredOutputs: false,
    },
  })),
}));

const getAtsEnginePolicy = vi.hoisted(() => vi.fn());
vi.mock("#services/ats/enginePolicy", () => ({ getAtsEnginePolicy }));

vi.mock("#services/creditService", () => ({
  CreditService: { reserve, commitReservation, releaseReservation },
}));

vi.mock("#services/entitlementService", () => ({
  EntitlementService: { require: requireEntitlement },
}));

const report = {
  version: "ats-v2" as const,
  readinessScore: 75,
  jobMatchScore: 70,
  matchedKeywords: ["typescript"],
  missingKeywords: ["kubernetes"],
  parsingWarnings: [],
  strengths: ["Clear structure"],
  failedChecks: [],
  prioritizedFixes: [],
  rules: [],
  categories: [],
  checksPassed: 0,
  checksTotal: 0,
  wordCount: 300,
  parsed: { ...EMPTY_PARSED, name: "Avery Shah", email: "avery@example.com" },
};

const insights = {
  explanation: "Targeted review",
  missingEvidence: [],
  keywordOpportunities: [],
  recommendedImprovements: [],
  priorityOrder: [],
};

let api: ReturnType<typeof stubChatApi>;

describe("ATS AI service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api = stubChatApi();
    reserve.mockResolvedValue({ cost: 5 });
    commitReservation.mockResolvedValue({ balanceAfter: 20 });
    releaseReservation.mockResolvedValue(true);
    requireEntitlement.mockResolvedValue(undefined);
  });

  it("uses the job-page-specific private prompt for online analysis", async () => {
    api.fetch.mockResolvedValue(chatResponse(insights, { id: "analysis_1" }));
    const { AtsAiService } = await import("../../src/services/ats/ai");

    await AtsAiService.analyze("user_1", "request_online", "Resume text", "Job text", report, true);

    expect(api.body().messages[0]).toEqual({ role: "system", content: "online-analysis-prompt" });
    expect(api.body().messages[1].role).toBe("user");
    expect(reserve).toHaveBeenCalledWith("user_1", 10, "ats_analysis", "request_online");
  });

  it("withholds the candidate's contact details from the analysis model", async () => {
    api.fetch.mockResolvedValue(chatResponse(insights));
    const { AtsAiService } = await import("../../src/services/ats/ai");

    await AtsAiService.analyze(
      "user_1",
      "request_redact",
      "Avery Shah\navery@example.com\nEngineer",
      undefined,
      report,
      false,
    );

    const sent = api.body().messages[1].content as string;
    expect(sent).not.toContain("Avery Shah");
    expect(sent).not.toContain("avery@example.com");
    expect(sent).toContain("[NAME]");
  });

  it("drops keyword suggestions that point at nothing in the posting, and records it", async () => {
    api.fetch.mockResolvedValue(
      chatResponse({ ...insights, keywordOpportunities: ["Kubernetes", "Blockchain"] }),
    );
    const { AtsAiService } = await import("../../src/services/ats/ai");

    const result = await AtsAiService.analyze(
      "user_1",
      "request_keywords",
      "Resume text",
      "Kubernetes and TypeScript",
      report,
      false,
    );

    expect(result.ai?.keywordOpportunities).toEqual(["Kubernetes"]);
    expect(commitReservation.mock.calls[0]![2].metadata).toMatchObject({ rejectedValues: 1 });
  });

  it("records token usage and the response id on the ledger entry", async () => {
    api.fetch.mockResolvedValue(
      chatResponse(insights, {
        id: "analysis_7",
        usage: { prompt_tokens: 50, completion_tokens: 9 },
      }),
    );
    const { AtsAiService } = await import("../../src/services/ats/ai");

    await AtsAiService.analyze("user_1", "request_usage", "Resume", undefined, report, false);

    const [, , context] = commitReservation.mock.calls[0]!;
    expect(context.referenceId).toBe("analysis_7");
    expect(context.metadata).toMatchObject({
      promptTokens: 50,
      completionTokens: 9,
      totalTokens: 59,
      attempts: 1,
      promptVersion: expect.stringMatching(/^custom:/),
    });
    expect(context.metadata).not.toHaveProperty("model");
  });

  it("requires Pro access and returns validated structured resume data", async () => {
    api.fetch.mockResolvedValue(
      chatResponse(
        {
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
        },
        { id: "conversion_1" },
      ),
    );
    const { AtsAiService } = await import("../../src/services/ats/ai");

    const result = await AtsAiService.convertResume(
      "user_1",
      "request_convert",
      "Avery Shah, Product Engineer. avery@example.com",
    );

    expect(requireEntitlement).toHaveBeenCalledWith(
      "user_1",
      "ai_credits",
      expect.stringContaining("active AI Credits"),
    );
    expect(reserve).toHaveBeenCalledWith("user_1", 25, "ats_resume_conversion", "request_convert");
    expect(result.resume.basics.fullName).toBe("Avery Shah");
    expect(result.creditsSpent).toBe(25);
    expect(api.body().messages[0]).toEqual({
      role: "system",
      content: "resume-conversion-prompt",
    });
  });

  it("blanks an employer the conversion model invented", async () => {
    api.fetch.mockResolvedValue(
      chatResponse({
        basics: { fullName: "Jane Doe" },
        experience: [{ company: "Initech", role: "Engineer" }],
      }),
    );
    const { AtsAiService } = await import("../../src/services/ats/ai");

    const result = await AtsAiService.convertResume(
      "user_1",
      "request_ground",
      "Jane Doe, Engineer",
    );

    expect(result.resume.experience[0]).toMatchObject({ company: "", role: "Engineer" });
  });

  it("resiliently parses LLM conversion outputs containing nulls or missing fields", async () => {
    api.fetch.mockResolvedValue(
      chatResponse({
        basics: {
          fullName: "Jane Doe",
          role: null,
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
            startDate: "2020",
            endDate: null,
            current: null,
            summary: null,
            highlights: [null, "achieved sales target"],
          },
        ],
        education: null,
        skills: null,
      }),
    );
    const { AtsAiService } = await import("../../src/services/ats/ai");

    const result = await AtsAiService.convertResume(
      "user_1",
      "request_resilient",
      "Jane Doe jane@example.com Corp 2020",
    );

    expect(result.resume.basics.fullName).toBe("Jane Doe");
    expect(result.resume.basics.role).toBe("");
    expect(result.resume.basics.headline).toBe("");
    expect(result.resume.basics.phone).toBe("");
    expect(result.resume.basics.location).toBe("");
    expect(result.resume.links).toEqual([]);
    expect(result.resume.summary).toBe("");
    expect(result.resume.experience[0]!.role).toBe("");
    expect(result.resume.experience[0]!.location).toBe("");
    expect(result.resume.experience[0]!.endDate).toBe("");
    expect(result.resume.experience[0]!.current).toBe(false);
    expect(result.resume.experience[0]!.highlights).toEqual(["", "achieved sales target"]);
    expect(result.resume.education).toEqual([]);
    expect(result.resume.projects).toEqual([]);
    expect(result.resume.skills).toEqual([]);
  });

  it("releases conversion credits when provider output is invalid", async () => {
    api.fetch.mockResolvedValue(chatResponse("{", { id: "conversion_2" }));
    const { AtsAiService } = await import("../../src/services/ats/ai");

    await expect(
      AtsAiService.convertResume("user_1", "request_invalid", "Old resume"),
    ).rejects.toThrow("could not be completed");
    expect(releaseReservation).toHaveBeenCalledWith("user_1", "request_invalid");
  });

  it("releases credits and reports 503 when no provider key is configured", async () => {
    const { config } = await import("#config");
    const original = config.ai.apiKey;
    config.ai.apiKey = "";
    try {
      const { AtsAiService } = await import("../../src/services/ats/ai");
      await expect(
        AtsAiService.convertResume("user_1", "request_nokey", "Old resume"),
      ).rejects.toMatchObject({ statusCode: 503 });
      expect(releaseReservation).toHaveBeenCalledWith("user_1", "request_nokey");
      expect(api.fetch).not.toHaveBeenCalled();
    } finally {
      config.ai.apiKey = original;
    }
  });

  it("does not need the engine policy to analyse or convert", async () => {
    // Only parse repair classifies credentials. A missing engine policy used to fail every AI
    // path, because the shared AI instance loaded it up front.
    getAtsEnginePolicy.mockImplementation(() => {
      throw new Error("engine policy unavailable");
    });
    api.fetch.mockResolvedValueOnce(chatResponse(insights));
    api.fetch.mockResolvedValueOnce(chatResponse({ basics: {} }));
    const { AtsAiService } = await import("../../src/services/ats/ai");

    await expect(
      AtsAiService.analyze("user_1", "request_a", "Resume", undefined, report, false),
    ).resolves.toMatchObject({ routed: true });
    await expect(
      AtsAiService.convertResume("user_1", "request_c", "Resume"),
    ).resolves.toBeDefined();
    expect(getAtsEnginePolicy).not.toHaveBeenCalled();
  });

  it("records unknown token counts as null, not as a free call", async () => {
    api.fetch.mockResolvedValue(chatResponse(insights)); // no usage block
    const { AtsAiService } = await import("../../src/services/ats/ai");

    await AtsAiService.analyze("user_1", "request_nousage", "Resume", undefined, report, false);

    expect(commitReservation.mock.calls[0]![2].metadata).toMatchObject({
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
    });
  });
});
