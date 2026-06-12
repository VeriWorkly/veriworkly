import { readFileSync } from "node:fs";

import { z } from "zod";

import { config } from "#config";
import { AI_ACTION_KEYS, type AiActionKey, type AiMode } from "#services/aiTypes";
import { ApiError } from "#utils/errors";

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

const policySchema = z.object({
  actions: z.record(z.enum(AI_ACTION_KEYS), actionPolicySchema),
});

export type AiActionPolicy = z.infer<typeof actionPolicySchema>;

let cachedPolicy: z.infer<typeof policySchema> | null = null;

function readPolicySource() {
  if (config.ai.privateConfigJson) return config.ai.privateConfigJson;
  if (config.ai.privateConfigPath) return readFileSync(config.ai.privateConfigPath, "utf8");
  throw new ApiError(503, "AI generation is not configured.");
}

function loadPolicy() {
  if (cachedPolicy) return cachedPolicy;

  try {
    cachedPolicy = policySchema.parse(JSON.parse(readPolicySource()));
    for (const action of AI_ACTION_KEYS) {
      if (!cachedPolicy.actions[action])
        throw new ApiError(503, `AI policy is missing action: ${action}.`);
    }
    return cachedPolicy;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, "AI generation policy is invalid.");
  }
}

export function getAiActionPolicy(action: AiActionKey) {
  const policy = loadPolicy().actions[action];
  if (!policy) throw new ApiError(400, "Unsupported AI action.");
  return policy;
}

export function getAiModePolicy(action: AiActionKey, mode: AiMode) {
  const policy = getAiActionPolicy(action)[mode];
  const envMatch = policy.model.match(/^env:([A-Z0-9_]+)$/);
  if (!envMatch) return policy;

  const model = process.env[envMatch[1]];
  if (!model) throw new ApiError(503, "AI model routing is not configured.");
  return { ...policy, model };
}

export function publicAiActionPolicy() {
  const policy = loadPolicy();

  return Object.fromEntries(
    AI_ACTION_KEYS.map((action) => {
      const item = policy.actions[action];
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

export function resetAiPolicyForTests() {
  cachedPolicy = null;
}

export function validateAiRuntimeConfig() {
  if (config.nodeEnv !== "production") return;
  if (!config.ai.apiKey) throw new Error("AI provider credentials must be configured in production.");
  loadPolicy();
  for (const action of AI_ACTION_KEYS) {
    getAiModePolicy(action, "standard");
    getAiModePolicy(action, "expert");
  }
}
