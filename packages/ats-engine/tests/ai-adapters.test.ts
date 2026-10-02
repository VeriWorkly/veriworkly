import { describe, expect, it, vi } from "vitest";

import { anthropic, messagesBody } from "../src/ai/anthropic.js";
import type { FetchLike } from "../src/ai/http.js";
import { chatCompletionBody, openAiCompatible } from "../src/ai/openai-compatible.js";
import { LlmProviderError, type LlmRequest } from "../src/ai/provider.js";

const schema = {
  type: "object",
  properties: {
    name: { type: ["string", "null"] },
    tags: { type: ["array", "null"], items: { type: "string" } },
  },
  required: ["name", "tags"],
  additionalProperties: false,
};

const request = (overrides: Partial<LlmRequest> = {}): LlmRequest => ({
  model: "m",
  system: "sys",
  messages: [{ role: "user", content: "hi" }],
  maxTokens: 100,
  output: { name: "out", schema, mode: "json_schema" },
  ...overrides,
});

function fetchReturning(status: number, body: unknown) {
  return vi.fn<FetchLike>(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  }));
}

const sentBody = (fetch: ReturnType<typeof fetchReturning>) =>
  JSON.parse(fetch.mock.calls[0]![1].body) as Record<string, unknown>;

describe("openai-compatible request body", () => {
  it("asks for a strict json_schema, puts the system prompt first, and never streams", () => {
    expect(chatCompletionBody(request({ temperature: 0.3 }))).toEqual({
      model: "m",
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "hi" },
      ],
      max_tokens: 100,
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: { name: "out", strict: true, schema },
      },
      stream: false,
    });
  });

  it("falls back to json_object and leaves temperature out when unset", () => {
    const body = chatCompletionBody(
      request({ output: { name: "out", schema, mode: "json_object" } }),
    );
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body).not.toHaveProperty("temperature");
  });

  it("adds OpenRouter's require_parameters only when asked, alongside existing routing", () => {
    const extraBody = { provider: { order: ["x"] }, transforms: ["middle-out"] };
    expect(chatCompletionBody(request({ extraBody }))).toMatchObject({
      provider: { order: ["x"] },
    });
    expect(chatCompletionBody(request({ extraBody }), true)).toMatchObject({
      provider: { require_parameters: true, order: ["x"] },
      transforms: ["middle-out"],
    });
    // json_object requests need no schema-honouring upstream, so routing is left alone.
    const plain = request({ extraBody, output: { name: "out", schema, mode: "json_object" } });
    expect(chatCompletionBody(plain, true).provider).toEqual({ order: ["x"] });
  });
});

describe("openai-compatible transport", () => {
  it("posts to {baseUrl}/chat/completions with a bearer token and the caller's headers", async () => {
    const fetch = fetchReturning(200, { choices: [{ message: { content: "{}" } }] });
    const provider = openAiCompatible({
      apiKey: "key",
      baseUrl: "https://gateway.invalid/api/v1/",
      headers: { "HTTP-Referer": "https://site.invalid" },
      fetch,
    });
    await provider.complete(request());

    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://gateway.invalid/api/v1/chat/completions");
    expect(init.headers).toMatchObject({
      authorization: "Bearer key",
      "content-type": "application/json",
      "HTTP-Referer": "https://site.invalid",
    });
  });

  it("defaults to the OpenAI endpoint when no base URL is configured", async () => {
    const fetch = fetchReturning(200, { choices: [] });
    await openAiCompatible({ apiKey: "key", baseUrl: "", fetch }).complete(request());
    expect(fetch.mock.calls[0]![0]).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("maps the reply, usage and finish reason", async () => {
    const fetch = fetchReturning(200, {
      id: "c1",
      choices: [{ finish_reason: "length", message: { content: "{" } }],
      usage: { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 },
    });
    const response = await openAiCompatible({ apiKey: "k", fetch }).complete(request());
    expect(response).toEqual({
      text: "{",
      id: "c1",
      usage: { inputTokens: 12, outputTokens: 3 },
      finish: "length",
    });
  });

  it("reports a structured-output refusal as a refusal", async () => {
    const fetch = fetchReturning(200, {
      choices: [{ finish_reason: "stop", message: { content: null, refusal: "I can't." } }],
    });
    const response = await openAiCompatible({ apiKey: "k", fetch }).complete(request());
    expect(response.finish).toBe("refusal");
    expect(response.text).toBe("");
  });

  it.each([
    [400, false],
    [401, false],
    [404, false],
    [429, true],
    [500, true],
    [503, true],
  ])("treats HTTP %i as retryable: %s", async (status, retryable) => {
    const provider = openAiCompatible({ apiKey: "k", fetch: fetchReturning(status, "nope") });
    const error = await provider.complete(request()).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(LlmProviderError);
    expect(error).toMatchObject({ status, retryable });
  });

  it("treats an unreadable body and a network failure as retryable", async () => {
    const garbled = openAiCompatible({ apiKey: "k", fetch: fetchReturning(200, "<html>") });
    await expect(garbled.complete(request())).rejects.toMatchObject({ retryable: true });

    const offline = openAiCompatible({
      apiKey: "k",
      fetch: vi.fn<FetchLike>(async () => {
        throw new TypeError("fetch failed");
      }),
    });
    await expect(offline.complete(request())).rejects.toMatchObject({ retryable: true });
  });

  it("times out a hung request as a retryable failure", async () => {
    const hung = vi.fn<FetchLike>(
      (_url, init) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener("abort", () => reject(new Error("aborted"))),
        ),
    );
    const provider = openAiCompatible({ apiKey: "k", fetch: hung, timeoutMs: 20 });
    await expect(provider.complete(request())).rejects.toMatchObject({
      message: "Provider request timed out.",
      retryable: true,
    });
  });

  it("refuses to start without an API key", () => {
    expect(() => openAiCompatible({ apiKey: "" })).toThrow(LlmProviderError);
  });
});

describe("anthropic request body", () => {
  it("uses output_config.format with nullable fields written as anyOf", () => {
    const body = messagesBody(request());
    expect(body).toEqual({
      model: "m",
      max_tokens: 100,
      system: "sys",
      messages: [{ role: "user", content: "hi" }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              name: { anyOf: [{ type: "string" }, { type: "null" }] },
              tags: { anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }] },
            },
            required: ["name", "tags"],
            additionalProperties: false,
          },
        },
      },
    });
  });

  it("sends no output_config or temperature unless there is something to send", () => {
    const body = messagesBody(request({ output: { name: "out", schema, mode: "json_object" } }));
    expect(body).not.toHaveProperty("output_config");
    expect(body).not.toHaveProperty("temperature");
  });

  it("merges output_config from provider options with the format", () => {
    const body = messagesBody(request({ extraBody: { output_config: { effort: "low" }, x: 1 } }));
    expect(body.output_config).toMatchObject({ effort: "low", format: { type: "json_schema" } });
    expect(body).toMatchObject({ x: 1 });
  });
});

describe("anthropic transport", () => {
  it("posts to /v1/messages with the key and version headers", async () => {
    const fetch = fetchReturning(200, { content: [] });
    await anthropic({ apiKey: "key", fetch }).complete(request());

    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers).toMatchObject({ "x-api-key": "key", "anthropic-version": "2023-06-01" });
    expect(sentBody(fetch).model).toBe("m");
  });

  it("joins text blocks, counts cached input, and maps stop reasons", async () => {
    const fetch = fetchReturning(200, {
      id: "msg_1",
      content: [
        { type: "thinking", thinking: "" },
        { type: "text", text: '{"a":' },
        { type: "text", text: "1}" },
      ],
      stop_reason: "end_turn",
      usage: {
        input_tokens: 5,
        cache_creation_input_tokens: 2,
        cache_read_input_tokens: 3,
        output_tokens: 7,
      },
    });
    expect(await anthropic({ apiKey: "k", fetch }).complete(request())).toEqual({
      text: '{"a":1}',
      id: "msg_1",
      // The total, with the cached part broken out: it is priced differently.
      usage: { inputTokens: 10, outputTokens: 7, cacheReadTokens: 3, cacheWriteTokens: 2 },
      finish: "stop",
    });
  });

  it.each([
    ["max_tokens", "length"],
    ["refusal", "refusal"],
    ["pause_turn", "other"],
  ])("maps stop_reason %s to %s", async (stopReason, finish) => {
    const fetch = fetchReturning(200, { content: [], stop_reason: stopReason });
    expect((await anthropic({ apiKey: "k", fetch }).complete(request())).finish).toBe(finish);
  });
});
