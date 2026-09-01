import { z } from "zod";

import { AtsPolicyError } from "./errors.js";
import { atsEngineSchema, type AtsEnginePolicy } from "./schema.js";

/**
 * Validates a policy and returns it, or throws `AtsPolicyError`.
 *
 * Pure by design. The previous implementation memoised the parsed policy in a module-level
 * variable, which made the engine's behaviour depend on whether some earlier caller had already
 * loaded it — awkward to test and surprising to consume. Caching a policy is a host concern
 * (it knows where the JSON comes from and when it changes), so the cache stayed in the server
 * and this function does exactly what its signature says.
 */
export function parseAtsPolicy(json: unknown): AtsEnginePolicy {
  const result = atsEngineSchema.safeParse(json);
  if (result.success) return result.data;

  throw new AtsPolicyError(
    "ATS engine policy is invalid.",
    result.error.issues.map((issue: z.ZodIssue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  );
}
