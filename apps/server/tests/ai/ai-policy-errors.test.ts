import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * V-184: an AI policy that fails to load answers a generic 503. The zod issues, a JSON parse
 * error or the name of a missing action are configuration details for the operator: they go to
 * the server log, never into the message the client shows in a toast.
 */

const policyJson = vi.fn<() => unknown>();
const atsPolicyJson = vi.fn<() => unknown>();
const loggerError = vi.fn();

vi.mock("#config", () => ({ config: { ai: { apiKey: "test" } }, isProduction: false }));
vi.mock("#services/aiPrivateConfig", () => ({
  getAiActionsPolicyJson: () => policyJson(),
  getAtsAiPolicyJson: () => atsPolicyJson(),
  resolvePrivateAiModel: (model: string) => model,
}));
vi.mock("#lib/logger", () => ({
  logger: { error: loggerError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const GENERIC = "AI generation is unavailable right now. Please try again later.";

async function loadFresh() {
  vi.resetModules();
  return import("../../src/services/aiPolicy.js");
}

describe("AI actions policy errors (V-184)", () => {
  beforeEach(() => {
    policyJson.mockReset();
    loggerError.mockReset();
  });

  it("keeps zod issues out of the client message and logs them", async () => {
    policyJson.mockReturnValue({ rewrite_short_text: { maxTextChars: "lots" } });
    const { getAiActionPolicy } = await loadFresh();

    let thrown: unknown;
    try {
      getAiActionPolicy("rewrite_short_text");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({ statusCode: 503, message: GENERIC });
    expect(loggerError).toHaveBeenCalledWith(
      "AI actions policy failed validation",
      expect.objectContaining({ issues: expect.any(Array) }),
    );
  });

  it("keeps a JSON parse error out of the client message and logs it", async () => {
    policyJson.mockImplementation(() => {
      throw new SyntaxError("Unexpected token } in JSON at position 42");
    });
    const { publicAiActionPolicy } = await loadFresh();

    expect(() => publicAiActionPolicy()).toThrow(GENERIC);
    expect(loggerError).toHaveBeenCalledWith(
      "AI actions policy could not be loaded",
      expect.objectContaining({ error: expect.stringContaining("Unexpected token") }),
    );
  });

  it("does not pass the loader's file path through for the ATS policy either", async () => {
    vi.resetModules();
    // The same ApiError class the policy module sees, as the real loader throws it.
    const { ApiError } = await import("../../src/lib/errors.js");
    atsPolicyJson.mockImplementation(() => {
      throw new ApiError(503, 'ATS AI policy file was not found at "/srv/private/ats.json".');
    });
    const { publicAtsPolicy } = await import("../../src/services/ats/aiPolicy.js");

    expect(() => publicAtsPolicy()).toThrow("AI ATS policy is invalid.");
    expect(loggerError).toHaveBeenCalledWith(
      "ATS AI policy could not be loaded",
      expect.objectContaining({ error: expect.stringContaining("/srv/private") }),
    );
  });

  it("does not name a missing action to the client", async () => {
    policyJson.mockReturnValue({});
    const { getAiActionPolicy } = await loadFresh();

    expect(() => getAiActionPolicy("rewrite_short_text")).toThrow(GENERIC);
    expect(loggerError).toHaveBeenCalledWith(
      "AI actions policy could not be loaded",
      expect.objectContaining({ error: expect.stringContaining("missing action") }),
    );
  });
});
