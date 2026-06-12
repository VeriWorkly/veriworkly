import { readFileSync } from "node:fs";

import { z } from "zod";

import { config } from "#config";
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

const atsPolicySchema = z.object({
  ats: z.object({
    systemPrompt: z.string().min(1),
    models: z.array(modelSchema).min(1),
  }),
});

export type AtsComplexity = "standard" | "detailed" | "advanced" | "expert";
let cached: z.infer<typeof atsPolicySchema>["ats"] | null = null;

function source() {
  if (config.ai.privateConfigJson) return config.ai.privateConfigJson;
  if (config.ai.privateConfigPath) return readFileSync(config.ai.privateConfigPath, "utf8");
  throw new ApiError(503, "AI ATS analysis is not configured.");
}

function resolveModel(model: string) {
  const match = model.match(/^env:([A-Z0-9_]+)$/);
  if (!match) return model;
  const resolved = process.env[match[1]];
  if (!resolved) throw new ApiError(503, "AI ATS model routing is not configured.");
  return resolved;
}

export function getAtsAiPolicy() {
  if (!cached) {
    try {
      cached = atsPolicySchema.parse(JSON.parse(source())).ats;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, "AI ATS policy is invalid.");
    }
  }
  return { ...cached, models: cached.models.map((item) => ({ ...item, model: resolveModel(item.model) })) };
}

export function resetAtsAiPolicyForTests() {
  cached = null;
}

export function validateAtsAiRuntimeConfig() {
  if (config.nodeEnv === "production") getAtsAiPolicy();
}
