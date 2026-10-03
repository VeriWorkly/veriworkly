import { describe, expect, it } from "vitest";

import { AtsPolicyError, DEFAULT_POLICY, parseAtsPolicy, policyFingerprint } from "../src/index.js";

describe("policy audit 2026-10-03", () => {
  it("fingerprints the policy's current content after mutation", () => {
    const policy = parseAtsPolicy(DEFAULT_POLICY);
    const before = policyFingerprint(policy);

    policy.version = "mutated";

    expect(policyFingerprint(policy)).not.toBe(before);
  });

  it.each([
    [
      "unordered thresholds",
      [
        { upTo: 500, weight: 0 },
        { upTo: 100, weight: 10 },
        { upTo: null, weight: 20 },
      ],
    ],
    [
      "a nonterminal null threshold",
      [
        { upTo: 100, weight: 10 },
        { upTo: null, weight: 0 },
        { upTo: 500, weight: 20 },
      ],
    ],
  ])("rejects %s", (_, bands) => {
    const rule = DEFAULT_POLICY.rules.find((candidate) => candidate.kind === "bands");
    if (!rule || rule.kind !== "bands") throw new Error("default policy needs a bands rule");

    expect(() =>
      parseAtsPolicy({
        ...DEFAULT_POLICY,
        rules: [{ ...rule, bands }],
      }),
    ).toThrow(AtsPolicyError);
  });
});
