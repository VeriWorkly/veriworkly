import { beforeEach, describe, expect, it, vi } from "vitest";

const constructed: Array<Record<string, unknown>> = [];

vi.mock("openai", () => ({
  default: class OpenAI {
    constructor(options: Record<string, unknown>) {
      constructed.push(options);
    }
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

/**
 * The OpenAI SDK retries twice unless told otherwise, and `AtsAiService.analyze` wraps its own
 * retry loop around the call. Left at the default the two multiply — a model configured for 2
 * retries makes up to 9 billed provider calls instead of 3 — and the extra six never surface,
 * because the SDK retries beneath the call site where nothing logs or counts them. The pricing
 * gates in `routeForTier` budget `retries + 1` calls, so the overspend is silent margin loss.
 */
describe("AI client retry configuration", () => {
  beforeEach(() => {
    constructed.length = 0;
    vi.resetModules();
  });

  it("disables SDK-level retries so caller retry loops are not multiplied", async () => {
    const { createAiClient } = await import("#services/aiClient");
    createAiClient();

    expect(constructed).toHaveLength(1);
    expect(constructed[0]!.maxRetries).toBe(0);
  });
});
