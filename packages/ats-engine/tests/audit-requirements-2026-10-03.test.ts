import { describe, expect, it } from "vitest";

import { AtsScoringService, DEFAULT_POLICY } from "../src/index.js";

const NOW = new Date("2026-10-01T00:00:00Z");
const BASE = "Jane Doe\njane@example.com";
const requirement = (resume: string, line: string) =>
  AtsScoringService.check(resume, DEFAULT_POLICY, {
    jobDescription: `Requirements\n- ${line}`,
    now: NOW,
  }).requirements;

describe("October requirement audit regressions", () => {
  it.each([
    [
      "Not authorized to work in the United States",
      "Must be authorized to work in the United States",
    ],
    ["No active security clearance", "Active security clearance required"],
  ])("does not treat negative evidence as satisfying %s", (evidence, ask) => {
    expect(requirement(`${BASE}\n${evidence}`, ask)[0]?.status).not.toBe("met");
  });

  it("keeps a composite authorization and experience ask visible", () => {
    const found = requirement(
      `${BASE}\nAuthorized to work in the United States`,
      "Must be authorized to work in the United States and have 5+ years of Python experience",
    );
    expect(found).toHaveLength(2);
    expect(found.map(({ kind }) => kind)).toEqual(["authorization", "experience"]);
  });

  it("does not treat beginner Spanish as fluent", () => {
    expect(
      requirement(`${BASE}\nLanguages\nSpanish (beginner)`, "Fluent in Spanish")[0]?.status,
    ).toBe("missing");
  });

  it("does not assign unrelated global tenure to a named skill", () => {
    const resume = `${BASE}
Experience
Engineer, Acme Jan 2020 - Dec 2024
- Built Java services
Engineer, Beta Jan 2025 - Present
- Built Python scripts`;
    expect(requirement(resume, "5+ years of Python experience")[0]?.status).not.toBe("met");
  });

  it("requires a degree field to occur in education evidence", () => {
    const resume = `${BASE}
Education
B.S. Computer Science, State University 2018
Skills
Arts, Java`;
    expect(requirement(resume, "BA in Arts")[0]?.status).toBe("partial");
  });
});
