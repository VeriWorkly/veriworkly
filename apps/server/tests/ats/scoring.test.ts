import { describe, expect, it, vi } from "vitest";

const policy = {
  version: "ats-v2" as const,
  rules: [
    {
      id: "test.parse.text",
      category: "parse",
      severity: "error" as const,
      kind: "min-words" as const,
      min: 5,
      weight: 20,
      passEvidence: "{n} words",
      failEvidence: "only {n} words",
      fix: "add more words",
    },
    {
      id: "test.contact.email",
      category: "contact",
      severity: "error" as const,
      kind: "presence" as const,
      pattern: "\\b\\S+@\\S+\\.\\S+\\b",
      flags: "i",
      invert: false,
      weight: 10,
      passEvidence: "email found",
      failEvidence: "no email",
      fix: "add email",
    },
    {
      id: "test.contact.position",
      category: "contact",
      severity: "warning" as const,
      kind: "position" as const,
      emailPattern: "\\b\\S+@\\S+\\.\\S+\\b",
      phonePattern: "\\d{3}-\\d{3}-\\d{4}",
      windowFraction: 0.3,
      weight: 5,
      passEvidence: "contact near top",
      failEvidence: "contact buried",
      fix: "move contact up",
    },
    {
      id: "test.structure.dates",
      category: "structure",
      severity: "warning" as const,
      kind: "presence" as const,
      pattern:
        "\\b(?:19|20)\\d{2}\\s*(?:-|–|—|to)\\s*(?:(?:19|20)\\d{2}|present|current)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s+(?:19|20)\\d{2}\\b",
      flags: "i",
      invert: false,
      weight: 4,
      passEvidence: "dates found",
      failEvidence: "no dates",
      fix: "add employment dates",
    },
    {
      id: "test.format.tables",
      category: "format",
      severity: "warning" as const,
      kind: "presence" as const,
      pattern: "[│┌┐]",
      flags: "",
      invert: true,
      weight: 8,
      passEvidence: "no tables",
      failEvidence: "tables found",
      fix: "remove tables",
    },
    {
      id: "test.content.length",
      category: "content",
      severity: "warning" as const,
      kind: "bands" as const,
      metric: "wordCount" as const,
      bands: [
        { upTo: 5, weight: 6 },
        { upTo: 100, weight: 0 },
        { upTo: null, weight: 3 },
      ],
      passEvidence: "{n} words in range",
      failEvidence: "{n} words out of range",
      fix: "adjust length",
    },
    {
      id: "test.content.metrics",
      category: "content",
      severity: "warning" as const,
      kind: "bands" as const,
      metric: "metricsRatio" as const,
      pattern: "\\d+%",
      flags: "",
      bands: [
        { upTo: 0, weight: 10 },
        { upTo: 0.5, weight: 5 },
        { upTo: null, weight: 0 },
      ],
      passEvidence: "{pct}% quantified",
      failEvidence: "{pct}% quantified",
      fix: "add metrics",
    },
    {
      id: "test.content.buzzwords",
      category: "content",
      severity: "info" as const,
      kind: "bands" as const,
      metric: "buzzwordCount" as const,
      bands: [
        { upTo: 0, weight: 0 },
        { upTo: null, weight: 2 },
      ],
      passEvidence: "low buzzwords",
      failEvidence: "{n} buzzwords",
      fix: "cut buzzwords",
    },
  ],
  keywordMatch: {
    requiredWeight: 2,
    preferredWeight: 0.5,
    responsibilitiesWeight: 1,
    defaultWeight: 1,
    generalTermWeight: 0.35,
    sections: {
      required: "^\\W*(requirements?|qualifications?)\\b",
      preferred: "^\\W*(nice[- ]to[- ]have|preferred qualifications?)\\b",
      responsibilities: "^\\W*(responsibilities|what you.{0,3}ll do)\\b",
      excluded: "^\\W*(about us|benefits|perks|equal opportunity)\\b",
    },
    stopwords: ["and", "the", "with", "for", "our", "you", "is", "a", "of", "to", "or"],
    synonyms: {
      js: "javascript",
      ml: "machine learning",
      ".net": ".net",
      "ci/cd": "continuous integration and deployment",
    },
    implies: { terraform: ["infrastructure as code"] },
    phrases: ["machine learning", "project management", "continuous integration and deployment"],
    buzzwords: ["team player", "hardworking"],
  },
  resumeParse: {
    sections: {
      experience: "^\\W*(experience|employment|work history)\\b",
      education: "^\\W*(education|academic)\\b",
      skills: "^\\W*(skills|technologies)\\b",
      projects: "^\\W*(projects?)\\b",
      other: "^\\W*(summary|profile|certifications?|awards?)\\b",
    },
    titleWords: ["engineer", "manager", "developer", "analyst", "designer"],
    schoolWords: ["university", "college", "institute"],
    degrees: {
      diploma: "\\b(diploma|certificate)\\b",
      associate: "(?:\\b|^)(associate(?:'?s)?|a\\.?a\\.?s?\\.?)(?![a-z])",
      bachelor: "(?:\\b|^)(bachelor(?:'?s)?|b\\.?sc?\\.?|b\\.?a\\.?)(?![a-z])",
      master: "(?:\\b|^)(master(?:'?s)?|m\\.?sc?\\.?|mba)(?![a-z])",
      doctorate: "(?:\\b|^)(doctorate|ph\\.?d\\.?)(?![a-z])",
    },
  },
};

vi.mock("#services/ats/enginePolicy", () => ({
  getAtsEnginePolicy: vi.fn(() => policy),
}));

function ruleFor(rules: { id: string }[], id: string) {
  const rule = rules.find((r) => r.id === id);
  if (!rule) throw new Error(`Missing rule ${id} in report`);
  return rule;
}

describe("ATS deterministic scoring — policy-driven engine", () => {
  it("pulls rule content from the injected policy, not from hardcoded source", async () => {
    const { AtsScoringService } = await import("../../src/services/ats/scoring");
    const report = AtsScoringService.check("Jane Doe jane@example.com Experience Skills");

    expect(report.version).toBe("ats-v2");
    expect(report.rules.map((r) => r.id)).toEqual(policy.rules.map((r) => r.id));
  });

  it("grades word count and metric density instead of a flat pass/fail", async () => {
    const { AtsScoringService } = await import("../../src/services/ats/scoring");
    const resume = [
      "Jane Doe",
      "jane@example.com",
      "Experience",
      "Managed a team and delivered 45% improvement in throughput",
      "Built internal tooling used across the org",
      "Wrote documentation for onboarding",
      "Reviewed pull requests daily",
      "Skills",
      "JavaScript, machine learning, project management",
    ].join("\n");

    const report = AtsScoringService.check(resume);

    const length = ruleFor(report.rules, "test.content.length");
    expect(length.passed).toBe(true);
    expect(length.scoreImpact).toBe(0);

    const metrics = ruleFor(report.rules, "test.content.metrics");
    expect(metrics.passed).toBe(false);
    expect(metrics.scoreImpact).toBe(5); // 1 of 9 lines carries a number -> mid band, not the floor
  });

  it("flags contact info buried past the position window even though it exists", async () => {
    const { AtsScoringService } = await import("../../src/services/ats/scoring");
    const padding = "Relevant experience and accomplishments. ".repeat(40);
    const buried = `${padding}Reach me at jane@example.com for more.`;

    const report = AtsScoringService.check(buried);
    const position = ruleFor(report.rules, "test.contact.position");
    expect(position.passed).toBe(false);

    const nearTop = "jane@example.com\n" + padding;
    const reportNearTop = AtsScoringService.check(nearTop);
    expect(ruleFor(reportNearTop.rules, "test.contact.position").passed).toBe(true);
  });

  it("penalizes generic filler phrases via the buzzword band", async () => {
    const { AtsScoringService } = await import("../../src/services/ats/scoring");
    const report = AtsScoringService.check(
      "jane@example.com A hardworking team player who is also a team player and hardworking.",
    );
    const buzzwords = ruleFor(report.rules, "test.content.buzzwords");
    expect(buzzwords.passed).toBe(false);
    expect(buzzwords.scoreImpact).toBe(2);
  });

  it("matches synonyms, abbreviations, and multi-word phrases across resume and job text", async () => {
    const { AtsScoringService } = await import("../../src/services/ats/scoring");
    const resume =
      "jane@example.com Built systems with JavaScript. Led project management for a cross-team initiative.";
    const jobDescription = [
      "Requirements",
      "JS and project management required.",
      "-".repeat(80),
      "Nice to have",
      "ML and public speaking.",
    ].join("\n");

    const report = AtsScoringService.check(resume, jobDescription);

    expect(report.jobMatchScore).not.toBeNull();
    expect(report.matchedKeywords).toContain("js");
    expect(report.matchedKeywords).toContain("project management");
    // "ML" in the job text expands through the synonym map to the multi-word canonical
    // phrase "machine learning" — the resume never mentions it, so it should read as missing.
    expect(report.missingKeywords).toContain("machine learning");
  });

  it("weights a required-section term above a nice-to-have term with the same resume", async () => {
    const { AtsScoringService } = await import("../../src/services/ats/scoring");
    const jobDescription = [
      "Requirements",
      "JS required.",
      "-".repeat(80),
      "Nice to have",
      "ML is a plus.",
    ].join("\n");

    const resumeWithNeither = AtsScoringService.check(
      "jane@example.com Experience Skills",
      jobDescription,
    );
    const resumeWithRequired = AtsScoringService.check(
      "jane@example.com Built with JavaScript",
      jobDescription,
    );
    const resumeWithPreferred = AtsScoringService.check(
      "jane@example.com Familiar with machine learning",
      jobDescription,
    );

    expect(resumeWithRequired.jobMatchScore).toBeGreaterThan(resumeWithNeither.jobMatchScore ?? 0);
    expect(resumeWithRequired.jobMatchScore).toBeGreaterThan(
      resumeWithPreferred.jobMatchScore ?? 0,
    );
  });

  it("returns no job match score when no job description is given", async () => {
    const { AtsScoringService } = await import("../../src/services/ats/scoring");
    const report = AtsScoringService.check("jane@example.com Experience Skills padding word count");

    expect(report.jobMatchScore).toBeNull();
    expect(report.matchedKeywords).toEqual([]);
    expect(report.missingKeywords).toEqual([]);
  });

  it("still prioritizes missing parseable content the way the old engine did", async () => {
    const { AtsScoringService } = await import("../../src/services/ats/scoring");
    const report = AtsScoringService.check("Short resume");

    expect(report.readinessScore).toBeLessThan(60);
    expect(report.parsingWarnings).toHaveLength(1);
    expect(report.prioritizedFixes).toContain("add more words");
  });
});

describe("ATS category rollup", () => {
  it("scores each category by the share of its own weight the resume kept", async () => {
    const { AtsScoringService } = await import("../../src/services/ats/scoring");
    // Contact carries two rules: email (weight 10) and position (weight 5). With no contact
    // details at all, email fails outright but position passes vacuously — so the category
    // keeps 5 of its 15 possible points.
    const report = AtsScoringService.check("Experience Skills Education summary of work history");

    const contact = report.categories.find((entry) => entry.category === "contact");
    expect(contact).toMatchObject({ passed: 1, total: 2, lost: 10, possible: 15 });
    expect(contact?.score).toBe(33);

    const format = report.categories.find((entry) => entry.category === "format");
    expect(format).toMatchObject({ score: 100, passed: 1, total: 1, lost: 0 });
  });

  it("reports one entry per category, covering every rule exactly once", async () => {
    const { AtsScoringService } = await import("../../src/services/ats/scoring");
    const report = AtsScoringService.check("jane@example.com Experience Skills Education");

    expect(report.categories.map((entry) => entry.category).sort()).toEqual([
      "contact",
      "content",
      "format",
      "parse",
      "structure",
    ]);
    expect(report.categories.reduce((sum, entry) => sum + entry.total, 0)).toBe(report.checksTotal);
    expect(report.checksPassed).toBe(report.rules.filter((rule) => rule.passed).length);
  });

  it("accurately parses and matches tech tokens like .NET and CI/CD without dropping leading dots or slashes", async () => {
    const { AtsScoringService } = await import("../../src/services/ats/scoring");
    const resume =
      "jane@example.com Engineered microservices using .NET and set up CI/CD pipelines.";
    const jobDescription = ["Requirements", ".NET and CI/CD required."].join("\n");

    const report = AtsScoringService.check(resume, jobDescription);
    expect(report.matchedKeywords).toContain(".net");
    expect(report.matchedKeywords).toContain("continuous integration and deployment");
  });

  it("evaluates standard employment date formats", async () => {
    const { AtsScoringService } = await import("../../src/services/ats/scoring");
    const resumeWithDates = AtsScoringService.check(
      "Jane Doe jane@example.com Experience Software Engineer 2021 - Present Built web apps Skills",
    );
    expect(ruleFor(resumeWithDates.rules, "test.structure.dates").passed).toBe(true);

    const resumeWithoutDates = AtsScoringService.check(
      "Jane Doe jane@example.com Experience Software Engineer Built web apps Skills",
    );
    expect(ruleFor(resumeWithoutDates.rules, "test.structure.dates").passed).toBe(false);
  });

  it("caps recursion so a deeply nested resume object cannot overflow the stack", async () => {
    const { AtsScoringService } = await import("../../src/services/ats/scoring");
    let nested: unknown = "jane@example.com deeply buried contact detail";
    for (let depth = 0; depth < 50_000; depth += 1) nested = { value: nested };

    expect(() => AtsScoringService.check(nested)).not.toThrow();
    // Past the depth cap the payload contributes nothing, so it scores as an empty resume
    // rather than crashing the worker.
    expect(AtsScoringService.check(nested).wordCount).toBeLessThan(30);
  });
});
