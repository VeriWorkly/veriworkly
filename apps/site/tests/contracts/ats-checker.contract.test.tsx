import { readFileSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FullResults } from "@/features/ats-checker/components/tool/FullResults";
import {
  MAX_JOB_DESCRIPTION_CHARS,
  MAX_JSON_RESUME_BYTES,
  MAX_RESUME_CHARS,
} from "@/features/ats-checker/services/ats-checker-api";
import { readJsonResume } from "@/features/ats-checker/services/json-resume";
import type { AtsFullReport, AtsQuota } from "@/features/ats-checker/types";

/** The checker against the server and engine it fronts: limits, payload shapes and the figures the pages quote. */

const repo = join(__dirname, "..", "..", "..", "..");
const read = (...path: string[]) => readFileSync(join(repo, ...path), "utf8");
/** 50000 as the server writes it: 50_000. */
const literal = (n: number) => n.toLocaleString("en").replace(/,/g, "_");

describe("the checker's limits are the server's", () => {
  const validator = read("apps", "server", "src", "validators", "atsValidator.ts");

  it("caps pasted resume text where /ats/check does", () => {
    const schema = validator.slice(validator.indexOf("const resumeSchema"));
    expect(schema).toContain(`z.string().trim().min(1).max(${literal(MAX_RESUME_CHARS)})`);
  });

  it("caps the job description where /ats/check does", () => {
    expect(validator).toContain(
      `jobDescription: z.string().trim().max(${literal(MAX_JOB_DESCRIPTION_CHARS)})`,
    );
  });

  it("keeps a JSON resume under the body size /ats/check parses", () => {
    const route = read("apps", "server", "src", "routes", "ats.ts");
    const [, kb] = /json\(\{ limit: "(\d+)kb" \}\)/.exec(route) ?? [];
    expect(kb, "no JSON body limit found in routes/ats.ts").toBeDefined();
    expect(MAX_JSON_RESUME_BYTES).toBeLessThan(Number(kb) * 1024);
  });
});

describe("the quota type is the server's", () => {
  it("declares every field of AtsQuotaSummary", () => {
    const server = read("apps", "server", "src", "services", "ats", "types.ts");
    const site = read("apps", "site", "features", "ats-checker", "types", "index.ts");
    const block = (source: string, start: RegExp) => {
      const from = source.search(start);
      return source.slice(from, source.indexOf("\n};", from));
    };
    const topLevel = (body: string) =>
      [...body.matchAll(/^ {2}(\w+)\??:/gm)].map(([, key]) => key).sort();

    expect(topLevel(block(site, /export type AtsQuota = \{/))).toEqual(
      topLevel(block(server, /export type AtsQuotaSummary = \{/)),
    );
    expect(site).toMatch(/pricing: AtsPricing \| null;/);
  });
});

describe("a .json upload is read as a document", () => {
  const jsonResume = {
    basics: { name: "Sample Candidate", email: "sample@example.com", summary: "Engineer." },
    work: [
      {
        name: "Example Co",
        position: "Software Engineer",
        startDate: "2020-01-01",
        highlights: ["Built the billing service used by 40 teams and cut failed charges by 30%."],
      },
    ],
    skills: [{ name: "TypeScript" }],
  };
  const file = (body: string) => new Blob([body], { type: "application/json" });

  it("sends the parsed object, not its JSON text", async () => {
    const result = await readJsonResume(file(JSON.stringify(jsonResume)));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input).toEqual(jsonResume);
    expect(result.text).toContain("Software Engineer");
    expect(result.text).not.toContain('"position"');
  }, 30_000);

  it("refuses invalid JSON, a non-object and an oversized file", async () => {
    expect(await readJsonResume(file("{ nope"))).toMatchObject({ ok: false });
    expect(await readJsonResume(file("[1, 2]"))).toMatchObject({ ok: false });
    expect(await readJsonResume(file(" ".repeat(MAX_JSON_RESUME_BYTES + 1)))).toMatchObject({
      ok: false,
      error: expect.stringContaining("200 KB"),
    });
  });
});

describe("keyword counts", () => {
  const terms = (prefix: string, count: number) =>
    Array.from({ length: count }, (_, index) => `${prefix}${index}`);

  it("shows the engine's totals, not the 12 terms each list holds", async () => {
    const { check, shapeReport } = await import("@veriworkly/ats-engine");
    const raw = check("Sample Candidate\nsample@example.com\n\nExperience\nEngineer", undefined, {
      now: new Date("2026-10-01T00:00:00Z"),
    });
    const base = shapeReport(raw, "full");
    const report = {
      ...base,
      restricted: false,
      jobMatchScore: 40,
      matchedKeywords: terms("m", 12),
      matchedKeywordGroups: { hard: terms("m", 12), soft: [] },
      missingKeywords: terms("x", 12),
      missingKeywordGroups: { hard: terms("x", 12), soft: [] },
      keywordCounts: { matched: 20, missing: 31 },
    } as unknown as AtsFullReport;
    const quota = { tier: "free" } as AtsQuota;

    const html = renderToStaticMarkup(<FullResults report={report} quota={quota} />);

    expect(html).toContain("Showing the first 12 of 20.");
    expect(html).toContain("Showing the first 12 of 31.");
  }, 30_000);
});

describe("the figures the ATS pages quote", () => {
  const shipped = [
    read("apps", "site", "features", "ats-engine", "data", "content.ts"),
    read("apps", "site", "features", "faq", "data", "faqItems.ts"),
  ].join("\n");

  it("35 rules is the rubric's size", async () => {
    const { DEFAULT_POLICY, policyRubric } = await import("@veriworkly/ats-engine");
    const rules = policyRubric(DEFAULT_POLICY).length;

    for (const [, count] of shipped.matchAll(/(\d+) (?:published )?rules/g))
      expect(Number(count), `a page says ${count} rules`).toBe(rules);
  }, 30_000);

  it("12 regions and 5 languages are the built-in packs", async () => {
    const locales = await import("@veriworkly/ats-engine/locales");
    const regions = Object.keys(locales).filter((key) => /^[A-Z]{2}$/.test(key)).length;
    const languages = Object.keys(locales).filter((key) => /^[a-z]{2}$/.test(key)).length;

    for (const [, count] of shipped.matchAll(/(\d+) regions/g)) expect(Number(count)).toBe(regions);
    expect(languages).toBe(5);
  }, 30_000);

  it("every size comes from the installed engine's sizes.json", async () => {
    const { RUNTIMES } = await import("@/features/ats-engine/data/content");
    const { engineSize } = await import("@/features/ats-engine/data/sizes");

    for (const runtime of RUNTIMES) {
      const subpath = runtime.subpath.startsWith("/") ? `.${runtime.subpath}` : ".";
      expect([engineSize(subpath), engineSize(subpath, true)]).toContain(runtime.size);
    }
  });

  it("the benchmark tiles say they are regression figures on invented resumes", async () => {
    const { BENCHMARKS, ENGINE_VERSION_LABEL } = await import("@/features/ats-engine/data/content");
    const docs = read(
      "apps",
      "docs-platform",
      "content",
      "ats-engine",
      "project",
      "benchmarks.mdx",
    );

    for (const { label, value } of BENCHMARKS) {
      expect(label).toMatch(/test resumes|invented/i);
      expect(docs).toContain(`| ${value}`);
    }
    expect(docs).toContain(`## Results on ${ENGINE_VERSION_LABEL}`);
  });
});
