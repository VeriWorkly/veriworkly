import { describe, expect, it } from "vitest";

import {
  AtsPolicyError,
  AtsScoringService,
  DEFAULT_POLICY,
  computeVerdict,
  parseAtsPolicy,
} from "../src/index.js";

/**
 * The policy contract, from the package's side.
 *
 * `engine-policy.test.ts` in the server covers the other half — that an invalid policy refuses
 * the boot and surfaces as a 503. What is covered here is what the library itself promises:
 * `parseAtsPolicy` is pure, it throws a typed error carrying the structured issues, and a policy
 * it accepts cannot then blow up at match time.
 */

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
    requiredWeight: 1,
    preferredWeight: 1,
    responsibilitiesWeight: 1,
    defaultWeight: 1,
    generalTermWeight: 0.5,
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

const withRule = (rule: Record<string, unknown>) => ({ ...MINIMAL, rules: [rule] });

const presenceRule = {
  id: "test.presence",
  category: "structure",
  severity: "warning",
  kind: "presence",
  pattern: "\\bexperience\\b",
  flags: "i",
  weight: 5,
  passEvidence: "found",
  failEvidence: "missing",
  fix: "add it",
};

describe("parseAtsPolicy", () => {
  it("returns the parsed policy and throws nothing on a well-formed one", () => {
    const policy = parseAtsPolicy(MINIMAL);
    expect(policy.version).toBe("ats-v2");
    expect(policy.rules).toHaveLength(1);
  });

  it("is pure — parsing twice yields equal, independent results", () => {
    const a = parseAtsPolicy(MINIMAL);
    const b = parseAtsPolicy(MINIMAL);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("does not mutate the input", () => {
    const input = structuredClone(MINIMAL);
    const before = JSON.stringify(input);
    parseAtsPolicy(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("throws AtsPolicyError, not a zod error, so the host never sees the dependency", () => {
    expect(() => parseAtsPolicy({})).toThrow(AtsPolicyError);
  });

  it("carries structured issues naming the offending field", () => {
    try {
      parseAtsPolicy({ ...MINIMAL, rules: [{ id: "broken" }] });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AtsPolicyError);
      const issues = (error as AtsPolicyError).issues;
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]).toHaveProperty("path");
      expect(issues[0]).toHaveProperty("message");
    }
  });

  for (const bad of [null, undefined, "string", 42, [], true]) {
    it(`rejects ${JSON.stringify(bad) ?? "undefined"} without crashing`, () => {
      expect(() => parseAtsPolicy(bad)).toThrow(AtsPolicyError);
    });
  }

  /**
   * A multi-word term only becomes a single token by matching the phrase list first, so one
   * referenced by `implies` or `synonyms` but absent from `phrases` silently never resolves.
   */
  it("rejects a multi-word term that could never match", () => {
    expect(() =>
      parseAtsPolicy({
        ...MINIMAL,
        keywordMatch: {
          ...MINIMAL.keywordMatch,
          implies: { terraform: ["infrastructure as code"] },
          phrases: [],
        },
      }),
    ).toThrow(AtsPolicyError);
  });
});

/**
 * A policy that validates must not be able to throw at match time. Before these guards a
 * malformed pattern passed `z.string().min(1)` and raised `SyntaxError` on the first request
 * that evaluated the rule — a healthy process serving a broken endpoint, which is the exact
 * failure the boot-time check exists to prevent.
 */
describe("regex fields are validated at parse time, not at match time", () => {
  it("rejects a pattern that does not compile", () => {
    expect(() => parseAtsPolicy(withRule({ ...presenceRule, pattern: "([unclosed" }))).toThrow(
      AtsPolicyError,
    );
  });

  it("rejects invalid regex flags", () => {
    expect(() => parseAtsPolicy(withRule({ ...presenceRule, flags: "iQ" }))).toThrow(
      AtsPolicyError,
    );
  });

  it("rejects a word list whose assembled alternation does not compile", () => {
    expect(() =>
      parseAtsPolicy({
        ...MINIMAL,
        resumeParse: { ...MINIMAL.resumeParse, titleWords: ["engineer", "c++"] },
      }),
    ).toThrow(AtsPolicyError);
  });

  it("rejects a malformed section heading pattern", () => {
    expect(() =>
      parseAtsPolicy({
        ...MINIMAL,
        resumeParse: {
          ...MINIMAL.resumeParse,
          sections: { ...MINIMAL.resumeParse.sections, experience: "(bad" },
        },
      }),
    ).toThrow(AtsPolicyError);
  });

  it("rejects a malformed degree pattern", () => {
    expect(() =>
      parseAtsPolicy({
        ...MINIMAL,
        resumeParse: {
          ...MINIMAL.resumeParse,
          degrees: { ...MINIMAL.resumeParse.degrees, bachelor: "(bad" },
        },
      }),
    ).toThrow(AtsPolicyError);
  });

  it("still accepts a legitimate pattern that merely looks exotic", () => {
    expect(() =>
      parseAtsPolicy(withRule({ ...presenceRule, pattern: "(?:\\b|^)(ph\\.?d\\.?)(?![a-z])" })),
    ).not.toThrow();
  });

  it("accepts a word list entry that is itself a small pattern", () => {
    expect(() =>
      parseAtsPolicy({
        ...MINIMAL,
        resumeParse: { ...MINIMAL.resumeParse, titleWords: ["sr\\.?", "engineer"] },
      }),
    ).not.toThrow();
  });
});

/**
 * The shipped default has to actually work, or the package's first-run experience is a crash.
 * It is also the one policy a consumer gets without writing anything, so it carries the
 * package's claim that it is usable standalone.
 */
describe("DEFAULT_POLICY", () => {
  it("validates against the schema it is published beside", () => {
    expect(() => parseAtsPolicy(DEFAULT_POLICY)).not.toThrow();
  });

  it("exercises every rule kind, so the default is a real demonstration", () => {
    const kinds = new Set(DEFAULT_POLICY.rules.map((rule) => rule.kind));
    expect(kinds).toEqual(
      new Set(["min-words", "presence", "position", "bands", "layout", "parsed"]),
    );
  });

  it("scores a plainly good resume well and a plainly bad one badly", () => {
    const good = [
      "Jane Doe",
      "jane.doe@example.com | +1 415 555 0142",
      "",
      "Experience",
      "Staff Software Engineer, Acme Corp - Jan 2021 - Present",
      "- Led a migration to 30 microservices, reducing p99 latency by 42%.",
      "- Built CI/CD pipelines, cutting deploy time from 45 minutes to 6 minutes.",
      "- Designed a PostgreSQL sharding strategy that scaled throughput 8x.",
      "",
      "Senior Software Engineer, Globex - Mar 2018 - Dec 2020",
      "- Developed an analytics service processing 2.4M events per day.",
      "- Reduced infrastructure cost by 31% through rightsizing.",
      "",
      "Education",
      "B.S. Computer Science, University of California - 2014 - 2018",
      "",
      "Skills",
      "Go, TypeScript, PostgreSQL, Kubernetes, Terraform, Docker",
    ].join("\n");

    const report = AtsScoringService.check(good, DEFAULT_POLICY);
    expect(report.parsed.roles).toHaveLength(2);
    expect(report.parsed.email).toBe("jane.doe@example.com");
    expect(report.parsed.highestDegree).toBe("bachelor");
    expect(report.readinessScore).toBeGreaterThan(70);

    const bad = AtsScoringService.check("hire me", DEFAULT_POLICY);
    expect(bad.readinessScore).toBeLessThan(50);
    expect(computeVerdict(bad)).toBe("weak");
  });

  it("credits an implied capability, so the implication map is wired up", () => {
    const report = AtsScoringService.check(
      "jane@example.com\nSkills\nTerraform, PostgreSQL",
      DEFAULT_POLICY,
      "Requirements\n- Infrastructure as code\n- Relational databases",
    );
    expect(report.missingKeywords).not.toContain("infrastructure as code");
    expect(report.jobMatchScore).toBeGreaterThan(0);
  });

  it("treats an alternation as one requirement", () => {
    const report = AtsScoringService.check(
      "jane@example.com\nExperience\nShipped services in Go",
      DEFAULT_POLICY,
      "Requirements\n- Go or Java",
    );
    expect(report.missingKeywords).not.toContain("java");
  });

  /**
   * The tuned weights are private. If the default ever matches them it means the calibration
   * leaked into a package that is meant to be publishable.
   */
  it("does not ship the private calibration weights", () => {
    const km = DEFAULT_POLICY.keywordMatch;
    expect([
      km.requiredWeight,
      km.preferredWeight,
      km.responsibilitiesWeight,
      km.generalTermWeight,
    ]).not.toEqual([1.5, 0.75, 0.6, 0.35]);
  });
});

describe("the engine holds no state", () => {
  it("gives identical results for identical input", () => {
    const run = () =>
      JSON.stringify(
        AtsScoringService.check(
          "Jane Doe\njane@x.com\nExperience\nEngineer, Acme - Jan 2020 - Dec 2022",
          DEFAULT_POLICY,
          "Requirements\nGo or Java",
        ),
      );
    expect(run()).toBe(run());
  });

  it("does not mutate the resume or the policy", () => {
    const resume = { experience: [{ company: "Acme" }] };
    const resumeBefore = JSON.stringify(resume);
    const policyBefore = JSON.stringify(DEFAULT_POLICY);

    AtsScoringService.check(resume, DEFAULT_POLICY);

    expect(JSON.stringify(resume)).toBe(resumeBefore);
    expect(JSON.stringify(DEFAULT_POLICY)).toBe(policyBefore);
  });

  it("survives degenerate input without throwing", () => {
    for (const resume of [null, undefined, 42, "", "   \n\n  ", {}, [], { a: { b: [] } }])
      expect(() => AtsScoringService.check(resume, DEFAULT_POLICY)).not.toThrow();
  });

  /**
   * `resume` is attacker-controlled and the body parser allows 4 MB, so unbounded recursion over
   * it is a stack overflow away from taking out every request sharing the worker.
   */
  it("caps recursion depth rather than overflowing the stack", () => {
    let nested: unknown = "leaf";
    for (let depth = 0; depth < 50_000; depth += 1) nested = { value: nested };
    expect(() => AtsScoringService.check(nested, DEFAULT_POLICY)).not.toThrow();
  });
});
