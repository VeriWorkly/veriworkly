/**
 * @veriworkly/ats-engine/ai/openai-compatible — any Chat Completions endpoint, over `fetch`.
 *
 * OpenAI, OpenRouter, Groq, Together, vLLM, Ollama and anything else that serves
 * `POST {baseUrl}/chat/completions`. No SDK: the adapter makes exactly one HTTP call per
 * `complete()` and never retries on its own — retrying is the task's decision, and a transport
 * that retried underneath it would multiply every attempt into several billed calls.
 */

import { own } from "../util/own.js";
import { postJson, type HttpOptions } from "./http.js";
import {
  LlmProviderError,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
} from "./provider.js";

export type OpenAiCompatibleOptions = HttpOptions & {
  apiKey: string;
  /** Defaults to `https://api.openai.com/v1`. */
  baseUrl?: string;
  /**
   * OpenRouter only: with a `json_schema` request, also send `provider.require_parameters`, so
   * the gateway routes only to upstreams that honour the schema instead of one that ignores it
   * and returns prose. Other endpoints reject the unknown `provider` field, so it is opt-in.
   */
  requireParameters?: boolean;
  /**
   * The name the output budget is sent under. OpenAI's current models take only
   * `max_completion_tokens` and reject `max_tokens`; most compatible servers (Ollama, vLLM, Groq,
   * OpenRouter) still read `max_tokens`. Defaults to the first for api.openai.com, else the second.
   */
  maxTokensParameter?: "max_tokens" | "max_completion_tokens";
};

type ChatCompletion = {
  id?: string;
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string | Array<{ type?: string; text?: string }> | null;
      refusal?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number | null };
  };
};

/** Message content as text: a string, or the text parts of a content array some servers send. */
const contentText = (content: unknown) =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part) => (typeof part?.text === "string" ? part.text : "")).join("")
      : "";

const FINISH: Record<string, LlmResponse["finish"]> = {
  stop: "stop",
  length: "length",
  content_filter: "refusal",
};

/** The request body for one call. Exported for tests that pin the wire format. */
export function chatCompletionBody(
  request: LlmRequest,
  requireParameters = false,
  maxTokensParameter: "max_tokens" | "max_completion_tokens" = "max_tokens",
) {
  const { output, extraBody } = request;
  const structured = output?.mode === "json_schema";
  const routing =
    structured && requireParameters
      ? {
          ...extraBody,
          provider: {
            require_parameters: true,
            ...(extraBody?.provider as Record<string, unknown> | undefined),
          },
        }
      : (extraBody ?? {});

  return {
    ...routing,
    model: request.model,
    messages: [{ role: "system", content: request.system }, ...request.messages],
    [maxTokensParameter]: request.maxTokens,
    ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
    ...(output
      ? {
          response_format: structured
            ? {
                type: "json_schema",
                json_schema: { name: output.name, strict: true, schema: output.schema },
              }
            : { type: "json_object" },
        }
      : {}),
    stream: false,
  };
}

export function openAiCompatible(options: OpenAiCompatibleOptions): LlmProvider {
  if (!options.apiKey) throw new LlmProviderError("An API key is required.", { retryable: false });
  const base = (options.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const url = `${base}/chat/completions`;
  const headers = { authorization: `Bearer ${options.apiKey}`, ...options.headers };
  const maxTokensParameter =
    options.maxTokensParameter ??
    (/^https:\/\/api\.openai\.com\//.test(`${base}/`) ? "max_completion_tokens" : "max_tokens");

  return {
    async complete(request) {
      const body = chatCompletionBody(request, options.requireParameters, maxTokensParameter);
      const json = (await postJson(url, headers, body, {
        ...options,
        signal: request.signal,
      })) as ChatCompletion;

      const choice = json.choices?.[0];
      const refused = Boolean(choice?.message?.refusal);
      return {
        text: contentText(choice?.message?.content),
        id: json.id,
        usage: json.usage
          ? {
              inputTokens: json.usage.prompt_tokens ?? 0,
              outputTokens: json.usage.completion_tokens ?? 0,
              ...(typeof json.usage.prompt_tokens_details?.cached_tokens === "number" && {
                cacheReadTokens: json.usage.prompt_tokens_details.cached_tokens,
              }),
            }
          : undefined,
        finish: refused ? "refusal" : (own(FINISH, choice?.finish_reason ?? "") ?? "other"),
      };
    },
  };
}
