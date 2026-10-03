import { describe, expect, it } from "vitest";

import {
  AtsScoringService,
  DEFAULT_POLICY,
  parseResume,
  prepareResume,
  type AtsResumeInput,
} from "../src/index.js";
import { BUILT_IN_LOCALES, localizePolicy, withLocales } from "../src/locales/index.js";
import { findDateRange } from "../src/parser/dates.js";
import { parseEducation } from "../src/parser/education.js";
import { splitTitleAndEmployer } from "../src/parser/experience.js";
import { findPhone } from "../src/parser/phone.js";
import { readResumeLines } from "../src/parser/lines.js";
import { despaceLines, segmentResume } from "../src/parser/sections.js";
import { segmentJob } from "../src/matching/jobSections.js";

/**
 * Parser defects found in review, one block per finding. Every case runs against
 * `DEFAULT_POLICY` at a fixed `now`.
 */

const NOW = new Date("2026-10-01T00:00:00Z");
const rp = DEFAULT_POLICY.resumeParse;

const check = (resume: AtsResumeInput) =>
  AtsScoringService.check(resume, DEFAULT_POLICY, { now: NOW });

const parse = (text: string) =>
  parseResume(
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    DEFAULT_POLICY,
    NOW,
  );

const roleRows = (text: string) =>
  parse(text).roles.map(({ title, employer, start, current }) => ({
    title,
    employer,
    start,
    current,
  }));

/** Fails when a regex goes super-linear: 50 KB must be read well inside this budget. */
const budget = (fn: () => unknown, ms = 500) => {
  const started = performance.now();
  fn();
  expect(performance.now() - started).toBeLessThan(ms);
};

describe("P0 JSON Resume with more highlights than the document format allows", () => {
  const resume = {
    basics: { name: "Jane Doe" },
    work: [
      {
        name: "Acme",
        position: "Engineer",
        startDate: "2019-01",
        highlights: Array.from({ length: 150 }, (_, i) => `Shipped feature number ${i + 1}`),
      },
    ],
    volunteer: [
      {
        organization: "Code Club",
        position: "Mentor",
        summary: "Taught kids to code",
        highlights: Array.from({ length: 150 }, (_, i) => `Session ${i + 1}`),
      },
    ],
    projects: [{ name: "Thing", highlights: Array.from({ length: 150 }, () => "Did it") }],
  };

  it("is read, capped at the format's limit, instead of throwing", () => {
    const prepared = prepareResume(resume);
    const [experience] = prepared.document!.sections.filter((s) => s.kind === "experience");
    expect(experience.kind === "experience" && experience.items[0].highlights).toHaveLength(100);
    expect(() => check(resume)).not.toThrow();
    expect(check(resume).parsed.roles[0]).toMatchObject({ title: "Engineer", employer: "Acme" });
  });
});

describe("P1 job title starting with a section word", () => {
  it("reads a role line opening with 'Education' as a role, not a heading", () => {
    expect(
      roleRows(
        "Jane Doe\nExperience\nEducation Program Manager, Khan Academy\nJan 2019 - Present\n- Led programs",
      ),
    ).toEqual([
      {
        title: "Education Program Manager",
        employer: "Khan Academy",
        start: { year: 2019, month: 1 },
        current: true,
      },
    ]);
  });

  it("reads dated role lines opening with 'Education' and 'Skills'", () => {
    expect(
      roleRows(
        "Jane Doe\nExperience\nEducation Coordinator, Acme   Jan 2019 - Present\nSkills Trainer, Initech   Jan 2016 - Dec 2018",
      ).map(({ title, employer }) => [title, employer]),
    ).toEqual([
      ["Education Coordinator", "Acme"],
      ["Skills Trainer", "Initech"],
    ]);
  });

  it("still reads headings with title-word tails", () => {
    const parsed = parse(
      "Jane Doe\nWork Experience Summary\nEngineer, Acme   Jan 2019 - Present\nSkills & Tools\nGo, Rust",
    );
    expect(parsed.roles).toHaveLength(1);
    expect(parsed.skills).toEqual(["Go", "Rust"]);
  });
});

describe("P1 lowercase heading after a long unpunctuated line", () => {
  it("is not glued onto the line above as a wrapped continuation", () => {
    const { lines } = readResumeLines(
      [
        "Jane Doe",
        "Senior software engineer with ten years building payment systems at scale",
        "experience",
        "Engineer, Acme   Jan 2019 - Present",
        "- Built payment services used by millions of customers in forty countries",
        "skills",
        "Go, Rust",
      ],
      DEFAULT_POLICY,
    );
    expect(segmentResume(lines, DEFAULT_POLICY).map((section) => section.kind)).toEqual([
      "other",
      "experience",
      "skills",
    ]);
  });

  it("still joins a genuine wrapped continuation", () => {
    const parsed = parse(
      [
        "Jane Doe",
        "Experience",
        "Engineer, Acme   Jan 2019 - Present",
        "- Built payment services used by millions of customers across forty",
        "countries and three continents.",
      ].join("\n"),
    );
    expect(parsed.roles).toHaveLength(1);
    const { lines } = readResumeLines(
      [
        "- Built learning tools for teachers and students across many schools in",
        "education technology platforms",
      ],
      DEFAULT_POLICY,
    );
    expect(lines).toHaveLength(1);
  });
});

describe("P1 phone number followed by a line starting with digits", () => {
  it("does not read across the line break", () => {
    expect(findPhone("(650) 253-0000\n1600 Amphitheatre Pkwy", DEFAULT_POLICY, NOW)).toBe(
      "(650) 253-0000",
    );
    expect(findPhone("(650) 253-0000\n94043", DEFAULT_POLICY, NOW)).toBe("(650) 253-0000");
    expect(check("Jane Doe\n(650) 253-0000\n1600 Amphitheatre Pkwy").parsed.phone).toBe(
      "(650) 253-0000",
    );
  });

  it("stays linear on hostile digit runs", () => {
    budget(() => findPhone("1 1 ".repeat(12_500), DEFAULT_POLICY, NOW));
    budget(() => findPhone("1\n1\n".repeat(12_500), DEFAULT_POLICY, NOW));
  });
});

describe("P2 dates with a day before or after the month name", () => {
  it("reads '15 Jan 2020 - 3 Mar 2023' and '15. Jan 2020 - 3. Mar 2023'", () => {
    for (const line of ["15 Jan 2020 - 3 Mar 2023", "15. Jan 2020 - 3. Mar 2023"])
      expect(findDateRange(line, rp, NOW)?.range).toEqual({
        start: { year: 2020, month: 1 },
        end: { year: 2023, month: 3 },
        current: false,
      });
  });

  it("reads 'June 1, 2019 - May 31, 2021'", () => {
    expect(findDateRange("June 1, 2019 - May 31, 2021", rp, NOW)?.range).toEqual({
      start: { year: 2019, month: 6 },
      end: { year: 2021, month: 5 },
      current: false,
    });
  });

  it("recovers the roles", () => {
    expect(
      roleRows(
        "Jane Doe\nExperience\nEngineer, Acme   15 Jan 2020 - 3 Mar 2023\nAnalyst, Initech   June 1, 2017 - May 31, 2019",
      ).map(({ employer, start }) => [employer, start]),
    ).toEqual([
      ["Acme", { year: 2020, month: 1 }],
      ["Initech", { year: 2017, month: 6 }],
    ]);
  });

  it("keeps the whole-word month rule and stays linear", () => {
    expect(findDateRange("Novartis 2018 - 2020", rp, NOW)?.range.start).toEqual({
      year: 2018,
      month: null,
    });
    budget(() => findDateRange("1 Jan 1 ".repeat(7_000), rp, NOW));
    budget(() => findDateRange("Jan 1, ".repeat(7_000), rp, NOW));
    budget(() => findDateRange(`1${" ".repeat(50_000)}x`, rp, NOW));
  });
});

describe("P2 line starting with '.' read as a bullet", () => {
  it("reads '.NET Developer' as a role header", () => {
    expect(
      roleRows("Jane Doe\nExperience\n.NET Developer, Contoso    Jan 2019 - Present").map(
        ({ title, employer }) => [title, employer],
      ),
    ).toEqual([[".NET Developer", "Contoso"]]);
  });

  it("keeps '.NET' whole in a skills list", () => {
    expect(parse("Jane Doe\nSkills\n.NET, C#").skills).toEqual([".NET", "C#"]);
  });

  it("still strips a '.' bullet followed by a space", () => {
    expect(parse("Jane Doe\nSkills\n. Go, Rust").skills).toEqual(["Go", "Rust"]);
  });

  it("stays linear on hostile header text", () => {
    budget(() => splitTitleAndEmployer(`${". ".repeat(25_000)}x`, DEFAULT_POLICY));
    budget(() => splitTitleAndEmployer(`${" @ ".repeat(16_000)}x`, DEFAULT_POLICY));
  });
});

describe("P2 ordinary all-caps headings re-cut as letter-spaced", () => {
  it("leaves multi-word all-caps lines alone", () => {
    const lines = ["SKILL SET", "LANGUAGE SKILLS", "PROJECT SUMMARY"];
    expect(despaceLines(lines, DEFAULT_POLICY)).toEqual({ lines, spaced: 0 });
  });

  it("still reads letter-spaced headings back", () => {
    expect(
      despaceLines(
        ["WOR K EXPE RIENCE", "SU MMARY", "W O R K E X P E R I E N C E"],
        DEFAULT_POLICY,
      ),
    ).toEqual({ lines: ["WORK EXPERIENCE", "SUMMARY", "WORK EXPERIENCE"], spaced: 3 });
  });
});

describe("P3 education school names", () => {
  const schools = (line: string) =>
    parseEducation([line], DEFAULT_POLICY, NOW).map((entry) => entry.school);

  it("prefers the school over a high-school credential", () => {
    expect(schools("High School Diploma, Lincoln High School, 2010")).toEqual([
      "Lincoln High School",
    ]);
  });

  // A campus ("University of California, Berkeley") cannot be told from a city or a field of
  // study without vocabulary, so the school ends at its comma: short, never wrong.
  it("does not glue a city or a field of study onto the school", () => {
    expect(schools("Harvard University, Cambridge, MA")).toEqual(["Harvard University"]);
    expect(schools("University of Michigan, Computer Science, 2015 - 2019")).toEqual([
      "University of Michigan",
    ]);
    expect(schools("University of California, Berkeley, 2014 - 2018")).toEqual([
      "University of California",
    ]);
  });

  it("does not take a credential or a date as part of the school", () => {
    expect(schools("University of Washington, B.S. Computer Science, 2017")).toEqual([
      "University of Washington",
    ]);
    expect(schools("Stanford University, B.S., 2018")).toEqual(["Stanford University"]);
    expect(schools("Stanford University, Sept 2018")).toEqual(["Stanford University"]);
  });

  it("stays linear on hostile input", () => {
    budget(() => schools("High School, ".repeat(4_000)));
  });
});

describe("P3 title and employer joined by '@'", () => {
  it("splits 'Data Scientist @ Netflix'", () => {
    expect(splitTitleAndEmployer("Data Scientist @ Netflix", DEFAULT_POLICY)).toEqual({
      title: "Data Scientist",
      employer: "Netflix",
    });
  });

  it("does not split an email address", () => {
    expect(splitTitleAndEmployer("jane@netflix.com", DEFAULT_POLICY).employer).toBe("");
  });
});

describe("P3 text cap splitting a surrogate pair", () => {
  it("cuts on a code-point boundary", () => {
    const { text } = prepareResume(`${"a".repeat(49_999)}😀 tail`);
    expect(text.length).toBe(49_999);
    expect(text.isWellFormed()).toBe(true);
  });

  it("cuts a document's fields on a code-point boundary too", () => {
    const { text } = prepareResume({
      format: "ats-resume@1",
      basics: { name: `${"a".repeat(199)}😀` },
      sections: [],
    } as AtsResumeInput);
    expect(text.isWellFormed()).toBe(true);
  });
});

/** Found by the review of the fixes above. */
describe("change review", () => {
  const LOCALES = withLocales(DEFAULT_POLICY, BUILT_IN_LOCALES);
  const kinds = (lines: string[], languages: string[]) =>
    segmentResume(lines, localizePolicy(LOCALES, "", { languages }).policy).map(
      (section) => `${section.kind}:${section.headed}`,
    );

  it("strips a role header's trailing separators in linear time", () => {
    budget(() => splitTitleAndEmployer(`Engineer x${"-".repeat(48_000)}y`, DEFAULT_POLICY));
    budget(() => splitTitleAndEmployer(`x${". ".repeat(24_000)}y`, DEFAULT_POLICY));
    expect(splitTitleAndEmployer("Engineer, Acme Inc., ", DEFAULT_POLICY).employer).toBe(
      "Acme Inc",
    );
  });

  it("joins heading words with the policy's connectors, in any language", () => {
    expect(kinds(["Ausbildung und Weiterbildung", "TU München"], ["de"])).toEqual([
      "education:true",
    ]);
    expect(kinds(["Education and Certifications", "MIT"], [])).toEqual(["education:true"]);
  });

  it("does not take a word that only starts with a heading word as a heading", () => {
    expect(kinds(["अनुभवी सॉफ्टवेयर इंजीनियर", "पुणे, महाराष्ट्र"], ["hi"])).toEqual([
      "other:false",
    ]);
  });

  it("keeps a heading with a bracketed count", () => {
    expect(kinds(["Experience (10+ Years)", "Engineer, Acme"], [])).toEqual(["experience:true"]);
    expect(kinds(["Berufserfahrung (10 Jahre)", "Ingenieur, Acme"], ["de"])).toEqual([
      "experience:true",
    ]);
  });

  it("still reads a role with its dates in brackets as a role", () => {
    expect(kinds(["Education Coordinator (2019 - 2020)", "Acme"], [])).toEqual(["other:false"]);
  });
});

describe("final review: sentence-case headings", () => {
  const kinds = (lines: string[]) =>
    segmentResume(lines, DEFAULT_POLICY).map((section) => `${section.kind}:${section.headed}`);

  it.each([
    ["Education and certifications", "education"],
    ["Skills summary", "skills"],
    ["Volunteering experience", "other"],
  ])("reads %j as a heading", (heading, kind) => {
    expect(kinds([heading, "Something under it"])).toEqual([`${kind}:true`]);
  });

  it("still reads a capitalised phrase with a lowercase word as prose", () => {
    expect(kinds(["History of Art BA", "x"])).toEqual(["other:false"]);
    expect(kinds(["Experience in Python and Go", "x"])).toEqual(["other:false"]);
  });

  it.each(["Preferred qualifications:", "What you'll need to succeed"])(
    "reads the posting heading %j",
    (heading) => {
      expect(segmentJob(`${heading}\n- Rust`, DEFAULT_POLICY)[0]?.kind).not.toBe("body");
    },
  );
});
