import { canonicalJson, fnv1a } from "../util/hash.js";
import type { AtsEnginePolicy } from "./schema.js";

/**
 * Names the exact policy a report was scored with: its declared version and a hash of its
 * content. Two reports carrying the same fingerprint and engine version, for the same input and
 * reference date, are identical — that is the determinism guarantee, and the fingerprint is how a
 * changed score is traced to a changed policy rather than to the resume.
 *
 * Taken of the policy as applied, after locale packs, so a resume read as German says so here
 * too. Not memoised: a policy object can be changed after it is parsed, and a cached hash would
 * then name a policy that no longer exists. Hashing costs well under a millisecond.
 *
 * The attached packs themselves are left out: what a pack contributes to a report is already in
 * the vocabulary and rules it was merged into, so packs that never applied, or the order they
 * were attached in, would otherwise give one applied policy several fingerprints.
 */
export function policyFingerprint(policy: AtsEnginePolicy): string {
  const { locales: _attached, ...applied } = policy;
  return `${policy.version}+${fnv1a(canonicalJson(applied))}`;
}
