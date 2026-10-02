import { describe, expect, it } from "vitest";

import {
  DEFAULT_POLICY,
  findGroundingViolations,
  isGrounded,
  mergeGrounded,
  needsRepair,
  normalizeForGrounding,
  type AtsParsedResume,
  type AtsRepairCandidate,
  type AtsReport,
} from "../src/index.js";

const NOW = new Date("2026-09-30T00:00:00Z");
const merge = (deterministic: AtsParsedResume, candidate: AtsRepairCandidate, source: string) =>
  mergeGrounded(deterministic, candidate, source, { policy: DEFAULT_POLICY, now: NOW });

/**
 * The grounding check is the whole reason an LLM is allowed near the parse. If it can be talked
 * past, the feature puts fabricated employers on people's resumes, so these tests are written
 * adversarially: each one is a way a model could return something it did not read.
 */

const SOURCE = `
Jane Q. Doe
jane.doe@example.com  |  (555) 010-2020

EXPERIENCE
Senior Engineer, Acme Corporation
Jan 2020 - Present
Built the thing.

Engineer, Globex Ltd
2017 - 2019

EDUCATION
BSc Computer Science, University of Somewhere
`;

describe("grounding: values must occur in the source", () => {
  it("accepts a value copied verbatim", () => {
    expect(isGrounded("Acme Corporation", normalizeForGrounding(SOURCE))).toBe(true);
  });

  it("rejects a plausible employer that is not in the document", () => {
    // The failure this feature exists to prevent: a real-sounding company nobody wrote down.
    expect(isGrounded("Initech", normalizeForGrounding(SOURCE))).toBe(false);
  });

  it("rejects an expanded abbreviation the document never contained", () => {
    expect(isGrounded("Globex Limited", normalizeForGrounding(SOURCE))).toBe(false);
  });

  it("accepts a value whose casing the model normalised", () => {
    expect(isGrounded("acme corporation", normalizeForGrounding(SOURCE))).toBe(true);
  });

  it("accepts a value split across a line break in the source", () => {
    const wrapped = normalizeForGrounding("Senior Engineer,\nAcme Corp\noration");
    expect(isGrounded("Acme Corporation", wrapped)).toBe(true);
  });

  it("does not let a two-character value match inside an unrelated word", () => {
    // "it" occurs inside "Built" - a naive substring check would call this grounded.
    expect(isGrounded("it", normalizeForGrounding(SOURCE))).toBe(false);
  });

  it("treats an empty value as asserting nothing", () => {
    expect(isGrounded("", normalizeForGrounding(SOURCE))).toBe(true);
  });
});

describe("grounding: walking a returned object", () => {
  it("reports the path of every ungrounded string", () => {
    const violations = findGroundingViolations(
      {
        name: "Jane Q. Doe",
        roles: [
          { title: "Senior Engineer", employer: "Acme Corporation" },
          { title: "Principal Engineer", employer: "Initech" },
        ],
      },
      SOURCE,
    );

    expect(violations.map((violation) => violation.path).sort()).toEqual([
      "roles[1].employer",
      "roles[1].title",
    ]);
  });

  it("ignores numbers and booleans, which carry no fabricated identity", () => {
    const violations = findGroundingViolations(
      { roles: [{ employer: "Acme Corporation", current: true, start: { year: 2020, month: 1 } }] },
      SOURCE,
    );
    expect(violations).toEqual([]);
  });

  it("covers fields added later without being listed here", () => {
    // A hand-listed field set leaves the newest field unchecked. This walks generically.
    const violations = findGroundingViolations({ somethingAddedLater: "Initech" }, SOURCE);
    expect(violations).toEqual([{ path: "somethingAddedLater", value: "Initech" }]);
  });
});

const emptyParsed: AtsParsedResume = {
  name: "",
  email: "",
  phone: "",
  links: [],
  roles: [],
  education: [],
  skills: [],
  monthsOfExperience: null,
  highestDegree: null,
  provenance: {
    name: "none",
    email: "none",
    phone: "none",
    roles: "none",
    education: "none",
    skills: "none",
  },
};

const candidate = (overrides: Partial<AtsRepairCandidate> = {}): AtsRepairCandidate => ({
  name: "",
  email: "",
  phone: "",
  roles: [],
  education: [],
  skills: [],
  ...overrides,
});

describe("merge: AI values only fill gaps, and only when grounded", () => {
  it("fills a field the deterministic parser missed", () => {
    const { merged } = merge(emptyParsed, candidate({ name: "Jane Q. Doe" }), SOURCE);
    expect(merged.name).toBe("Jane Q. Doe");
  });

  it("never overwrites a value the deterministic parser already found", () => {
    const { merged } = merge(
      { ...emptyParsed, name: "Jane Q. Doe" },
      candidate({ name: "Jane Doe" }),
      SOURCE,
    );
    expect(merged.name).toBe("Jane Q. Doe");
  });

  it("drops a hallucinated employer instead of merging it", () => {
    const { merged, violations } = merge(
      emptyParsed,
      candidate({
        roles: [
          { title: "Senior Engineer", employer: "Initech", start: null, end: null, current: false },
        ],
      }),
      SOURCE,
    );

    expect(violations).toEqual([{ path: "roles[0].employer", value: "Initech" }]);
    expect(merged.roles[0]!.employer).toBe("");
    expect(merged.roles[0]!.title).toBe("Senior Engineer");
  });

  it("drops a role entirely when neither of its identifying fields is grounded", () => {
    const { merged } = merge(
      emptyParsed,
      candidate({
        roles: [
          {
            title: "Chief Fabricator",
            employer: "Initech",
            start: null,
            end: null,
            current: false,
          },
        ],
      }),
      SOURCE,
    );
    expect(merged.roles).toEqual([]);
  });

  it("keeps dates, which the schema bounds rather than the substring check", () => {
    const { merged } = merge(
      emptyParsed,
      candidate({
        roles: [
          {
            title: "Senior Engineer",
            employer: "Acme Corporation",
            start: { year: 2020, month: 1 },
            end: null,
            current: true,
          },
        ],
      }),
      SOURCE,
    );
    expect(merged.roles[0]!.start).toEqual({ year: 2020, month: 1 });
    expect(merged.roles[0]!.current).toBe(true);
  });
});

const reportWith = (parsed: Partial<AtsParsedResume>, wordCount = 400): AtsReport =>
  ({ parsed: { ...emptyParsed, ...parsed }, wordCount }) as AtsReport;

describe("trigger: repair runs only where the parse visibly failed", () => {
  it("fires when a substantial document yielded no roles at all", () => {
    expect(needsRepair(reportWith({}))).toBe(true);
  });

  it("does not fire on a short document that legitimately has no roles", () => {
    expect(needsRepair(reportWith({ name: "Jane Q. Doe", email: "j@e.com", phone: "1" }, 40))).toBe(
      false,
    );
  });

  // The merge never edits a row the parser found, so offering a paid repair for incomplete rows
  // would sell a pass that comes back unchanged.
  it("is not offered when roles were found but are incomplete", () => {
    const report = reportWith({
      name: "Jane",
      email: "j@e.com",
      phone: "555",
      roles: [
        { title: "Engineer", employer: "", start: null, end: null, current: false },
        { title: "Engineer", employer: "", start: null, end: null, current: false },
      ],
    });
    expect(needsRepair(report)).toBe(false);
  });

  it("fires when a stacked header cost the contact block", () => {
    const report = reportWith({
      roles: [
        {
          title: "Engineer",
          employer: "Acme",
          start: { year: 2020, month: 1 },
          end: null,
          current: true,
        },
      ],
    });
    expect(needsRepair(report)).toBe(true);
  });

  it("does not fire on a cleanly parsed resume", () => {
    const report = reportWith({
      name: "Jane",
      email: "j@e.com",
      phone: "555",
      roles: [
        {
          title: "Engineer",
          employer: "Acme",
          start: { year: 2020, month: 1 },
          end: null,
          current: true,
        },
      ],
    });
    expect(needsRepair(report)).toBe(false);
  });
});

describe("grounding: the whitespace-insensitive pass does not open a hole", () => {
  /**
   * `isGrounded` falls back to comparing with whitespace stripped, so a word broken across a
   * column boundary still matches. That is a real loosening, and these fix how far it goes: it
   * may join characters that are adjacent in the document, and nothing more.
   */
  it("still rejects a fabricated name after whitespace is stripped", () => {
    expect(isGrounded("Initech", normalizeForGrounding(SOURCE))).toBe(false);
  });

  it("does not let a value match by reordering the document's characters", () => {
    expect(isGrounded("Corporation Acme", normalizeForGrounding(SOURCE))).toBe(false);
  });

  it("does not let a short value slip through as a squashed substring", () => {
    // "ac" would appear inside "acme" once spaces are gone; short values stay word-anchored.
    expect(isGrounded("ac", normalizeForGrounding(SOURCE))).toBe(false);
  });

  it("still rejects an employer built from pieces of two different lines", () => {
    expect(isGrounded("Acme Globex", normalizeForGrounding(SOURCE))).toBe(false);
  });
});

describe("merge: derived fields and provenance follow the merged values", () => {
  it("recomputes tenure and highest degree from repaired rows", () => {
    const { merged } = merge(
      emptyParsed,
      candidate({
        roles: [
          {
            title: "Senior Engineer",
            employer: "Acme Corporation",
            start: { year: 2020, month: 1 },
            end: { year: 2020, month: 12 },
            current: false,
          },
        ],
        education: [
          { school: "University of Somewhere", credential: "BSc Computer Science", end: null },
        ],
      }),
      SOURCE,
    );

    // Before the merge moved into the package these stayed at the deterministic values, so a
    // repaired resume showed its jobs beside "no experience" and no degree.
    expect(merged.monthsOfExperience).toBe(12);
    expect(merged.highestDegree).toBe("bachelor");
    expect(merged.education[0]!.level).toBe("bachelor");
  });

  it("stamps filled fields as ai and leaves the rest as they were", () => {
    const deterministic: AtsParsedResume = {
      ...emptyParsed,
      email: "jane.doe@example.com",
      provenance: { ...emptyParsed.provenance, email: "parser" },
    };
    const { merged } = merge(deterministic, candidate({ name: "Jane Q. Doe" }), SOURCE);

    expect(merged.provenance.name).toBe("ai");
    expect(merged.provenance.email).toBe("parser");
    expect(merged.provenance.roles).toBe("none");
  });

  it("drops an implausible date the model returned rather than trusting it", () => {
    const { merged } = merge(
      emptyParsed,
      candidate({
        roles: [
          {
            title: "Senior Engineer",
            employer: "Acme Corporation",
            start: { year: 1066, month: 1 },
            end: null,
            current: false,
          },
        ],
      }),
      SOURCE,
    );
    expect(merged.roles[0]!.start).toBeNull();
  });
});

describe("grounding: a shared source index", () => {
  it("rejects a real employer name hidden inside a longer word", () => {
    const source = normalizeForGrounding(
      "metadata pipelines at Stanford, intelligence, visas, pineapple",
    );
    for (const value of ["Meta", "Ford", "Intel", "Visa", "Apple"])
      expect(isGrounded(value, source), value).toBe(false);
    expect(isGrounded("Stanford", source)).toBe(true);
  });

  it("stays linear in the number of values checked", () => {
    const source = `${"Senior Engineer at Acme Corporation. ".repeat(1_300)}`;
    const candidate = { skills: Array.from({ length: 500 }, (_, i) => `Skill number ${i}`) };
    const started = performance.now();
    findGroundingViolations(candidate, source);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe("merge: tenure fields are grounded too", () => {
  it("drops a start year that does not appear in the document", () => {
    const { merged } = merge(
      emptyParsed,
      candidate({
        roles: [
          {
            title: "Senior Engineer",
            employer: "Acme Corporation",
            start: { year: 1990, month: 1 },
            end: null,
            current: false,
          },
        ],
      }),
      SOURCE,
    );
    expect(merged.roles[0]!.start).toBeNull();
    expect(merged.monthsOfExperience).toBeNull();
  });

  it("keeps current only when the document says present", () => {
    const role = {
      title: "Senior Engineer",
      employer: "Acme Corporation",
      start: { year: 2020, month: 1 },
      end: null,
      current: true,
    };
    expect(merge(emptyParsed, candidate({ roles: [role] }), SOURCE).merged.roles[0]!.current).toBe(
      true,
    );
    const noPresent = SOURCE.replace("Present", "Dec 2022");
    expect(
      merge(emptyParsed, candidate({ roles: [role] }), noPresent).merged.roles[0]!.current,
    ).toBe(false);
  });

  it("rejects punctuation-only contact values", () => {
    const { merged } = merge(
      emptyParsed,
      candidate({ name: "--", email: "()", phone: "." }),
      SOURCE,
    );
    expect([merged.name, merged.email, merged.phone]).toEqual(["", "", ""]);
  });

  it("is never offered for a structured document", () => {
    const structured = {
      ...emptyParsed,
      provenance: { ...emptyParsed.provenance, name: "structured" as const },
    };
    expect(needsRepair({ parsed: structured, wordCount: 500 })).toBe(false);
  });
});
