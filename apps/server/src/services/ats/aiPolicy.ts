import { z } from "zod";

import { config } from "#config";
import { getAtsAiPolicyJson, resolvePrivateAiModel } from "#services/aiPrivateConfig";
import { ApiError } from "#lib/errors";

const modelSchema = z.object({
  model: z.string().min(1),
  tiers: z.array(z.enum(["standard", "detailed", "advanced", "expert"])).min(1),
  inputUsdPerMillion: z.number().nonnegative(),
  outputUsdPerMillion: z.number().nonnegative(),
  maxOutputTokens: z.number().int().positive().max(16_000),
  retries: z.number().int().min(0).max(2).default(0),
  feeMultiplier: z.number().min(1).max(2).default(1.06),
  /**
   * Policy-driven like every other model knob. It was previously hardcoded at the call site,
   * which made it the one parameter that needed a deploy to change while `resumeConversion`
   * next door read its own from here.
   */
  temperature: z.number().min(0).max(2).default(0.2),
  /**
   * Opt in to `response_format: json_schema` for this model.
   *
   * Off by default, and deliberately per-model rather than global. Structured outputs are the
   * better mode — JSON mode guarantees only that the body parses, not that it matches the
   * shape, so a schema violation costs a whole retry — but support is a property of the
   * model *and* the serving provider, and an endpoint that lacks it rejects the request
   * outright instead of degrading to JSON mode. Model IDs here resolve from deployment
   * secrets, so whether any given one supports it is not knowable from this repo: it has to
   * be a per-model switch someone flips after checking that model's providers.
   */
  structuredOutputs: z.boolean().default(false),
  providerOptions: z.record(z.unknown()).optional(),
});

const generationSchema = z.object({
  credits: z.number().int().positive(),
  model: z.string().min(1),
  maxOutputTokens: z.number().int().positive().max(16_000),
  temperature: z.number().min(0).max(2).default(0.2),
  /** See `modelSchema.structuredOutputs`. Same switch, same reason to default it off. */
  structuredOutputs: z.boolean().default(false),
  providerOptions: z.record(z.unknown()).optional(),
});

const atsPolicySchema = z.object({
  prompts: z.object({
    standardAnalysis: z.string().min(1),
    onlineAnalysis: z.string().min(1),
    resumeConversion: z.string().min(1),
  }),
  pricing: z.object({
    creditRevenueUsd: z.number().positive(),
    analysisBuckets: z.array(z.number().int().positive()).min(1),
    onlineMultiplier: z.number().int().positive(),
  }),
  models: z.array(modelSchema).min(1),
  resumeConversion: generationSchema,
  /**
   * The AI parse-repair route. Optional: a deployment that has not configured one simply does
   * not offer repair, and `AtsRepairService` returns no repair rather than failing the scan.
   * The deterministic parse is what the user came for and it has already succeeded or failed
   * on its own terms by this point.
   */
  parseRepair: generationSchema.optional(),
});

export type AtsComplexity = "standard" | "detailed" | "advanced" | "expert";
let cached: z.infer<typeof atsPolicySchema> | null = null;

import { logger } from "#lib/logger";

function loadAtsAiPolicy() {
  if (!cached) {
    try {
      cached = atsPolicySchema.parse(getAtsAiPolicyJson());
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof z.ZodError) {
        logger.error("ATS AI policy failed validation", {
          issues: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).slice(0, 10),
        });
      }
      throw new ApiError(503, `AI ATS policy is invalid: ${(error as Error).message}`);
    }
  }
  return cached;
}

export function getAtsAiPolicy() {
  const policy = loadAtsAiPolicy();
  return {
    ...policy,
    models: policy.models.map((item) => ({ ...item, model: resolvePrivateAiModel(item.model) })),
    resumeConversion: {
      ...policy.resumeConversion,
      model: resolvePrivateAiModel(policy.resumeConversion.model),
    },
  };
}

export function publicAtsPolicy() {
  const policy = loadAtsAiPolicy();
  const analysis = [...policy.pricing.analysisBuckets].sort((a, b) => a - b);

  return {
    analysisCredits: { min: analysis[0], max: analysis.at(-1) ?? analysis[0] },
    jobUrlAnalysisCredits: {
      min: analysis[0] * policy.pricing.onlineMultiplier,
      max: (analysis.at(-1) ?? analysis[0]) * policy.pricing.onlineMultiplier,
    },
    resumeConversionCredits: policy.resumeConversion.credits,
  };
}

export function validateAtsAiRuntimeConfig() {
  if (config.nodeEnv === "production") getAtsAiPolicy();
}
