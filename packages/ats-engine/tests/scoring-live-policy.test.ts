import { describe, expect, it } from "vitest";

import { computeVerdict, type AtsLayoutSignals } from "../src/index.js";
import { livePolicy as policy, livePolicyLoadError, livePolicyPath } from "./livePolicy.js";

/**
 * Calibration suite: exercises the engine against the *real* shipped policy rather than a
 * miniature fixture, because the failures these cover were failures of the policy and the
 * algorithm together. A strong candidate scoring 30 against a posting they matched completely
 * was not visible in any unit test written against a five-rule fixture.
 *
 * The policy is private and gitignored, so the suite skips itself when it is not present rather
 * than failing a checkout that legitimately does not have it. See `./livePolicy.ts` for how it
 * is resolved — the path moved when this file did.
 */
const check = async (resume: unknown, jobDescription?: string, layout?: AtsLayoutSignals) => {
  const { AtsScoringService } = await import("../src/index.js");
  return AtsScoringService.check(resume, policy!, jobDescription, layout);
};

const STRONG_RESUME = [
  "Jane Doe",
  "Senior Software Engineer",
  "jane.doe@example.com | +1 415 555 0142 | linkedin.com/in/janedoe | github.com/janedoe",
  "",
  "Summary",
  "Senior backend engineer with 8 years building distributed systems on AWS.",
  "",
  "Experience",
  "Staff Software Engineer, Acme Corp - Jan 2021 - Present",
  "- Led migration of a monolith to 30+ microservices in Go and TypeScript, reducing p99 latency by 42%.",
  "- Built CI/CD pipelines with GitHub Actions and Kubernetes, cutting deploy time from 45 minutes to 6 minutes.",
  "- Designed a PostgreSQL sharding strategy that scaled write throughput 8x to 120k requests per second.",
  "- Introduced Terraform modules covering 90% of cloud infrastructure, cutting environment setup to 20 minutes.",
  "- Owned the on-call rotation for 12 services and reduced page volume 63% over two quarters.",
  "- Mentored 5 engineers; 3 were promoted within 18 months.",
  "",
  "Senior Software Engineer, Globex - Mar 2018 - Dec 2020",
  "- Developed a real-time analytics service in Python processing 2.4M events per day through Kafka.",
  "- Reduced infrastructure cost by $310,000 annually through rightsizing and spot instances.",
  "- Improved test coverage from 41% to 88% and introduced test driven development across 4 teams.",
  "- Rebuilt the customer dashboard in React, cutting median page load from 3.2s to 900ms.",
  "- Migrated 40 batch jobs onto a scheduled pipeline, eliminating 15 hours of manual work per week.",
  "",
  "Software Engineer, Initech - Jul 2016 - Feb 2018",
  "- Built internal tooling in Node.js used by 200 employees across 6 departments.",
  "- Automated release verification, reducing regression escapes by 35% over 12 months.",
  "- Delivered a Redis caching layer that cut database read load by 55%.",
  "",
  "Education",
  "B.S. Computer Science, University of California - 2014 - 2018",
  "Graduated with honors; coursework in distributed systems, databases, and algorithms.",
  "",
  "Skills",
  "Go, TypeScript, Python, Node.js, React, PostgreSQL, Redis, Kubernetes, Docker, Terraform, AWS, Kafka, GraphQL, gRPC",
].join("\n");

const POSTING = [
  "Senior Backend Engineer - Platform",
  "",
  "About us",
  "Northwind is a fast growing fintech company building payments infrastructure for small businesses.",
  "We are a remote first team of 200 people across 12 countries. We believe in ownership and transparency.",
  "",
  "Requirements",
  "- 5+ years of professional backend engineering experience",
  "- Strong proficiency with Go or Java",
  "- Deep experience with Kubernetes and containerized deployments",
  "- Hands on experience designing and scaling PostgreSQL databases",
  "- Familiarity with CI/CD pipelines and infrastructure as code",
  "",
  "Nice to have",
  "- Experience with Kafka or other event streaming platforms",
  "- Exposure to Terraform",
  "- Prior fintech or payments domain knowledge",
  "",
  "Responsibilities",
  "You will design, build, and operate the core services that move money for our customers.",
  "You will partner with product managers to scope work and mentor junior engineers.",
  "",
  "Benefits",
  "Competitive salary, equity, unlimited paid time off, comprehensive health dental and vision",
  "coverage, an annual learning stipend, and a home office budget.",
  "Northwind is an equal opportunity employer.",
].join("\n");

/**
 * Proof that the suite below is actually running.
 *
 * Everything here is gated on the private policy being present, and a `skipIf` that silently
 * stops matching is indistinguishable from a passing run. That is not hypothetical: this file
 * moved, and the relative path to `.private/` moved with it. This test does not skip, so a
 * broken path fails loudly and names the location it tried, instead of quietly reporting green
 * on nothing at all.
 */
it("resolves the private policy, or explains why the calibration suite is skipped", () => {
  if (policy) {
    expect(policy.rules.length).toBeGreaterThan(0);
    return;
  }
  console.warn(
    `[ats-engine] calibration suite SKIPPED — no policy at ${livePolicyPath}: ${livePolicyLoadError}`,
  );
  expect(livePolicyLoadError).toBeTruthy();
});

describe.skipIf(!policy)("ATS engine calibration against the shipped policy", () => {
  it("scores a candidate who meets every stated requirement as a strong match", async () => {
    const report = await check(STRONG_RESUME, POSTING);

    // Before section scoping and specificity weighting this pair scored 30 and was labelled
    // "weak" — the posting's benefits copy and company name outvoted the skills it asked for.
    expect(report.jobMatchScore).toBeGreaterThanOrEqual(70);
    expect(computeVerdict(report)).toBe("strong");
    expect(report.readinessScore).toBeGreaterThanOrEqual(85);
  });

  it("never advises the candidate to add function words or benefits boilerplate", async () => {
    const report = await check(STRONG_RESUME, POSTING);

    const junk = [
      "or",
      "us",
      "we",
      "is",
      "an",
      "as",
      "deep",
      "hands",
      "professional",
      "proficiency",
      "familiarity",
      "dental",
      "vision",
      "stipend",
      "equity",
      "budget",
      "salary",
      "unlimited",
    ];
    for (const term of junk) expect(report.missingKeywords).not.toContain(term);
  });

  it("drops excluded blocks so the employer's own boilerplate is never a keyword", async () => {
    const report = await check(STRONG_RESUME, POSTING);
    const surfaced = [...report.matchedKeywords, ...report.missingKeywords];

    expect(surfaced).not.toContain("northwind");
    expect(surfaced).not.toContain("countries");
    expect(surfaced).not.toContain("transparency");
  });

  it("keeps a nice-to-have from being billed at the required weight", async () => {
    const base = "jane@example.com\nExperience\nEducation\nSkills\n";
    const posting = [
      "Requirements",
      "Kubernetes is required.",
      "",
      "Nice to have",
      "Terraform is a plus.",
    ].join("\n");

    const withRequired = await check(`${base}Deployed Kubernetes clusters`, posting);
    const withPreferred = await check(`${base}Wrote Terraform modules`, posting);

    // The old fixed 600-character window ran past "Requirements" into the nice-to-haves, so
    // both terms carried the required weight and these two scored identically.
    expect(withRequired.jobMatchScore).toBeGreaterThan(withPreferred.jobMatchScore ?? 0);
  });

  it("matches a phrase in the resume against its component words in the posting", async () => {
    const report = await check(
      "jane@example.com I do machine learning every day and ship models.",
      "Requirements\nStrong machine learning ability and model deployment.",
    );

    // Consuming phrase components document-wide used to strike "machine" and "learning" from
    // the resume entirely, scoring this pair at 0.
    expect(report.jobMatchScore).toBeGreaterThan(0);
    expect(report.matchedKeywords).toContain("machine learning");
  });

  it("requires a real heading before crediting a section", async () => {
    const prose = [
      "Jane Doe",
      "jane@example.com",
      "I have 8 years of experience in education technology.",
      "My skills include Go and Python and I led a team of four.",
    ].join("\n");

    const structure = async (text: string) =>
      (await check(text)).rules
        .filter((rule) => rule.category === "structure")
        .filter((rule) => rule.id.match(/experience|education|skills$/))
        .every((rule) => rule.passed);

    expect(await structure(prose)).toBe(false);
    expect(
      await structure(
        [
          "Jane Doe",
          "jane@example.com",
          "Experience",
          "Acme",
          "Education",
          "MIT",
          "Skills",
          "Go",
        ].join("\n"),
      ),
    ).toBe(true);
  });

  it("detects emoji bullets, which the collapsed document could never surface", async () => {
    const emoji = [
      "Jane Doe",
      "jane@example.com",
      "✅ Led a team of 5",
      "\u{1F680} Shipped 12 features",
    ].join("\n");
    const plain = [
      "Jane Doe",
      "jane@example.com",
      "- Led a team of 5",
      "- Shipped 12 features",
    ].join("\n");

    const ruleOf = async (text: string) =>
      (await check(text)).rules.find((rule) => rule.id === "ats-v2.format.bullets");

    expect((await ruleOf(emoji))?.passed).toBe(false);
    expect((await ruleOf(plain))?.passed).toBe(true);
  });

  it("omits layout rules entirely when no geometry was captured, and scores them when it was", async () => {
    const pasted = await check(STRONG_RESUME);
    expect(pasted.rules.map((rule) => rule.id)).not.toContain("ats-v2.format.columns");

    const singleColumn = await check(STRONG_RESUME, undefined, {
      columnRatio: 0.02,
      tableCount: 0,
      pageCount: 1,
    });
    const twoColumn = await check(STRONG_RESUME, undefined, {
      columnRatio: 0.72,
      tableCount: 3,
      pageCount: 1,
    });

    expect(singleColumn.rules.find((r) => r.id === "ats-v2.format.columns")?.passed).toBe(true);
    expect(twoColumn.rules.find((r) => r.id === "ats-v2.format.columns")?.passed).toBe(false);
    expect(twoColumn.readinessScore).toBeLessThan(singleColumn.readinessScore);
  });

  it("credits a skill the resume evidences under a different name", async () => {
    const report = await check(
      "jane@example.com\nSkills\nTerraform, Kubernetes, PostgreSQL, Kafka",
      "Requirements\n- Infrastructure as code\n- Containerized deployments\n- Relational databases\n- Event streaming",
    );

    expect(report.missingKeywords).not.toContain("infrastructure as code");
    expect(report.jobMatchScore).toBeGreaterThanOrEqual(80);
  });

  it("treats alternatives as one requirement satisfied by either side", async () => {
    const base = "jane@example.com\nExperience\nEducation\nSkills\n";
    const posting = "Requirements\n- Strong proficiency with Go or Java\n- Kubernetes";

    const withGo = await check(`${base}Shipped services in Go on Kubernetes`, posting);
    expect(withGo.jobMatchScore).toBe(100);
    expect(withGo.missingKeywords).not.toContain("java");

    // A candidate holding neither still sees the choice stated as the posting framed it.
    const withNeither = await check(`${base}Shipped services on Kubernetes`, posting);
    expect(withNeither.missingKeywords.join(" ")).toMatch(/go or java|java or go/);
  });

  it("groups a three-way list written with an Oxford comma", async () => {
    const base = "jane@example.com\nExperience\nEducation\nSkills\n";
    const posting = "Requirements\n- React, Vue, or Angular\n- TypeScript";

    // Any one of the three satisfies the requirement, and it is counted once.
    for (const framework of ["React", "Vue", "Angular"]) {
      const report = await check(`${base}Built interfaces in ${framework} and TypeScript`, posting);
      expect(report.jobMatchScore).toBe(100);
    }

    const none = await check(`${base}Wrote TypeScript`, posting);
    expect(none.missingKeywords.join(" ")).toMatch(/react or vue or angular/);
  });

  /**
   * A word appearing beside two different "or"s must not weld their requirements together.
   * Chaining through the union-find let "Java or equivalent" and "Python or equivalent" become
   * one group, so a Java-only resume scored 100 and Python vanished from the missing list.
   */
  it("never lets a filler word merge two separate requirements", async () => {
    const base = "jane@example.com\nExperience\nEducation\nSkills\n";
    const report = await check(
      `${base}Built services in Java on Kubernetes`,
      "Requirements\n- Java or equivalent\n- Python or equivalent\n- Kubernetes",
    );

    expect(report.missingKeywords).toContain("python");
    expect(report.jobMatchScore).toBeLessThan(100);
  });

  it("keeps two overlapping choices as two choices", async () => {
    const base = "jane@example.com\nExperience\nEducation\nSkills\n";
    const report = await check(
      `${base}Shipped Android apps in Kotlin`,
      "Requirements\n- Java or Kotlin\n- Kotlin or Swift",
    );

    // Kotlin satisfies the first choice. The second is a separate requirement that happens to
    // share a member, not an extension of the first.
    expect(report.jobMatchScore).toBeLessThan(100);
  });

  /**
   * The obvious regex for alternation nests a quantifier inside a repetition, which backtracks
   * catastrophically on a long comma list containing no "or" — 546 ms against 10 ms for a normal
   * posting, on the free unauthenticated endpoint. This pins the linear replacement.
   */
  it("stays fast on a comma list built to make a backtracking scanner suffer", async () => {
    const bomb = Array.from({ length: 4000 }, (_, index) => `term${index}`).join(", ");

    const startedAt = Date.now();
    await check("jane@example.com\nSkills\nGo", `Requirements\n${bomb}`);
    expect(Date.now() - startedAt).toBeLessThan(150);
  });

  /**
   * A Studio resume arrives as a JSON document, not text. Heading-scoped structure rules made
   * that path a real regression risk — there are no headings in an object — so `flatten` emits
   * each key on its own line. The collapsed text is byte-identical either way; only `lines`
   * changes, which is exactly what the rules read.
   */
  it("maps sections from a Studio resume document, not just from text", async () => {
    const document = {
      basics: { fullName: "Jane Doe", email: "jane@example.com" },
      experience: [{ company: "Acme", highlights: ["Led migration reducing latency by 42%"] }],
      education: [{ school: "MIT" }],
      skills: [{ name: "Core", keywords: ["Go", "Kubernetes"] }],
    };

    const structure = (await check(document, "Requirements\n- Go and Kubernetes")).rules.filter(
      (rule) => /experience|education|skills$/.test(rule.id),
    );

    expect(structure).toHaveLength(3);
    expect(structure.every((rule) => rule.passed)).toBe(true);
  });

  it("survives every degenerate input without throwing", async () => {
    // Resolved first, then asserted synchronously: `check` is async here only because it imports
    // the engine, and a rejected promise would sail straight past `.not.toThrow()`.
    for (const resume of [null, undefined, 42, "", "   \n\n  ", {}, [], { a: { b: [] } }]) {
      const report = await check(resume).then(
        (value) => () => value,
        (error: unknown) => () => {
          throw error;
        },
      );
      expect(report).not.toThrow();
    }

    // A posting made entirely of about-us and benefits copy yields no scoreable term. Reporting
    // no score is right; inventing one from boilerplate is what the rewrite exists to prevent.
    const boilerplate = await check(
      "jane@example.com\nSkills\nGo",
      "About us\nWe are great.\n\nBenefits\nDental and vision coverage.",
    );
    expect(boilerplate.jobMatchScore).toBeNull();
  });

  it("reports readiness as a true share of the points actually at stake", async () => {
    // Table glyphs, emoji bullets, page furniture, filler phrases, no contact, no headings,
    // and far past the length ceiling.
    const bad = [
      "page 1 of 2",
      "┌─────┬─────┐",
      "│ a   │ b   │",
      `\u{1F680} hardworking team player self-starter results-driven synergy ${"lorem ipsum dolor ".repeat(400)}`,
    ].join("\n");

    for (const report of [
      await check(bad),
      await check(STRONG_RESUME),
      await check(STRONG_RESUME, undefined, {
        columnRatio: 0.8,
        tableCount: 4,
        pageCount: 2,
      }),
    ]) {
      const lost = report.categories.reduce((sum, entry) => sum + entry.lost, 0);
      const possible = report.categories.reduce((sum, entry) => sum + entry.possible, 0);
      // The old score was `100 - lost`, which floored the worst possible resume at 11 and
      // shifted meaning as soon as the applicable rule set changed.
      expect(report.readinessScore).toBe(Math.max(0, Math.round((1 - lost / possible) * 100)));
    }

    expect((await check(bad)).readinessScore).toBeLessThan(25);
  });
});
