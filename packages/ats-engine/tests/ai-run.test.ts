import { describe, expect, it, vi } from "vitest";

import { anthropic } from "../src/ai/anthropic.js";
import { AtsAiError, createAtsAi, LlmProviderError } from "../src/ai/index.js";
import { DEFAULT_CONVERT_PROMPT } from "../src/ai/tasks/convertResume.js";
import { scriptedProvider } from "../src/ai/testing/index.js";

const SOURCE = "Jane Doe\nEngineer at Acme Corporation\n2020 - 2023";
const converted = JSON.stringify({
  basics: { fullName: "Jane Doe", role: "Engineer" },
  experience: [{ company: "Acme Corporation", role: "Engineer" }],
});
const route = { model: "m", maxTokens: 100 };

function setup(...replies: Parameters<typeof scriptedProvider>) {
  const provider = scriptedProvider(...replies);
  const onRetry = vi.fn();
  const ai = createAtsAi({
    provider,
    routes: { convertResume: { ...route, retries: 2 } },
    hooks: { onRetry },
  });
  return { ai, provider, onRetry };
}

const convert = (ai: ReturnType<typeof createAtsAi>, options = {}) =>
  ai.convertResume({ resumeText: SOURCE }, options);

describe("task runner", () => {
  it("returns the result with usage, attempts, response id and prompt version", async () => {
    const { ai } = setup({
      text: converted,
      id: "r1",
      usage: { inputTokens: 10, outputTokens: 4 },
    });
    const outcome = await convert(ai);

    expect(outcome.result.basics.fullName).toBe("Jane Doe");
    expect(outcome).toMatchObject({
      attempts: 1,
      responseId: "r1",
      model: "m",
      usage: { inputTokens: 10, outputTokens: 4 },
      rejected: [],
    });
    expect(outcome.promptVersion).toMatch(/^default:[0-9a-f]{8}$/);
  });

  it.each([
    ["malformed JSON", { text: "{ truncated" }],
    ["an empty reply", { text: "  " }],
    ["a schema violation", { text: JSON.stringify({ summary: "x".repeat(5_000) }) }],
    ["a rate limit", new LlmProviderError("slow down", { status: 429, retryable: true })],
    ["a server fault", new LlmProviderError("boom", { status: 503, retryable: true })],
    ["an unclassified throw", new Error("socket hang up")],
  ])("retries %s and keeps the eventual result", async (_label, failure) => {
    const { ai, provider, onRetry } = setup(failure, { text: converted });
    const outcome = await convert(ai);

    expect(provider.calls).toHaveLength(2);
    expect(outcome.attempts).toBe(2);
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onRetry.mock.calls[0]![0]).toMatchObject({ task: "convertResume", attempt: 1 });
  });

  it("sums usage across every attempt, failed ones included", async () => {
    const { ai } = setup(
      { text: "{", usage: { inputTokens: 10, outputTokens: 2 } },
      { text: converted, usage: { inputTokens: 10, outputTokens: 5 } },
    );
    expect((await convert(ai)).usage).toEqual({ inputTokens: 20, outputTokens: 7 });
  });

  it("gives up once the retry budget is spent, reporting attempts and usage", async () => {
    const { ai, provider } = setup({ text: "{", usage: { inputTokens: 3, outputTokens: 1 } });
    const error = await convert(ai).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AtsAiError);
    expect(error).toMatchObject({
      code: "invalid_output",
      attempts: 3,
      usage: { inputTokens: 9, outputTokens: 3 },
    });
    expect(provider.calls).toHaveLength(3);
  });

  it.each([
    ["a 4xx rejection", new LlmProviderError("bad", { status: 400, retryable: false }), "provider"],
    [
      "a thrown error carrying a 4xx status",
      Object.assign(new Error("bad"), { status: 422 }),
      "provider",
    ],
    ["a refusal", { text: "", finish: "refusal" as const }, "refused"],
  ])("does not retry %s", async (_label, failure, code) => {
    const { ai, provider } = setup(failure);
    await expect(convert(ai)).rejects.toMatchObject({ code });
    expect(provider.calls).toHaveLength(1);
  });

  it("keeps the provider's status on the error", async () => {
    const { ai } = setup(new LlmProviderError("nope", { status: 401, retryable: false }));
    await expect(convert(ai)).rejects.toMatchObject({ code: "provider", status: 401 });
  });

  it("reads a fenced JSON reply", async () => {
    const { ai } = setup(`\`\`\`json\n${converted}\n\`\`\``);
    expect((await convert(ai)).result.basics.fullName).toBe("Jane Doe");
  });

  it("rejects a route without a model or token budget before calling anything", async () => {
    const provider = scriptedProvider(converted);
    const ai = createAtsAi({ provider });
    await expect(convert(ai)).rejects.toMatchObject({ code: "config" });
    await expect(convert(ai, { model: "m", maxTokens: 0 })).rejects.toMatchObject({
      code: "config",
    });
    await expect(convert(ai, { ...route, retries: 1.5 })).rejects.toMatchObject({
      code: "config",
    });
    expect(provider.calls).toHaveLength(0);
  });

  it("lets a call override the route, ignoring undefined values", async () => {
    const { ai, provider } = setup(converted);
    await convert(ai, { model: "other", temperature: undefined, maxTokens: 50 });
    expect(provider.calls[0]).toMatchObject({ model: "other", maxTokens: 50 });
  });

  it("maps route settings onto the request", async () => {
    const provider = scriptedProvider(converted);
    const ai = createAtsAi({ provider });
    await convert(ai, {
      ...route,
      temperature: 0.2,
      structuredOutputs: true,
      providerOptions: { provider: { order: ["x"] } },
    });
    expect(provider.calls[0]).toMatchObject({
      temperature: 0.2,
      extraBody: { provider: { order: ["x"] } },
      output: { name: "converted_resume", mode: "json_schema" },
    });
  });

  it("asks for json_object unless structured outputs are switched on", async () => {
    const { ai, provider } = setup(converted);
    await convert(ai);
    expect(provider.calls[0]!.output).toMatchObject({ mode: "json_object" });
    expect(provider.calls[0]!.temperature).toBeUndefined();
  });

  it("prefers a per-call prompt, then the configured one, then the default", async () => {
    const provider = scriptedProvider(converted);
    const ai = createAtsAi({
      provider,
      routes: { convertResume: route },
      prompts: { convertResume: "configured" },
    });

    const configured = await convert(ai);
    const perCall = await convert(ai, { system: "per-call" });
    expect(provider.calls.map((call) => call.system)).toEqual(["configured", "per-call"]);
    expect(configured.promptVersion).toMatch(/^custom:/);
    expect(perCall.promptVersion).not.toBe(configured.promptVersion);

    const defaults = createAtsAi({ provider, routes: { convertResume: route } });
    await convert(defaults);
    expect(provider.calls[2]!.system).toBe(DEFAULT_CONVERT_PROMPT);
  });

  it("stops at once when the caller aborts, without retrying", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = vi.fn();
    const ai = createAtsAi({
      provider: anthropic({ apiKey: "k", fetch }),
      routes: { convertResume: { ...route, retries: 2 } },
    });

    await expect(convert(ai, { signal: controller.signal })).rejects.toMatchObject({
      code: "aborted",
      attempts: 1,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
