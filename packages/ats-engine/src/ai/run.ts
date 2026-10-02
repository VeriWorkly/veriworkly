import type { z } from "zod";

import type { GroundingViolation } from "../repair/grounding.js";
import { fnv1a } from "../util/hash.js";
import { AbortedError, type AbortSignalLike } from "./http.js";
import {
  isRetryableStatus,
  LlmProviderError,
  type LlmProvider,
  type LlmResponse,
  type LlmUsage,
} from "./provider.js";

export type AtsAiTask = "analyze" | "repairParse" | "convertResume";

/** Which model serves a task, and how. Set per task in `createAtsAi`, overridable per call. */
export type TaskRoute = {
  model: string;
  maxTokens: number;
  temperature?: number;
  /** Extra attempts after the first. A refusal or a 4xx rejection is never retried. */
  retries?: number;
  /** Ask for `json_schema` output. Off by default: not every model and endpoint supports it. */
  structuredOutputs?: boolean;
  /** Merged into the request body, e.g. a gateway's routing preferences. */
  providerOptions?: Record<string, unknown>;
  /** Replaces the task's system prompt for this call. */
  system?: string;
};

export type AtsAiCallOptions = Partial<TaskRoute> & { signal?: AbortSignalLike };

export type AtsAiResult<T> = {
  result: T;
  /** Values the model returned that were not grounded in the input, and were dropped. */
  rejected: GroundingViolation[];
  /**
   * Summed over every attempt, failed ones included: they were billed too. Undefined when the
   * provider never reported usage — unknown, which is not the same as free.
   */
  usage?: LlmUsage;
  attempts: number;
  /** The provider's id for the response that was used. */
  responseId?: string;
  model: string;
  /** `default:<hash>` or `custom:<hash>` of the system prompt that produced the result. */
  promptVersion: string;
};

/**
 * `truncated`: the reply hit `maxTokens` before it was complete. Not retried — the same budget
 * truncates again and is billed again; raise `maxTokens` instead.
 */
export type AtsAiErrorCode =
  "config" | "provider" | "refused" | "truncated" | "invalid_output" | "aborted";

export class AtsAiError extends Error {
  readonly code: AtsAiErrorCode;
  readonly status?: number;
  readonly usage?: LlmUsage;
  readonly attempts: number;

  constructor(
    code: AtsAiErrorCode,
    message: string,
    options: { status?: number; usage?: LlmUsage; attempts?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AtsAiError";
    this.code = code;
    this.status = options.status;
    this.usage = options.usage;
    this.attempts = options.attempts ?? 0;
  }
}

export type AtsAiRetryEvent = { task: AtsAiTask; attempt: number; error: AtsAiError };

export type RunContext = {
  provider: LlmProvider;
  routes: Partial<Record<AtsAiTask, Partial<TaskRoute>>>;
  prompts: Partial<Record<AtsAiTask, string>>;
  onRetry?: (event: AtsAiRetryEvent) => void;
};

/** One task's fixed parts. `user` is the already-built user message. */
export type TaskSpec<Raw, Result> = {
  task: AtsAiTask;
  outputName: string;
  schema: z.ZodType<Raw>;
  /** `schema` as the strict JSON Schema sent to the model. */
  jsonSchema: Record<string, unknown>;
  defaultPrompt: string;
  user: string;
  finish(raw: Raw): { result: Result; rejected: GroundingViolation[] };
};

function resolveRoute(context: RunContext, task: AtsAiTask, options: AtsAiCallOptions) {
  const overrides = Object.fromEntries(
    Object.entries(options).filter(([key, value]) => key !== "signal" && value !== undefined),
  );
  const route = { ...context.routes[task], ...overrides } as Partial<TaskRoute>;
  if (typeof route.model !== "string" || !route.model)
    throw new AtsAiError("config", `No model configured for the "${task}" task.`);
  if (!Number.isInteger(route.maxTokens) || (route.maxTokens ?? 0) <= 0)
    throw new AtsAiError("config", `"${task}" needs a positive integer maxTokens.`);
  const retries = route.retries ?? 0;
  if (!Number.isInteger(retries) || retries < 0 || retries > 5)
    throw new AtsAiError("config", `"${task}" retries must be an integer from 0 to 5.`);
  return { ...route, retries } as TaskRoute & { retries: number };
}

/**
 * Models asked for JSON without a schema sometimes fence it anyway, on several lines or on one
 * ("```json{…}```"); the fence and its language tag go, the JSON stays.
 */
function unfence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```") || !trimmed.endsWith("```") || trimmed.length < 6) return trimmed;
  return trimmed
    .slice(3, -3)
    .replace(/^[a-z]*(?=\s|[{[])/i, "")
    .trim();
}

/** Parses one response. Throws an `AtsAiError` whose code says whether a retry can help. */
function readReply<Raw>(response: LlmResponse, schema: z.ZodType<Raw>): Raw {
  if (response.finish === "refusal") throw new AtsAiError("refused", "The model declined.");
  const truncated = response.finish === "length";
  if (!response.text.trim())
    throw truncated
      ? new AtsAiError("truncated", "maxTokens was spent before any output.")
      : new AtsAiError("invalid_output", "Empty response.");

  let json: unknown;
  try {
    json = JSON.parse(unfence(response.text));
  } catch (error) {
    throw truncated
      ? new AtsAiError("truncated", "Response was cut off at maxTokens.", { cause: error })
      : new AtsAiError("invalid_output", "Response was not valid JSON.", { cause: error });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new AtsAiError("invalid_output", `Response did not match the schema: ${issues}`, {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

/** Normalises anything a provider can throw, and says whether retrying can help. */
function classify(
  error: unknown,
  signal: AbortSignalLike | undefined,
): { error: AtsAiError; retryable: boolean } {
  if (error instanceof AtsAiError) return { error, retryable: error.code === "invalid_output" };
  // The caller's own abort, however the provider reported it (a custom one may throw a DOM
  // AbortError or anything else once the signal fires): never retried.
  if (
    error instanceof AbortedError ||
    signal?.aborted ||
    (error as { name?: unknown })?.name === "AbortError"
  )
    return {
      error: new AtsAiError("aborted", "The request was aborted.", { cause: error }),
      retryable: false,
    };
  const status =
    error instanceof LlmProviderError ? error.status : (error as { status?: unknown })?.status;
  const retryable =
    error instanceof LlmProviderError
      ? error.retryable
      : typeof status !== "number" || isRetryableStatus(status);
  const message = error instanceof Error ? error.message : "Provider call failed.";
  return {
    error: new AtsAiError("provider", message, {
      status: typeof status === "number" ? status : undefined,
      cause: error,
    }),
    retryable,
  };
}

/**
 * Runs one task: build the request, call the provider, validate, retry what a retry can fix.
 *
 * Retried, immediately and up to `retries` times: malformed or empty output, rate limits, server
 * faults and timeouts. Not retried: refusals, output truncated at `maxTokens`, 4xx rejections
 * other than 429, and the caller's own abort — each of those would fail the same way again and
 * be billed again.
 */
export async function runTask<Raw, Result>(
  context: RunContext,
  spec: TaskSpec<Raw, Result>,
  options: AtsAiCallOptions,
): Promise<AtsAiResult<Result>> {
  const route = resolveRoute(context, spec.task, options);
  const system = route.system ?? context.prompts[spec.task] ?? spec.defaultPrompt;
  const promptVersion = `${system === spec.defaultPrompt ? "default" : "custom"}:${fnv1a(system)}`;
  const request = {
    model: route.model,
    system,
    messages: [{ role: "user" as const, content: spec.user }],
    maxTokens: route.maxTokens,
    temperature: route.temperature,
    output: {
      name: spec.outputName,
      schema: spec.jsonSchema,
      mode: route.structuredOutputs ? ("json_schema" as const) : ("json_object" as const),
    },
    extraBody: route.providerOptions,
    signal: options.signal,
  };

  const total: LlmUsage = { inputTokens: 0, outputTokens: 0 };
  let reported = false;
  const usage = () => (reported ? { ...total } : undefined);
  for (let attempt = 1; ; attempt += 1) {
    let raw: Raw;
    let response: LlmResponse;
    try {
      response = await context.provider.complete(request);
      if (response.usage) {
        reported = true;
        for (const key of Object.keys(response.usage) as Array<keyof LlmUsage>)
          total[key] = (total[key] ?? 0) + (response.usage[key] ?? 0);
      }
      raw = readReply(response, spec.schema);
    } catch (thrown) {
      const { error, retryable } = classify(thrown, options.signal);
      if (retryable && attempt <= route.retries) {
        context.onRetry?.({ task: spec.task, attempt, error });
        continue;
      }
      throw new AtsAiError(error.code, error.message, {
        status: error.status,
        usage: usage(),
        attempts: attempt,
        cause: error.cause,
      });
    }

    const { result, rejected } = spec.finish(raw);
    return {
      result,
      rejected,
      usage: usage(),
      attempts: attempt,
      responseId: response.id,
      model: route.model,
      promptVersion,
    };
  }
}
