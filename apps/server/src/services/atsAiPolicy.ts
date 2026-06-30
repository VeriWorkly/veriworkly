import { z } from "zod";

import { config } from "#config";
import {
  getPrivateAiConfig,
  resetPrivateAiConfigForTests,
  resolvePrivateAiModel,
} from "#services/aiPrivateConfig";
import { ApiError } from "#utils/errors";

const modelSchema = z.object({
  model: z.string().min(1),
  tiers: z.array(z.enum(["standard", "detailed", "advanced", "expert"])).min(1),
  inputUsdPerMillion: z.number().nonnegative(),
  outputUsdPerMillion: z.number().nonnegative(),
  maxOutputTokens: z.number().int().positive().max(16_000),
  retries: z.number().int().min(0).max(2).default(0),
  feeMultiplier: z.number().min(1).max(2).default(1.06),
  providerOptions: z.record(z.unknown()).optional(),
});

const generationSchema = z.object({
  credits: z.number().int().positive(),
  model: z.string().min(1),
  maxOutputTokens: z.number().int().positive().max(16_000),
  temperature: z.number().min(0).max(2).default(0.2),
  providerOptions: z.record(z.unknown()).optional(),
});

const atsPolicySchema = z.object({
  ats: z.object({
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
  }),
});

export type AtsComplexity = "standard" | "detailed" | "advanced" | "expert";
let cached: z.infer<typeof atsPolicySchema>["ats"] | null = null;

function loadAtsAiPolicy() {
  if (!cached) {
    try {
      cached = atsPolicySchema.parse(getPrivateAiConfig()).ats;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, "AI ATS policy is invalid.");
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

export function resetAtsAiPolicyForTests() {
  cached = null;
  resetPrivateAiConfigForTests();
}

export function validateAtsAiRuntimeConfig() {
  if (config.nodeEnv === "production") getAtsAiPolicy();
}
