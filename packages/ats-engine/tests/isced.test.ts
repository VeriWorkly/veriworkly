import { describe, expect, it } from "vitest";

import { AtsPolicyError, DEFAULT_POLICY, parseAtsPolicy, parseResume } from "../src/index.js";
import { ISCED_LABELS } from "../src/format/index.js";

const NOW = new Date("2026-10-01T00:00:00Z");
const education = (body: string, policy = DEFAULT_POLICY) =>
  parseResume(`Jane Doe\nEDUCATION\n${body}`.split("\n"), policy, NOW);

describe("education levels on ISCED 2011", () => {
  it.each([
    ["High School Diploma, Lincoln High School 2012", 3, "diploma"],
    ["Diploma in Nursing, City College 2014", 4, "diploma"],
    ["Associate of Arts, Valley Community College 2015", 5, "associate"],
    ["B.Tech, Computer Science, Delhi University 2016", 6, "bachelor"],
    ["MBA, Harvard University 2020", 7, "master"],
    ["Ph.D. Physics, Stanford University 2024", 8, "doctorate"],
  ])("reads %j at level %i (%s)", (line, isced, level) => {
    expect(education(line).education[0]).toMatchObject({ isced, level });
  });

  it("reports the highest level, and its old label beside it", () => {
    const parsed = education(
      "B.S. Mathematics, State University 2014\nM.S. Statistics, State University 2016",
    );
    expect(parsed.highestIsced).toBe(7);
    expect(parsed.highestDegree).toBe("master");
    expect(ISCED_LABELS[parsed.highestIsced!]).toBe("Master's or equivalent");
  });

  it("still reads a policy written before ISCED, as levels 4 to 8", () => {
    const policy = parseAtsPolicy({
      ...structuredClone(DEFAULT_POLICY),
      resumeParse: {
        ...structuredClone(DEFAULT_POLICY.resumeParse),
        degrees: {
          diploma: "diploma",
          associate: "associate degree",
          bachelor: String.raw`b\.s\.`,
          master: String.raw`m\.s\.`,
          doctorate: String.raw`ph\.d\.`,
        },
      },
    });
    expect(policy.resumeParse.degrees).toEqual({
      "4": "diploma",
      "5": "associate degree",
      "6": String.raw`b\.s\.`,
      "7": String.raw`m\.s\.`,
      "8": String.raw`ph\.d\.`,
    });
    expect(education("M.S., State University 2016", policy).highestIsced).toBe(7);
  });

  it("refuses a policy that names no level", () => {
    const parse = () =>
      parseAtsPolicy({
        ...structuredClone(DEFAULT_POLICY),
        resumeParse: { ...structuredClone(DEFAULT_POLICY.resumeParse), degrees: {} },
      });
    expect(parse).toThrow(AtsPolicyError);
    try {
      parse();
    } catch (error) {
      expect(JSON.stringify((error as AtsPolicyError).issues)).toContain("at least one level");
    }
  });
});
