/**
 * @veriworkly/ats-engine/ai — the model-backed tasks, with any provider.
 *
 * Bring a provider (`/ai/openai-compatible`, `/ai/anthropic`, or your own `LlmProvider`) and a
 * model per task; override prompts if you like. Each task returns its result with token usage,
 * attempts and the prompt version, so the host can bill and audit — the package never touches
 * credits or quotas itself.
 *
 * What a model returns is never trusted as-is: output is schema-validated, and every value that
 * claims to come from the input is checked against it (see each task).
 */

import { DEFAULT_POLICY } from "../policy/default.js";
import type { AtsEnginePolicy } from "../policy/schema.js";
import type { AtsParsedResume } from "../types.js";
import type { LlmProvider } from "./provider.js";
import {
  runTask,
  type AtsAiCallOptions,
  type AtsAiResult,
  type AtsAiRetryEvent,
  type AtsAiTask,
  type TaskRoute,
} from "./run.js";
import { analyzeSpec, type AnalyzeInput, type AtsAiInsights } from "./tasks/analyze.js";
import {
  convertResumeSpec,
  type AtsConvertedResume,
  type ConvertResumeInput,
} from "./tasks/convertResume.js";
import { repairParseSpec, type RepairParseInput } from "./tasks/repairParse.js";

export type AtsAiOptions = {
  provider: LlmProvider;
  /** Default model and settings per task. Each call can override any of them. */
  routes?: Partial<Record<AtsAiTask, Partial<TaskRoute>>>;
  /** System prompt overrides per task. */
  prompts?: Partial<Record<AtsAiTask, string>>;
  /**
   * Contact-detail redaction per task. Defaults to on for `analyze`, which does not need to
   * know who the candidate is. `repairParse` and `convertResume` exist to recover those details
   * and ignore this setting.
   */
  redact?: { analyze?: boolean };
  /** Engine policy used to classify repaired credentials. Defaults to `DEFAULT_POLICY`. */
  enginePolicy?: AtsEnginePolicy;
  hooks?: { onRetry?(event: AtsAiRetryEvent): void };
};

export type AtsAi = {
  /** Plain-language explanation and recommendations for a deterministic report. */
  analyze(input: AnalyzeInput, options?: AtsAiCallOptions): Promise<AtsAiResult<AtsAiInsights>>;
  /** Fills the gaps in a failed parse with values grounded in the source. */
  repairParse(
    input: RepairParseInput,
    options?: AtsAiCallOptions,
  ): Promise<AtsAiResult<AtsParsedResume>>;
  /** Converts free text into a structured resume. */
  convertResume(
    input: ConvertResumeInput,
    options?: AtsAiCallOptions,
  ): Promise<AtsAiResult<AtsConvertedResume>>;
};

export function createAtsAi(options: AtsAiOptions): AtsAi {
  const context = {
    provider: options.provider,
    routes: options.routes ?? {},
    prompts: options.prompts ?? {},
    onRetry: options.hooks?.onRetry,
  };
  const redactAnalysis = options.redact?.analyze ?? true;
  const enginePolicy = options.enginePolicy ?? DEFAULT_POLICY;

  return {
    analyze: (input, call = {}) => runTask(context, analyzeSpec(input, redactAnalysis), call),
    repairParse: (input, call = {}) => runTask(context, repairParseSpec(input, enginePolicy), call),
    convertResume: (input, call = {}) => runTask(context, convertResumeSpec(input), call),
  };
}

export {
  AtsAiError,
  type AtsAiCallOptions,
  type AtsAiErrorCode,
  type AtsAiResult,
  type AtsAiRetryEvent,
  type AtsAiTask,
  type TaskRoute,
} from "./run.js";
export {
  LlmProviderError,
  type LlmMessage,
  type LlmOutputFormat,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
  type LlmUsage,
} from "./provider.js";
export type { AbortSignalLike, FetchLike, FetchResponseLike, HttpOptions } from "./http.js";
export { DEFAULT_ANALYZE_PROMPT, type AnalyzeInput, type AtsAiInsights } from "./tasks/analyze.js";
export { DEFAULT_REPAIR_PROMPT, type RepairParseInput } from "./tasks/repairParse.js";
export {
  CONVERT_GROUNDING_SKIP,
  DEFAULT_CONVERT_PROMPT,
  type AtsConvertedResume,
  type ConvertResumeInput,
} from "./tasks/convertResume.js";
