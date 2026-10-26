import { beforeEach, describe, expect, it, vi } from "vitest";

const completionCreate = vi.fn();
const reserveAction = vi.fn();
const commitReservation = vi.fn();
const releaseReservation = vi.fn();

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

vi.mock("#services/aiPolicy", () => ({
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

vi.mock("#services/creditService", () => ({
  CreditService: {
    reserveAction,
    commitReservation,
    releaseReservation,
    storedResult: async () => null,
  },
  replayFingerprint: () => "fingerprint",
}));

const input = {
  action: "rewrite_section" as const,
  mode: "standard" as const,
  input: {
    text: "Original text",
    context: "Verified context",
    jobDescription: "",
    instructions: "",
  },
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
    const { AiService } = await import("../../src/services/aiService.js");

    const result = await AiService.generate("user_1", input);

    expect(result).toMatchObject({
      content: "Improved text",
      credits: { spent: 7, balance: 23 },
    });
    expect(result).not.toHaveProperty("reasoning");
    expect(result).not.toHaveProperty("model");
    expect(completionCreate.mock.calls[0][0]).toEqual(
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
    const { AiService } = await import("../../src/services/aiService.js");
    reserveAction.mockRejectedValue(new Error("Not enough AI credits."));

    await expect(AiService.generate("user_1", input)).rejects.toThrow("Not enough AI credits");
    expect(completionCreate).not.toHaveBeenCalled();
  });

  it("releases reserved credits for an empty provider response", async () => {
    const { AiService } = await import("../../src/services/aiService.js");
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
    const { AiService } = await import("../../src/services/aiService.js");
    completionCreate.mockRejectedValue(new Error("provider unavailable"));

    await expect(AiService.generate("user_1", input)).rejects.toThrow(
      "AI provider could not complete",
    );
    expect(releaseReservation).toHaveBeenCalledWith("user_1", "request_1");
  });

  /** V-034: the request's signal reaches the SDK call, so a client leaving ends the call. */
  it("passes the request signal to the provider call", async () => {
    const { AiService } = await import("../../src/services/aiService.js");
    const controller = new AbortController();

    await AiService.generate("user_1", input, controller.signal);

    expect(completionCreate.mock.calls[0][1]).toEqual({ signal: controller.signal });
  });

  it("releases the reservation and answers 504 when the call is aborted", async () => {
    const { AiService } = await import("../../src/services/aiService.js");
    const controller = new AbortController();
    // The SDK rejects with its own abort error once the signal fires; the shape does not matter.
    completionCreate.mockImplementation(
      (_body: unknown, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          const abort = () => reject(new Error("Request was aborted."));
          if (options.signal.aborted) abort();
          else options.signal.addEventListener("abort", abort);
        }),
    );

    const pending = AiService.generate("user_1", input, controller.signal);
    controller.abort(new Error("Client disconnected."));

    await expect(pending).rejects.toMatchObject({ statusCode: 504 });
    expect(releaseReservation).toHaveBeenCalledWith("user_1", "request_1");
    expect(commitReservation).not.toHaveBeenCalled();
  });

  /** A release that fails (database down) must not replace the provider error being reported. */
  it("still reports the provider failure when releasing the reservation fails", async () => {
    const { AiService } = await import("../../src/services/aiService.js");
    completionCreate.mockRejectedValue(new Error("provider unavailable"));
    releaseReservation.mockRejectedValue(new Error("connection refused"));

    await expect(AiService.generate("user_1", input)).rejects.toMatchObject({
      statusCode: 502,
      message: "The AI provider could not complete the request.",
    });
  });
});
