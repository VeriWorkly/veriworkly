import { normalizeText } from "../text/text.js";
import { AtsPolicyError } from "./errors.js";
import { atsEngineSchema, type AtsEnginePolicy } from "./schema.js";

/**
 * Every string in the policy in the form resume text is normalised to (`normalizeText`), so a
 * word written with a precomposed character — Hindi "ज़" — matches the decomposed text it will
 * be compared with. Object keys too: month names are keys.
 */
function normalizeStrings(value: unknown): unknown {
  if (typeof value === "string") return normalizeText(value);
  if (Array.isArray(value)) return value.map(normalizeStrings);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [normalizeText(key), normalizeStrings(item)]),
    );
  return value;
}

/**
 * Validates a policy and returns it, or throws `AtsPolicyError`.
 *
 * Pure by design. Caching a policy is a host concern — the host knows where the JSON comes from
 * and when it changes — so this function does exactly what its signature says and nothing more.
 */
export function parseAtsPolicy(json: unknown): AtsEnginePolicy {
  const result = atsEngineSchema.safeParse(normalizeStrings(json));
  if (result.success) return result.data;

  throw new AtsPolicyError(
    "ATS engine policy is invalid.",
    result.error.issues.map((issue) => ({
      path: issue.path.map(String).join("."),
      message: issue.message,
    })),
  );
}
