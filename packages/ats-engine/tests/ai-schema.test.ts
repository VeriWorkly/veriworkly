import { describe, expect, it } from "vitest";

import { toStrictJsonSchema } from "../src/ai/schema.js";
import { insightsSchema } from "../src/ai/tasks/analyze.js";
import { convertedResumeSchema } from "../src/ai/tasks/convertResume.js";
import { repairedResumeSchema } from "../src/ai/tasks/repairParse.js";
import recorded from "./fixtures/ai-strict-schemas.json" with { type: "json" };

/**
 * `ai-strict-schemas.json` is what the server sent before the schemas were generated: three
 * JSON Schemas written by hand next to the zod schemas that parse the reply. Generating them
 * must not change a byte a model sees.
 */
describe("strict JSON Schema generation", () => {
  it.each([
    ["ats_insights", insightsSchema],
    ["converted_resume", convertedResumeSchema],
    ["repaired_resume", repairedResumeSchema],
  ] as const)("reproduces the hand-written %s schema exactly", (name, schema) => {
    expect(toStrictJsonSchema(schema)).toEqual(recorded[name]);
  });

  it("satisfies the strict subset at every depth", () => {
    const check = (node: Record<string, unknown>, path: string) => {
      if (node.properties) {
        expect(node.additionalProperties, path).toBe(false);
        expect(node.required, path).toEqual(Object.keys(node.properties));
        for (const [key, child] of Object.entries(node.properties))
          check(child as Record<string, unknown>, `${path}.${key}`);
      }
      if (node.items) check(node.items as Record<string, unknown>, `${path}[]`);
      for (const banned of ["maxLength", "maxItems", "minimum", "maximum", "anyOf"])
        expect(node, `${path} has ${banned}`).not.toHaveProperty(banned);
    };
    for (const schema of [insightsSchema, convertedResumeSchema, repairedResumeSchema])
      check(toStrictJsonSchema(schema), "$");
  });
});

describe("lenient reply parsing", () => {
  it("accepts an all-null reply, so a sparse answer is not a failed request", () => {
    expect(
      insightsSchema.parse({
        explanation: null,
        missingEvidence: null,
        keywordOpportunities: null,
        recommendedImprovements: null,
        priorityOrder: null,
      }),
    ).toEqual({
      explanation: "",
      missingEvidence: [],
      keywordOpportunities: [],
      recommendedImprovements: [],
      priorityOrder: [],
    });
  });

  it("defaults missing and null fields in a converted resume", () => {
    const resume = convertedResumeSchema.parse({
      basics: { fullName: "Jane Doe", role: null },
      experience: [{ company: "Corp", current: null, highlights: [null, "Shipped", undefined] }],
      education: null,
    });
    expect(resume.basics).toEqual({
      fullName: "Jane Doe",
      role: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
    });
    expect(resume.experience[0]).toMatchObject({ current: false, highlights: ["", "Shipped", ""] });
    expect(resume.education).toEqual([]);
    expect(resume.links).toEqual([]);
  });

  it("drops a repaired date without a year and trims values", () => {
    const repaired = repairedResumeSchema.parse({
      name: "  Jane Doe ",
      roles: [{ title: "Engineer", start: { month: 3 }, end: { year: 2021, month: null } }],
    });
    expect(repaired.name).toBe("Jane Doe");
    expect(repaired.roles[0]).toMatchObject({ start: null, end: { year: 2021, month: null } });
  });

  it("rejects an oversized reply rather than truncating it silently", () => {
    expect(insightsSchema.safeParse({ explanation: "x".repeat(4_001) }).success).toBe(false);
  });
});
