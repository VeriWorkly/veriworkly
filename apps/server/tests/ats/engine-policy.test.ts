import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A missing or malformed scoring policy used to produce a process that reported itself healthy
 * while every `/ats/check` returned 503 — on the free, anonymous, highest-traffic endpoint, so
 * the only way to find out was from users. These pin the boot-time refusal that replaced it,
 * and the self-validation that catches the quiet kind of policy mistake.
 */
const policyJson = vi.fn();
const nodeEnv = { value: "production" };

vi.mock("#services/aiPrivateConfig", () => ({ getAtsEnginePolicyJson: () => policyJson() }));
vi.mock("#config", () => ({
  config: {
    get nodeEnv() {
      return nodeEnv.value;
    },
  },
}));

const MINIMAL = {
  version: "ats-v2",
  rules: [
    {
      id: "test.parse.text",
      category: "parse",
      severity: "error",
      kind: "min-words",
      min: 5,
      weight: 10,
      passEvidence: "ok",
      failEvidence: "no",
      fix: "add words",
    },
  ],
  keywordMatch: {
    requiredWeight: 1.5,
    preferredWeight: 0.75,
    responsibilitiesWeight: 0.6,
    defaultWeight: 1,
    generalTermWeight: 0.35,
    sections: { required: "a", preferred: "b", responsibilities: "c", excluded: "d" },
    stopwords: [],
    synonyms: {},
    implies: {},
    phrases: [],
    buzzwords: [],
  },
  resumeParse: {
    sections: { experience: "a", education: "b", skills: "c", projects: "d", other: "e" },
    titleWords: ["engineer"],
    schoolWords: ["university"],
    degrees: { diploma: "a", associate: "b", bachelor: "c", master: "d", doctorate: "e" },
  },
};

async function load() {
  vi.resetModules();
  return import("../../src/services/ats/enginePolicy");
}

describe("ATS engine policy — failing at boot rather than per request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nodeEnv.value = "production";
  });

  it("accepts a well-formed policy", async () => {
    policyJson.mockReturnValue(MINIMAL);
    const { validateAtsEngineRuntimeConfig } = await load();

    expect(() => validateAtsEngineRuntimeConfig()).not.toThrow();
  });

  it("refuses to start in production when the policy is malformed", async () => {
    policyJson.mockReturnValue({ ...MINIMAL, rules: [{ id: "broken" }] });
    const { validateAtsEngineRuntimeConfig } = await load();

    expect(() => validateAtsEngineRuntimeConfig()).toThrow(/policy is invalid/);
  });

  it("refuses to start when the policy is missing entirely", async () => {
    policyJson.mockImplementation(() => {
      throw new Error("ATS engine policy is not configured.");
    });
    const { validateAtsEngineRuntimeConfig } = await load();

    expect(() => validateAtsEngineRuntimeConfig()).toThrow();
  });

  it("stays out of the way outside production, where the policy is often absent", async () => {
    nodeEnv.value = "development";
    policyJson.mockImplementation(() => {
      throw new Error("not configured");
    });
    const { validateAtsEngineRuntimeConfig } = await load();

    expect(() => validateAtsEngineRuntimeConfig()).not.toThrow();
  });

  /**
   * A multi-word term only becomes a single token by matching the phrase list first, so one
   * referenced by `implies` or `synonyms` but absent from `phrases` silently never resolves.
   * This kind of mistake scores wrong rather than erroring, which is why it is caught at load.
   */
  it("rejects a multi-word term that could never match", async () => {
    policyJson.mockReturnValue({
      ...MINIMAL,
      keywordMatch: {
        ...MINIMAL.keywordMatch,
        implies: { terraform: ["infrastructure as code"] },
        phrases: [],
      },
    });
    const { validateAtsEngineRuntimeConfig } = await load();

    expect(() => validateAtsEngineRuntimeConfig()).toThrow(/policy is invalid/);
  });

  it("accepts the same policy once the term is registered", async () => {
    policyJson.mockReturnValue({
      ...MINIMAL,
      keywordMatch: {
        ...MINIMAL.keywordMatch,
        implies: { terraform: ["infrastructure as code"] },
        phrases: ["infrastructure as code"],
      },
    });
    const { validateAtsEngineRuntimeConfig } = await load();

    expect(() => validateAtsEngineRuntimeConfig()).not.toThrow();
  });
});
