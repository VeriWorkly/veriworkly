/**
 * @veriworkly/ats-engine/ai/anthropic — the Anthropic Messages API, over `fetch`.
 *
 * One `POST /v1/messages` per `complete()`, never retried by the adapter itself (the task owns
 * retries). `json_schema` output uses `output_config.format`; `json_object` relies on the
 * prompt, and the task tolerates a fenced reply.
 *
 * Current Claude models reject sampling parameters, so `temperature` is sent only when a route
 * sets one. On models that always think, thinking counts against `maxTokens` — budget for it.
 * Pass `output_config.effort` (or anything else the API accepts) through `providerOptions`.
 */

import { own } from "../util/own.js";
import { postJson, type HttpOptions } from "./http.js";
import {
  LlmProviderError,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
} from "./provider.js";

export type AnthropicOptions = HttpOptions & {
  apiKey: string;
  /** Defaults to `https://api.anthropic.com`. */
  baseUrl?: string;
  /** The `anthropic-version` header. Defaults to `2023-06-01`. */
  version?: string;
};

type MessagesResponse = {
  id?: string;
  content?: Array<{ type?: string; text?: string }>;
  stop_reason?: string | null;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number | null;
    cache_read_input_tokens?: number | null;
  };
};

const FINISH: Record<string, LlmResponse["finish"]> = {
  end_turn: "stop",
  stop_sequence: "stop",
  max_tokens: "length",
  // The input filled the window and the reply was cut: as truncated as `max_tokens`, and a retry
  // with the same input is cut again.
  model_context_window_exceeded: "length",
  refusal: "refusal",
};

/**
 * Structured outputs document `anyOf` with a `null` branch for optional values rather than a
 * `type` array, so `type: [X, "null"]` is rewritten as `anyOf: [{ type: X, … }, { type: "null" }]`.
 */
function toAnthropicSchema(input: Record<string, unknown>): Record<string, unknown> {
  const node = { ...input };
  if (node.properties && typeof node.properties === "object")
    node.properties = Object.fromEntries(
      Object.entries(node.properties).map(([key, child]) => [key, toAnthropicSchema(child)]),
    );
  if (node.items && typeof node.items === "object")
    node.items = toAnthropicSchema(node.items as Record<string, unknown>);

  const { type, ...rest } = node;
  if (!Array.isArray(type) || !type.includes("null")) return node;
  const others = type.filter((entry) => entry !== "null");
  return { anyOf: [{ ...rest, type: others.length === 1 ? others[0] : others }, { type: "null" }] };
}

/** The request body for one call. Exported for tests that pin the wire format. */
export function messagesBody(request: LlmRequest) {
  const { output_config: extraConfig, ...extra } = request.extraBody ?? {};
  const format =
    request.output?.mode === "json_schema"
      ? { format: { type: "json_schema", schema: toAnthropicSchema(request.output.schema) } }
      : {};
  const outputConfig = { ...(extraConfig as Record<string, unknown> | undefined), ...format };

  return {
    ...extra,
    model: request.model,
    max_tokens: request.maxTokens,
    system: request.system,
    messages: request.messages,
    ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
    ...(Object.keys(outputConfig).length ? { output_config: outputConfig } : {}),
  };
}

export function anthropic(options: AnthropicOptions): LlmProvider {
  if (!options.apiKey) throw new LlmProviderError("An API key is required.", { retryable: false });
  const url = `${(options.baseUrl || "https://api.anthropic.com").replace(/\/+$/, "")}/v1/messages`;
  const headers = {
    "x-api-key": options.apiKey,
    "anthropic-version": options.version ?? "2023-06-01",
    ...options.headers,
  };

  return {
    async complete(request) {
      const json = (await postJson(url, headers, messagesBody(request), {
        ...options,
        signal: request.signal,
      })) as MessagesResponse;
      const usage = json.usage;
      return {
        text: (json.content ?? [])
          .filter((block) => block.type === "text")
          .map((block) => block.text ?? "")
          .join(""),
        id: json.id,
        usage: usage
          ? {
              inputTokens:
                (usage.input_tokens ?? 0) +
                (usage.cache_creation_input_tokens ?? 0) +
                (usage.cache_read_input_tokens ?? 0),
              outputTokens: usage.output_tokens ?? 0,
              // Part of `inputTokens`, priced apart: reads at a tenth, writes at a premium.
              ...(typeof usage.cache_read_input_tokens === "number" && {
                cacheReadTokens: usage.cache_read_input_tokens,
              }),
              ...(typeof usage.cache_creation_input_tokens === "number" && {
                cacheWriteTokens: usage.cache_creation_input_tokens,
              }),
            }
          : undefined,
        finish: own(FINISH, json.stop_reason ?? "") ?? "other",
      };
    },
  };
}
