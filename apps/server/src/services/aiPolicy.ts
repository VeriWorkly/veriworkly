import { z } from "zod";

import { config } from "#config";
import { getAiActionsPolicyJson, resolvePrivateAiModel } from "#services/aiPrivateConfig";
import { AI_ACTION_KEYS, type AiActionKey, type AiMode } from "#services/aiTypes";
import { ApiError } from "#lib/errors";

const modePolicySchema = z.object({
  credits: z.number().int().positive(),
  model: z.string().min(1),
  maxOutputTokens: z.number().int().positive().max(32_768),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  providerOptions: z.record(z.unknown()).optional(),
});

const actionPolicySchema = z.object({
  maxTextChars: z.number().int().positive().max(50_000),
  maxContextChars: z.number().int().nonnegative().max(50_000),
  maxJobDescriptionChars: z.number().int().nonnegative().max(20_000),
  systemPrompt: z.string().min(1),
  userPromptTemplate: z.string().min(1),
  standard: modePolicySchema,
  expert: modePolicySchema,
});

const policySchema = z.record(z.enum(AI_ACTION_KEYS), actionPolicySchema);

export type AiActionPolicy = z.infer<typeof actionPolicySchema>;

import { logger } from "#lib/logger";

let cachedPolicy: z.infer<typeof policySchema> | null = null;

function loadPolicy() {
  if (cachedPolicy) return cachedPolicy;

  try {
    cachedPolicy = policySchema.parse(getAiActionsPolicyJson());
    for (const action of AI_ACTION_KEYS) {
      if (!cachedPolicy[action]) throw new ApiError(503, `AI policy is missing action: ${action}.`);
    }
    return cachedPolicy;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof z.ZodError) {
      logger.error("AI actions policy failed validation", {
        issues: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).slice(0, 10),
      });
    }
    throw new ApiError(503, `AI generation policy is invalid: ${(error as Error).message}`);
  }
}

export function getAiActionPolicy(action: AiActionKey) {
  const policy = loadPolicy()[action];
  if (!policy) throw new ApiError(400, "Unsupported AI action.");
  return policy;
}

export function getAiModePolicy(action: AiActionKey, mode: AiMode) {
  const policy = getAiActionPolicy(action)[mode];
  return { ...policy, model: resolvePrivateAiModel(policy.model) };
}

export function publicAiActionPolicy() {
  const policy = loadPolicy();

  return Object.fromEntries(
    AI_ACTION_KEYS.map((action) => {
      const item = policy[action];
      if (!item) throw new ApiError(503, `AI policy is missing action: ${action}.`);
      return [
        action,
        {
          costs: { standard: item.standard.credits, expert: item.expert.credits },
        },
      ];
    }),
  );
}

export function validateAiRuntimeConfig() {
  if (config.nodeEnv !== "production") return;
  if (!config.ai.apiKey)
    throw new Error("AI provider credentials must be configured in production.");
  loadPolicy();
  for (const action of AI_ACTION_KEYS) {
    getAiModePolicy(action, "standard");
    getAiModePolicy(action, "expert");
  }
}
