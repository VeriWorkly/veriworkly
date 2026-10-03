/**
 * The whole contract a model provider implements.
 *
 * Deliberately small: one non-streaming completion that returns text. Tasks build the prompt,
 * validate the output and decide whether to retry; an adapter only moves a request over the
 * wire and reports what came back. Anything a deployment needs that this does not model — a
 * gateway's routing hints, a provider's own knobs — travels in `extraBody`.
 */

/** Just enough of `AbortSignal`: the package compiles without DOM or Node types. */
export type AbortSignalLike = {
  readonly aborted: boolean;
  readonly reason?: unknown;
  addEventListener(type: "abort", listener: () => void, options?: { once?: boolean }): void;
  removeEventListener(type: "abort", listener: () => void): void;
};

export type LlmMessage = { role: "user" | "assistant"; content: string };

/**
 * How to ask for JSON.
 *
 * `json_schema` constrains the response to `schema` and is the mode to prefer, but support is a
 * property of the model and the endpoint serving it, so it is the caller's switch. `json_object`
 * asks only for well-formed JSON; the prompt carries the shape and validation catches the rest.
 */
export type LlmOutputFormat = {
  name: string;
  schema: Record<string, unknown>;
  mode: "json_schema" | "json_object";
};

export type LlmRequest = {
  model: string;
  system: string;
  messages: LlmMessage[];
  maxTokens: number;
  /** Left out of the request when undefined: some current models reject sampling parameters. */
  temperature?: number;
  output?: LlmOutputFormat;
  /** Merged into the request body as-is. */
  extraBody?: Record<string, unknown>;
  signal?: AbortSignalLike;
};

/**
 * `inputTokens` is every input token. The cache fields say how many of those were read from or
 * written to a prompt cache, which providers price differently; absent when not reported.
 */
export type LlmUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
};

export type LlmResponse = {
  text: string;
  id?: string;
  usage?: LlmUsage;
  /** `length` means the output hit `maxTokens`; `refusal` means the model declined. */
  finish: "stop" | "length" | "refusal" | "other";
};

export interface LlmProvider {
  complete(request: LlmRequest): Promise<LlmResponse>;
}

/**
 * A failed provider call.
 *
 * `retryable` is the adapter's verdict. A rejection on the request's merits (a 4xx other than
 * 429) is not: sending the same request again spends the budget twice for the same refusal.
 * Rate limits, server faults, timeouts and unreadable bodies are.
 */
export class LlmProviderError extends Error {
  readonly status?: number;
  readonly retryable: boolean;

  constructor(message: string, options: { status?: number; retryable: boolean; cause?: unknown }) {
    super(message, { cause: options.cause });
    this.name = "LlmProviderError";
    this.status = options.status;
    this.retryable = options.retryable;
  }
}

/** The retry rule for an HTTP status, shared by every adapter. */
export function isRetryableStatus(status: number): boolean {
  return !(status >= 400 && status < 500 && status !== 429);
}
