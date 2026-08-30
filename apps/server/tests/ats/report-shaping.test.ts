import { describe, expect, it } from "vitest";

import { computeVerdict, shapeReport } from "../../src/services/ats/reportShaping";
import type { AtsReport } from "../../src/services/ats/types";

function report(overrides: Partial<AtsReport> = {}): AtsReport {
  return {
    version: "ats-v2",
    readinessScore: 60,
    jobMatchScore: null,
    matchedKeywords: ["react"],
    missingKeywords: ["kubernetes"],
    parsingWarnings: [],
    strengths: ["Email detected"],
    failedChecks: [],
    prioritizedFixes: ["Add measurable outcomes to more bullets."],
    rules: [
      {
        id: "ats-v2.contact.email",
        category: "contact",
        severity: "error",
        passed: true,
        evidence: "Email detected",
        scoreImpact: 0,
        fix: "Add a professional email address.",
      },
    ],
    categories: [{ category: "contact", score: 100, passed: 1, total: 1, lost: 0, possible: 10 }],
    checksPassed: 1,
    checksTotal: 1,
    wordCount: 420,
    parsed: {
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "415 555 0142",
      links: [],
      roles: [
        {
          title: "Engineer",
          employer: "Acme",
          start: { year: 2021, month: 1 },
          end: null,
          current: true,
        },
      ],
      education: [],
      skills: ["react"],
      monthsOfExperience: 24,
      highestDegree: "bachelor",
    },
    ...overrides,
  };
}

describe("ATS verdict thresholds", () => {
  it("prefers job match over readiness when a target role is present", () => {
    expect(computeVerdict(report({ readinessScore: 20, jobMatchScore: 80 }))).toBe("strong");
    expect(computeVerdict(report({ readinessScore: 90, jobMatchScore: 20 }))).toBe("weak");
  });

  it("falls back to readiness when there is no job description", () => {
    expect(computeVerdict(report({ readinessScore: 85, jobMatchScore: null }))).toBe("strong");
    expect(computeVerdict(report({ readinessScore: 50, jobMatchScore: null }))).toBe("needs-work");
    expect(computeVerdict(report({ readinessScore: 10, jobMatchScore: null }))).toBe("weak");
  });
});

describe("ATS report shaping — the anonymous/authenticated split", () => {
  it("gives anonymous callers a diagnosis and counts, and nothing to act on", () => {
    const shaped = shapeReport(report(), false);

    expect(shaped.restricted).toBe(true);
    expect(shaped).toEqual({
      version: "ats-v2",
      restricted: true,
      readinessScore: 60,
      jobMatchScore: null,
      verdict: "needs-work",
      topFix: "Add measurable outcomes to more bullets.",
      primaryWarning: null,
      checksPassed: 1,
      checksTotal: 1,
      matchedKeywordCount: 1,
      missingKeywordCount: 1,
      parsedRoleCount: 1,
      remainingFixCount: 0,
    });

    // Nothing that would let a visitor reconstruct the report. `categories` is on this list
    // deliberately: the rollup says which areas lost points, which is most of the diagnostic.
    for (const withheld of [
      "rules",
      "categories",
      "matchedKeywords",
      "missingKeywords",
      "failedChecks",
      "prioritizedFixes",
      "strengths",
      "parsed",
    ])
      expect(Object.keys(shaped)).not.toContain(withheld);
  });

  it("never leaks the recovered work history to an anonymous caller", () => {
    const shaped = shapeReport(report(), false);

    // The parsed table is the headline of the logged-in view; anonymous gets its size only.
    expect(JSON.stringify(shaped)).not.toContain("Acme");
    expect(JSON.stringify(shaped)).not.toContain("Jane Doe");
    if (!shaped.restricted) throw new Error("expected a restricted report");
    expect(shaped.parsedRoleCount).toBe(1);
  });

  it("leads with a parsing or formatting failure, which a candidate cannot self-diagnose", () => {
    const shaped = shapeReport(
      report({
        failedChecks: [
          {
            id: "ats-v2.content.metrics-density",
            category: "content",
            severity: "warning",
            passed: false,
            evidence: "Only 20% of bullets carry measurable evidence",
            scoreImpact: 10,
            fix: "Add numbers.",
          },
          {
            id: "ats-v2.format.columns",
            category: "format",
            severity: "error",
            passed: false,
            evidence: "72% of lines split across a horizontal gutter",
            scoreImpact: 6,
            fix: "Rebuild as a single column.",
          },
        ],
      }),
      false,
    );

    if (shaped.restricted !== true) throw new Error("expected a restricted report");
    // Chosen over the heavier content failure: you can read a job posting and spot a missing
    // keyword yourself; you cannot see that your columns scramble on extraction.
    expect(shaped.primaryWarning).toContain("gutter");
  });

  it("counts keywords for anonymous callers without naming any of them", () => {
    const shaped = shapeReport(
      report({
        matchedKeywords: ["react", "typescript", "graphql"],
        missingKeywords: ["kubernetes", "terraform"],
      }),
      false,
    );

    if (!shaped.restricted) throw new Error("expected a restricted report");
    expect(shaped.matchedKeywordCount).toBe(3);
    expect(shaped.missingKeywordCount).toBe(2);
    expect(JSON.stringify(shaped)).not.toContain("kubernetes");
  });

  it("gives authenticated callers the full report untouched, flagged as unrestricted", () => {
    const source = report({ readinessScore: 80, jobMatchScore: null });
    const shaped = shapeReport(source, true);

    expect(shaped.restricted).toBe(false);
    expect(shaped).toMatchObject(source);
    expect((shaped as typeof source & { restricted: boolean; verdict: string }).verdict).toBe(
      "strong",
    );
    expect((shaped as typeof source & { restricted: boolean }).rules).toEqual(source.rules);
  });

  it("never returns a fix when there are no prioritized fixes to tease", () => {
    const shaped = shapeReport(report({ prioritizedFixes: [] }), false);
    expect(shaped.restricted).toBe(true);
    if (shaped.restricted) expect(shaped.topFix).toBeNull();
  });
});
