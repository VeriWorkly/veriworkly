import type OpenAI from "openai";

/**
 * JSON Schemas for the two AI responses, and the `response_format` that carries them.
 *
 * These mirror `insightsSchema` and `convertedResumeSchema` in `./ai.ts`. They are written out
 * by hand rather than generated: the Zod schemas describe what we will *accept* (every field
 * nullable and optional, so a model that omits half its output still parses into empty strings),
 * while these describe what we *ask for*, and strict structured outputs cannot express the
 * former — `strict: true` requires every property to appear in `required` and forbids
 * `additionalProperties`. Nullability carries the optionality instead, which is the shape
 * OpenAI's strict subset supports.
 *
 * `tests/ats/ai-response-format.test.ts` fails if the two drift apart, so the duplication is
 * checked rather than trusted.
 */

/** In strict mode every key must be listed in `required`; optionality is expressed by `null`. */
const nullableString = { type: ["string", "null"] } as const;
const nullableBoolean = { type: ["boolean", "null"] } as const;
const nullableStringArray = {
  type: ["array", "null"],
  items: { type: "string" },
} as const;

function object<T extends Record<string, unknown>>(properties: T) {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  } as const;
}

function arrayOf(items: unknown) {
  return { type: ["array", "null"], items } as const;
}

export const INSIGHTS_JSON_SCHEMA = object({
  explanation: nullableString,
  missingEvidence: nullableStringArray,
  keywordOpportunities: nullableStringArray,
  recommendedImprovements: nullableStringArray,
  priorityOrder: nullableStringArray,
});

export const CONVERTED_RESUME_JSON_SCHEMA = object({
  basics: object({
    fullName: nullableString,
    role: nullableString,
    headline: nullableString,
    email: nullableString,
    phone: nullableString,
    location: nullableString,
  }),
  links: arrayOf(object({ label: nullableString, url: nullableString })),
  summary: nullableString,
  experience: arrayOf(
    object({
      company: nullableString,
      role: nullableString,
      location: nullableString,
      startDate: nullableString,
      endDate: nullableString,
      current: nullableBoolean,
      summary: nullableString,
      highlights: nullableStringArray,
    }),
  ),
  education: arrayOf(
    object({
      school: nullableString,
      degree: nullableString,
      field: nullableString,
      startDate: nullableString,
      endDate: nullableString,
      current: nullableBoolean,
      summary: nullableString,
    }),
  ),
  projects: arrayOf(
    object({
      name: nullableString,
      role: nullableString,
      link: nullableString,
      summary: nullableString,
      highlights: nullableStringArray,
      skills: nullableStringArray,
    }),
  ),
  skills: arrayOf(object({ name: nullableString, keywords: nullableStringArray })),
});

/**
 * `json_schema` when the model is known to support it, `json_object` otherwise.
 *
 * Structured outputs are the mode to prefer — JSON mode guarantees only that the body parses,
 * so every shape violation costs a full retry that this avoids. But we route through a gateway
 * where support belongs to the model *and* the provider serving it, and an endpoint without it
 * fails the request rather than falling back. So the caller passes the per-model policy flag,
 * and models that have not been checked keep the mode that works everywhere.
 *
 * `require_parameters` pins routing to providers that honour the schema. Without it the gateway
 * may route to one that ignores `response_format` and returns prose, which is the failure the
 * schema was meant to remove. It is merged under any policy-supplied `provider` options so a
 * deployment can still pin its own routing.
 */
export function jsonResponseFormat(
  structuredOutputs: boolean,
  name: string,
  schema: unknown,
): OpenAI.Chat.Completions.ChatCompletionCreateParams["response_format"] {
  if (!structuredOutputs) return { type: "json_object" };
  return {
    type: "json_schema",
    json_schema: { name, strict: true, schema: schema as Record<string, unknown> },
  };
}

/** Provider routing that must accompany a `json_schema` request. See `jsonResponseFormat`. */
export function providerRouting(
  structuredOutputs: boolean,
  providerOptions: Record<string, unknown> | undefined,
) {
  if (!structuredOutputs) return providerOptions ?? {};
  const existing = (providerOptions?.provider as Record<string, unknown> | undefined) ?? {};
  return {
    ...providerOptions,
    provider: { require_parameters: true, ...existing },
  };
}
