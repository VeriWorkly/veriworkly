import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parseAtsPolicy, type AtsEnginePolicy } from "../src/index.js";

/**
 * The real, private, gitignored scoring policy — or `null` when it is not present.
 *
 * Resolved from this file rather than the working directory, which differs depending on whether
 * a suite is run from the repo root or from the package. The path is three levels up rather than
 * the four it was in `apps/server/tests/ats`, because the suites that read it now live one
 * directory shallower.
 *
 * Suites that use this skip themselves when it is absent, so a checkout that legitimately does
 * not have the policy still runs green. `livePolicyLoadError` exists so a suite can prove it is
 * actually running rather than quietly skipping — a skip that nobody notices is how a
 * calibration suite stops catching anything.
 */
const policyPath = fileURLToPath(
  new URL("../../../.private/ats-engine-policy.dev.json", import.meta.url),
);

let policy: AtsEnginePolicy | null = null;
let loadError: string | null = null;

try {
  policy = parseAtsPolicy(JSON.parse(readFileSync(policyPath, "utf8")));
} catch (error) {
  loadError = error instanceof Error ? error.message : String(error);
}

export const livePolicy = policy;
export const livePolicyPath = policyPath;
export const livePolicyLoadError = loadError;
