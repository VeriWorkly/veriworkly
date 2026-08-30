import { describe, expect, it } from "vitest";

import { normalizeCheckResult, type WireCheckResult } from "@/features/ats-checker/services";

import type { AtsQuota, AtsRuleResult } from "@/features/ats-checker/types";

const quota: AtsQuota = {
  tier: "free",

  limit: 2,
  used: 1,
  remaining: 1,
  resetsAt: new Date().toISOString(),

  canConvertResume: false,

  pricing: {
    analysisCredits: { min: 5, max: 25 },
    jobUrlAnalysisCredits: { min: 10, max: 50 },
    resumeConversionCredits: 20,
  },

  extract: { limit: 6, used: 0, remaining: 6 },
};

const rules: AtsRuleResult[] = [
  {
    id: "ats-v2.contact.email",
    category: "contact",
    severity: "error",
    passed: true,
    evidence: "Email detected",
    scoreImpact: 0,
    fix: "Add a professional email address.",
  },

  {
    id: "ats-v2.content.metrics",
    category: "content",
    severity: "warning",
    passed: false,
    evidence: "2 of 14 bullets carry a number",
    scoreImpact: 10,
    fix: "Quantify more bullets.",
  },
];

/** A full report from a server that predates the category rollup. */
function legacyFullResult(): WireCheckResult {
  return {
    ai: null,
    creditsSpent: 0,
    quota,
    report: {
      version: "ats-v2",
      restricted: false,
      verdict: "needs-work",
      readinessScore: 74,
      jobMatchScore: null,
      matchedKeywords: [],
      missingKeywords: [],
      parsingWarnings: [],
      strengths: ["Email detected"],
      failedChecks: [rules[1]],
      prioritizedFixes: ["Quantify more bullets."],
      rules,
    },
  };
}

function legacyRestrictedResult(): WireCheckResult {
  return {
    ai: null,
    creditsSpent: 0,
    quota,
    report: {
      version: "ats-v2",
      restricted: true,
      readinessScore: 61,
      jobMatchScore: 48,
      verdict: "needs-work",
      topFix: "Quantify more bullets.",
    },
  };
}

describe("ATS report normalisation - surviving a server one deploy behind", () => {
  /**
   * The site and the API ship separately, so this window is guaranteed to exist. Every field
   * the UI treats as required has to survive being absent, because the alternative is a render
   * throw that blanks the page *after* the visitor has already spent their free scan.
   */

  it("fills the category rollup with an empty list rather than leaving it undefined", () => {
    const { report } = normalizeCheckResult(legacyFullResult());

    if (report.restricted) throw new Error("expected a full report");
    expect(report.categories).toEqual([]);
    // The consumers all branch on `.length`, which is exactly what throws when it is undefined.
    expect(() => report.categories.length).not.toThrow();
  });

  it("fills the parsed record so the second tab renders empty rather than throwing", () => {
    const { report } = normalizeCheckResult(legacyFullResult());

    if (report.restricted) throw new Error("expected a full report");
    expect(report.parsed.roles).toEqual([]);
    expect(report.parsed.monthsOfExperience).toBeNull();
    expect(() => report.parsed.skills.length).not.toThrow();
  });

  it("recomputes the check counts from the rules an older server did send", () => {
    const { report } = normalizeCheckResult(legacyFullResult());

    if (report.restricted) throw new Error("expected a full report");

    expect(report.checksPassed).toBe(1);
    expect(report.checksTotal).toBe(2);
  });

  it("defaults word count to zero so the header can format it", () => {
    const { report } = normalizeCheckResult(legacyFullResult());

    if (report.restricted) throw new Error("expected a full report");

    expect(report.wordCount).toBe(0);
    expect(() => report.wordCount.toLocaleString()).not.toThrow();
  });

  it("fills the restricted shape's counts too", () => {
    const { report } = normalizeCheckResult(legacyRestrictedResult());

    if (!report.restricted) throw new Error("expected a restricted report");

    expect(report.checksPassed).toBe(0);
    expect(report.checksTotal).toBe(0);
    expect(report.matchedKeywordCount).toBe(0);
    expect(report.missingKeywordCount).toBe(0);
    // Newer than the rest of the restricted shape, so they default rather than arrive undefined.
    expect(report.primaryWarning).toBeNull();
    expect(report.parsedRoleCount).toBe(0);
    expect(report.remainingFixCount).toBe(0);
  });

  it("leaves a current server's response untouched", () => {
    const current = legacyFullResult();

    const categories = [
      { category: "contact", score: 100, passed: 1, total: 1, lost: 0, possible: 10 },
    ];

    Object.assign(current.report, {
      categories,
      checksPassed: 9,
      checksTotal: 11,
      wordCount: 612,
    });

    const { report } = normalizeCheckResult(current);

    if (report.restricted) throw new Error("expected a full report");
    expect(report.categories).toEqual(categories);
    // Not recomputed from `rules` - the server's own counts win when it sends them.
    expect(report.checksPassed).toBe(9);
    expect(report.checksTotal).toBe(11);
    expect(report.wordCount).toBe(612);
  });

  it("preserves everything outside the report", () => {
    const result = normalizeCheckResult(legacyFullResult());

    expect(result.quota).toEqual(quota);
    expect(result.creditsSpent).toBe(0);
    expect(result.ai).toBeNull();
  });
});
