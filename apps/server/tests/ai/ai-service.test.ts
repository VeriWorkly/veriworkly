import { beforeEach, describe, expect, it, vi } from "vitest";

const completionCreate = vi.fn();
const reserveAction = vi.fn();
const commitReservation = vi.fn();
const releaseReservation = vi.fn();

vi.mock("../../src/config", () => ({
  config: {
    ai: {
      apiKey: "test-key",
      baseUrl: "https://provider.invalid/v1",
      timeoutMs: 120000,
      siteUrl: "",
    },
  },
}));

vi.mock("../../src/services/aiPolicy", () => ({
  getAiActionPolicy: vi.fn(() => ({
    maxTextChars: 4000,
    maxContextChars: 8000,
    maxJobDescriptionChars: 3000,
    systemPrompt: "test-policy-token",
    userPromptTemplate: "Text: {{text}}\nContext: {{context}}\nDirection: {{instructions}}",
  })),
  getAiModePolicy: vi.fn(() => ({
    credits: 7,
    model: "private-model",
    maxOutputTokens: 800,
  })),
  publicAiActionPolicy: vi.fn(() => ({})),
}));

vi.mock("openai", () => ({
  default: class OpenAI {
    chat = { completions: { create: completionCreate } };
  },
}));

vi.mock("../../src/services/creditService", () => ({
  CreditService: {
    reserveAction,
    commitReservation,
    releaseReservation,
  },
}));

const input = {
  action: "rewrite_section" as const,
  mode: "standard" as const,
  input: { text: "Original text", context: "Verified context", instructions: "" },
  requestId: "request_1",
};

describe("AI service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reserveAction.mockResolvedValue({ cost: 7 });
    commitReservation.mockResolvedValue({ balanceAfter: 23 });
    releaseReservation.mockResolvedValue(true);
    completionCreate.mockResolvedValue({
      id: "generation_1",
      model: "private-model",
      choices: [{ message: { content: "Improved text", reasoning_content: "private reasoning" } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });
  });

  it("uses server-owned prompts and commits reserved credits after success", async () => {
    const { AiService } = await import("../../src/services/aiService");

    const result = await AiService.generate("user_1", input);

    expect(result).toMatchObject({
      content: "Improved text",
      credits: { spent: 7, balance: 23 },
    });
    expect(result).not.toHaveProperty("reasoning");
    expect(result).not.toHaveProperty("model");
    expect(completionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: "system", content: "test-policy-token" },
          expect.objectContaining({ role: "user" }),
        ],
      }),
    );
    expect(commitReservation).toHaveBeenCalledWith(
      "user_1",
      "request_1",
      expect.objectContaining({ referenceId: "generation_1" }),
    );
    expect(releaseReservation).not.toHaveBeenCalled();
  });

  it("does not call the provider when reservation fails", async () => {
    const { AiService } = await import("../../src/services/aiService");
    reserveAction.mockRejectedValue(new Error("Not enough AI credits."));

    await expect(AiService.generate("user_1", input)).rejects.toThrow("Not enough AI credits");
    expect(completionCreate).not.toHaveBeenCalled();
  });

  it("releases reserved credits for an empty provider response", async () => {
    const { AiService } = await import("../../src/services/aiService");
    completionCreate.mockResolvedValue({
      id: "generation_2",
      model: "private-model",
      choices: [{ message: { content: "" } }],
    });

    await expect(AiService.generate("user_1", input)).rejects.toThrow("empty response");
    expect(commitReservation).not.toHaveBeenCalled();
    expect(releaseReservation).toHaveBeenCalledWith("user_1", "request_1");
  });

  it("releases reserved credits when the provider fails", async () => {
    const { AiService } = await import("../../src/services/aiService");
    completionCreate.mockRejectedValue(new Error("provider unavailable"));

    await expect(AiService.generate("user_1", input)).rejects.toThrow(
      "AI provider could not complete",
    );
    expect(releaseReservation).toHaveBeenCalledWith("user_1", "request_1");
  });
});
