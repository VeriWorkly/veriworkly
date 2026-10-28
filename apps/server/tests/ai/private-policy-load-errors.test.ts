import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * V-329: the ATS engine policy loader, like the two AI policy loaders (V-184), answers a generic
 * 503 and keeps the file path and working directory in the log. V-330: a policy that is not valid
 * JSON is reported by position, never with V8's message, which quotes the policy text around the
 * error into the log.
 */

const loggerError = vi.fn();
const loggerWarn = vi.fn();
vi.mock("#lib/logger", () => ({
  logger: { error: loggerError, warn: loggerWarn, info: vi.fn(), debug: vi.fn() },
}));

const ai = {
  actionsPolicyPath: "",
  actionsPolicyJson: "",
  atsAiPolicyPath: "",
  atsAiPolicyJson: "",
  atsEnginePolicyPath: "",
  atsEnginePolicyJson: "",
};
vi.mock("#config", () => ({ config: { ai }, isProduction: false }));

beforeEach(() => {
  vi.resetModules();
  loggerError.mockReset();
  loggerWarn.mockReset();
  for (const key of Object.keys(ai) as Array<keyof typeof ai>) ai[key] = "";
});

describe("V-329 ATS engine policy load errors", () => {
  it("answers the generic 503 and logs the loader's message, path included", async () => {
    ai.atsEnginePolicyPath = "/srv/private/missing-engine-policy.json";
    const { getAtsEnginePolicy, resetAtsEnginePolicyForTests } =
      await import("../../src/services/ats/enginePolicy.js");
    resetAtsEnginePolicyForTests();

    let thrown: unknown;
    try {
      getAtsEnginePolicy();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({ statusCode: 503, message: "AI ATS engine policy is invalid." });
    expect(JSON.stringify(thrown)).not.toContain("/srv/private");
    expect(loggerError).toHaveBeenCalledWith(
      "ATS engine policy could not be loaded",
      expect.objectContaining({ error: expect.any(String) }),
    );
    // The path is in the log, never in an error a client can see.
    expect(JSON.stringify(loggerWarn.mock.calls)).toContain("/srv/private");
  });
});

describe("V-330 a policy that is not valid JSON", () => {
  it("is reported without any of the policy's text", async () => {
    ai.actionsPolicyJson = '{"systemPrompt": You are the private reviewer}';
    const { getAiActionsPolicyJson } = await import("../../src/services/aiPrivateConfig.js");

    let thrown: unknown;
    try {
      getAiActionsPolicyJson();
    } catch (error) {
      thrown = error;
    }

    const message = (thrown as Error).message;
    expect(message).toContain("AI actions policy is invalid JSON");
    expect(message).not.toMatch(/You are|mPrompt/);
  });
});
