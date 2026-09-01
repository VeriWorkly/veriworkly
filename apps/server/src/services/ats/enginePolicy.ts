import { AtsPolicyError, parseAtsPolicy } from "@veriworkly/ats-engine";
import type { AtsEnginePolicy } from "@veriworkly/ats-engine";

import { config } from "#config";
import { getAtsEnginePolicyJson } from "#services/aiPrivateConfig";
import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";

export type { AtsEnginePolicy, AtsEngineRule } from "@veriworkly/ats-engine";

/**
 * The host half of the policy contract.
 *
 * The schema and the validation live in `@veriworkly/ats-engine`, which is a library and so
 * cannot know what an HTTP status code is or where this process keeps its logs. Everything that
 * *is* host-specific stays here: reading the JSON from env or disk, caching it for the life of
 * the process, deciding that an invalid policy is a 503, and writing the offending fields to the
 * log. The engine raises a typed `AtsPolicyError`; the translation happens below.
 */
let cached: AtsEnginePolicy | null = null;

/**
 * Fails the boot rather than the request.
 *
 * The AI policy has always been checked at startup; the scoring policy was not. A missing or
 * malformed engine policy therefore produced a process that reported itself healthy while every
 * `/ats/check` — the free, anonymous, highest-traffic endpoint — returned 503. Nobody finds that
 * out except from users. Validating here turns a silent production outage into a refusal to
 * start, with the offending field named in the log above.
 */
export function validateAtsEngineRuntimeConfig() {
  if (config.nodeEnv === "production") getAtsEnginePolicy();
}

export function getAtsEnginePolicy(): AtsEnginePolicy {
  if (cached) return cached;

  try {
    cached = parseAtsPolicy(getAtsEnginePolicyJson());
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // The policy is operator-supplied and never reaches a caller, so the specific field that
    // failed belongs in the log. Without it a typo in one rule surfaces only as an opaque 503,
    // which is a miserable thing to debug against a file the process cannot show you.
    if (error instanceof AtsPolicyError)
      logger.error("ATS engine policy failed validation", {
        issues: error.issues.map((issue) => `${issue.path}: ${issue.message}`).slice(0, 10),
      });
    throw new ApiError(503, "AI ATS engine policy is invalid.");
  }
  return cached;
}

/** Drops the memoised policy. Tests only — the process otherwise holds one for its lifetime. */
export function resetAtsEnginePolicyForTests() {
  cached = null;
}
