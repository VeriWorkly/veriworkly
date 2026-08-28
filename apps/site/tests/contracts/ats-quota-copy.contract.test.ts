import { afterEach, describe, expect, it, vi } from "vitest";

import { allowanceCopy, resetCopy } from "@/features/ats-checker/services";
import type { AtsQuota } from "@/features/ats-checker/types";

function quotaFor(tier: AtsQuota["tier"], limit: number): AtsQuota {
  return {
    tier,
    limit,
    used: 0,
    remaining: limit,

    resetsAt: new Date().toISOString(),
    canConvertResume: tier === "subscriber",

    pricing: {
      analysisCredits: { min: 5, max: 25 },
      jobUrlAnalysisCredits: { min: 10, max: 50 },
      resumeConversionCredits: 20,
    },

    extract: { limit: 6, used: 0, remaining: 6 },
  };
}

function inHours(hours: number) {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ATS quota reset copy", () => {
  /**
   * The window differs per tier (48h anonymous, 24h free, billing period on a paid plan), which
   * is why this has to be derived from `resetsAt`. A hard-coded "resets in a couple of days" was
   * wrong for two of the three tiers.
   */

  it("scales the unit with the distance to the reset", () => {
    expect(resetCopy(inHours(0.25))).toBe("in 15 minutes");
    expect(resetCopy(inHours(5))).toBe("in 5 hours");
    expect(resetCopy(inHours(47))).toBe("in 2 days");
  });

  it("singularises rather than saying '1 hours'", () => {
    expect(resetCopy(inHours(1))).toBe("in 1 hour");
    expect(resetCopy(inHours(24))).toBe("in 1 day");
    expect(resetCopy(new Date(Date.now() + 61_000).toISOString())).toBe("in 1 minute");
  });

  it("never renders a negative countdown for a reset that has already passed", () => {
    expect(resetCopy(inHours(-5))).toBe("in under a minute");
  });

  it("degrades to a vague word instead of 'Invalid Date' on an unparseable timestamp", () => {
    expect(resetCopy("not-a-timestamp")).toBe("soon");
    expect(resetCopy("")).toBe("soon");
  });
});

describe("ATS allowance copy", () => {
  it("names the real window for each tier", () => {
    expect(allowanceCopy(quotaFor("anonymous", 1))).toBe("1 scan every 48 hours");
    expect(allowanceCopy(quotaFor("free", 2))).toBe("2 scans a day");
    expect(allowanceCopy(quotaFor("subscriber", 300))).toBe("300 scans this billing period");
  });
});
