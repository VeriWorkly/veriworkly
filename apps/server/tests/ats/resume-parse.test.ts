import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

/**
 * The parser recovers the fields an applicant tracking system stores. These cover the layouts
 * real resumes actually use — dates on the header line and on their own line, employer-first and
 * title-first ordering, and the sections that must *not* be read as work history.
 */
const policyPath = fileURLToPath(
  new URL("../../../../.private/ats-engine-policy.dev.json", import.meta.url),
);

let policy: unknown;
try {
  policy = JSON.parse(readFileSync(policyPath, "utf8"));
} catch {
  policy = null;
}

vi.mock("#services/aiPrivateConfig", () => ({ getAtsEnginePolicyJson: () => policy }));

const NOW = new Date(Date.UTC(2026, 7, 31));

async function parse(text: string) {
  const { parseResume } = await import("../../src/services/ats/resumeParse");
  const { getAtsEnginePolicy } = await import("../../src/services/ats/enginePolicy");
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return parseResume(lines, getAtsEnginePolicy(), NOW);
}

describe.skipIf(!policy)("resume parsing — what an ATS recovers", () => {
  it("recovers a row per job from a conventional chronological resume", async () => {
    const parsed = await parse(
      [
        "Jane Doe",
        "jane.doe@example.com | +1 415 555 0142 | linkedin.com/in/janedoe",
        "",
        "Experience",
        "Staff Software Engineer, Acme Corp — Jan 2021 – Present",
        "- Led a migration to 30 microservices.",
        "Senior Software Engineer, Globex — Mar 2018 – Dec 2020",
        "- Built a real-time analytics service.",
        "",
        "Education",
        "B.S. Computer Science, University of California — 2014 – 2018",
      ].join("\n"),
    );

    expect(parsed.name).toBe("Jane Doe");
    expect(parsed.email).toBe("jane.doe@example.com");
    expect(parsed.phone).toBeTruthy();

    expect(parsed.roles).toHaveLength(2);
    expect(parsed.roles[0]).toMatchObject({
      title: "Staff Software Engineer",
      employer: "Acme Corp",
      current: true,
      start: { year: 2021, month: 1 },
    });
    expect(parsed.roles[1]).toMatchObject({
      title: "Senior Software Engineer",
      employer: "Globex",
      current: false,
      end: { year: 2020, month: 12 },
    });

    expect(parsed.highestDegree).toBe("bachelor");
    // The institution is the searchable field; the date range must not ride along on it.
    expect(parsed.education[0].school).toBe("University of California");
  });

  it("reads employer-first headers as well as title-first ones", async () => {
    const parsed = await parse(
      ["Experience", "Globex Corporation | Senior Data Analyst | 2019 - 2022"].join("\n"),
    );

    expect(parsed.roles[0]).toMatchObject({
      title: "Senior Data Analyst",
      employer: "Globex Corporation",
    });
  });

  it("reads a header whose dates sit on their own line", async () => {
    const parsed = await parse(
      [
        "Experience",
        "Product Manager, Initech",
        "June 2020 — August 2023",
        "- Owned roadmap.",
      ].join("\n"),
    );

    expect(parsed.roles).toHaveLength(1);
    expect(parsed.roles[0]).toMatchObject({
      title: "Product Manager",
      employer: "Initech",
      start: { year: 2020, month: 6 },
      end: { year: 2023, month: 8 },
    });
  });

  it("does not read certifications or education as work history", async () => {
    const parsed = await parse(
      [
        "Experience",
        "Software Engineer, Acme — Jan 2020 – Dec 2022",
        "",
        "Certifications",
        "AWS Solutions Architect — 2021",
        "Certified Scrum Master — 2019 - 2023",
        "",
        "Education",
        "B.S. Computer Science, MIT — 2014 – 2018",
      ].join("\n"),
    );

    // Every heading terminates the block above it, including ones we do not classify. Without
    // that, a dated certifications list becomes extra jobs and inflates years of experience.
    expect(parsed.roles).toHaveLength(1);
    expect(parsed.roles[0].employer).toBe("Acme");
  });

  it("counts overlapping roles once when totalling experience", async () => {
    const parsed = await parse(
      [
        "Experience",
        "Engineer, Acme — Jan 2020 – Dec 2022",
        "Advisor, Globex — Jan 2021 – Dec 2021",
      ].join("\n"),
    );

    // Jan 2020 through Dec 2022 inclusive is 36 months; the concurrent advisory year adds none.
    expect(parsed.monthsOfExperience).toBe(36);
  });

  it("measures an open-ended role against the present", async () => {
    const parsed = await parse(["Experience", "Engineer, Acme — Jan 2026 – Present"].join("\n"));

    // Jan through Aug 2026 inclusive, against the fixed clock this suite runs on.
    expect(parsed.monthsOfExperience).toBe(8);
    expect(parsed.roles[0].current).toBe(true);
  });

  it("handles the date spellings resumes actually use", async () => {
    const parsed = await parse(
      [
        "Experience",
        "Engineer, A — 03/2019 - 06/2021",
        "Engineer, B — Sept. 2015 to Nov. 2017",
        "Engineer, C — 2012–2014",
        "Engineer, D — 2021-03 - 2022-09",
      ].join("\n"),
    );

    expect(parsed.roles.map((role) => role.start)).toEqual([
      { year: 2019, month: 3 },
      { year: 2015, month: 9 },
      { year: 2012, month: null },
      { year: 2021, month: 3 },
    ]);
  });

  it("reports what it could not recover rather than inventing it", async () => {
    const { parseQuality } = await import("../../src/services/ats/resumeParse");

    // A resume whose history is prose: no date ranges, so no rows an ATS could store.
    const parsed = await parse(
      [
        "Jane Doe",
        "Experience",
        "I have worked at several companies doing engineering work for a number of years.",
      ].join("\n"),
    );

    expect(parsed.roles).toHaveLength(0);
    expect(parsed.monthsOfExperience).toBeNull();

    const quality = parseQuality(parsed);
    expect(quality.rolesDetected).toBe(0);
    expect(quality.roleCompleteness).toBe(0);
  });

  it("still recovers a work history when the Experience heading is missing", async () => {
    const parsed = await parse(
      ["Jane Doe", "Software Engineer, Acme Corp — Jan 2021 – Dec 2023"].join("\n"),
    );

    // The absent heading is reported by the structure rules. Refusing to parse as well would
    // punish the same mistake twice and hide the rows the candidate needs to check.
    expect(parsed.roles).toHaveLength(1);
    expect(parsed.roles[0].employer).toBe("Acme Corp");
  });

  it("extracts the skills list an ATS would index", async () => {
    const parsed = await parse(
      ["Technical Skills", "Go, TypeScript, PostgreSQL, Kubernetes, Terraform"].join("\n"),
    );

    expect(parsed.skills).toEqual(["Go", "TypeScript", "PostgreSQL", "Kubernetes", "Terraform"]);
  });

  it("takes the highest degree when several are listed", async () => {
    const parsed = await parse(
      [
        "Education",
        "Ph.D. Computer Science, Stanford University — 2018 - 2022",
        "B.S. Computer Science, MIT — 2014 - 2018",
      ].join("\n"),
    );

    expect(parsed.highestDegree).toBe("doctorate");
  });
});
