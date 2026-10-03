import { describe, expect, it } from "vitest";

import { AtsScoringService, DEFAULT_POLICY, parseResume } from "../src/index.js";

/**
 * Layouts that real PDF exports extract to, as opposed to text written by hand.
 *
 * Every input here is what pdf.js produced from one of Studio's templates (or a shape common in
 * design-tool exports), trimmed to the lines that matter. Each one used to lose a field the
 * resume plainly has.
 */

const NOW = new Date("2026-09-30T00:00:00Z");
const check = (text: string) => AtsScoringService.check(text, DEFAULT_POLICY, { now: NOW });
const parse = (text: string) => parseResume(text.split("\n"), DEFAULT_POLICY, NOW);
const failed = (text: string) => check(text).failedChecks.map((rule) => rule.id);

const HEAD = "Jane Doe\njane@example.com | 415-555-0199\n";

describe("letter-spaced headings", () => {
  const spaced = `${HEAD}S U M M A R Y
Engineer building developer tools.
E X P E R I E N C E
Senior Engineer, Acme Corporation Jan 2020 - Present
• Built the billing platform.
E D U C AT I O N
BSc Computer Science, State University 2012 - 2016
S K I L L S
TypeScript, Go, SQL
`;

  it("finds the sections a tracked heading opens", () => {
    const report = check(spaced);
    expect(report.parsed.skills).toEqual(["TypeScript", "Go", "SQL"]);
    expect(report.parsed.education).toHaveLength(1);
    expect(failed(spaced)).not.toContain("ats-v2.structure.experience");
    expect(failed(spaced)).not.toContain("ats-v2.structure.education");
    expect(failed(spaced)).not.toContain("ats-v2.structure.skills");
  });

  it("still warns, because parsers that keep the spaces lose the heading", () => {
    const report = check(spaced);
    const rule = report.failedChecks.find((r) => r.id === "ats-v2.format.letterSpacing");
    expect(rule?.evidence).toMatch(/^4 lines/);
    expect(report.parsingWarnings).toContain(rule?.evidence);

    const tight = spaced.replace(/^(?:\p{Lu} ?)+$/gmu, (heading) => heading.replace(/ /g, ""));
    expect(tight).toContain("\nEDUCATION\n");
    expect(failed(tight)).not.toContain("ats-v2.format.letterSpacing");
  });

  it("reads a lightly tracked heading split by kerning", () => {
    const text = `${HEAD}SU MMARY\nEngineer.\nEXPERIENCE\nEngineer, Acme Jan 2020 - Present\nPROJ ECTS\nThing\nSKILLS\nGo\n`;
    expect(check(text).parsed.skills).toEqual(["Go"]);
    expect(failed(text)).toContain("ats-v2.format.letterSpacing");
  });

  // The exact lines pdf.js, Poppler and PDFBox produced from react-pdf headings at 0.1-0.22em.
  it.each([
    ["pdf.js, wide tracking", "W O R K E X P E R I E N C E", "T E C H N I C A L S K I L L S"],
    ["PDFBox, near the threshold", "WOR K EXPE RIENCE", "TECH NICAL S KILLS"],
    [
      "an extractor that keeps word gaps",
      "W O R K   E X P E R I E N C E",
      "T E C H N I C A L   S K I L L S",
    ],
  ])("reads a multi-word tracked heading (%s)", (_, experience, skills) => {
    const text = `${HEAD}${experience}\nEngineer, Acme Jan 2020 - Present\n${skills}\nGo, Rust\n`;
    expect(failed(text)).not.toContain("ats-v2.structure.experience");
    expect(check(text).parsed.skills).toEqual(["Go", "Rust"]);
  });

  it("leaves ordinary all-caps lines and initials alone", () => {
    const text =
      "JANE DOE\njane@example.com\nDATA SCIENCE LEAD\nJ R R Tolkien\nEXPERIENCE\nLead, Acme 2020 - 2022\n";
    expect(parse(text).name).toBe("JANE DOE");
    expect(failed(text)).not.toContain("ats-v2.format.letterSpacing");
  });
});

describe("categorised skills", () => {
  const text = `${HEAD}SKILLS
Languages: TypeScript, JavaScript, SQL
Frontend: React, Next.js
Other: System Design
`;

  it("keeps labelled lines inside the skills section and drops the label", () => {
    expect(parse(text).skills).toEqual([
      "TypeScript",
      "JavaScript",
      "SQL",
      "React",
      "Next.js",
      "System Design",
    ]);
  });

  it("still lets a bare heading close the skills section", () => {
    const parsed = parse(`${HEAD}SKILLS\nGo, Rust\nLanguages\nEnglish, Hindi\n`);
    expect(parsed.skills).toEqual(["Go", "Rust"]);
  });

  it("does not strip a colon that is part of a value", () => {
    expect(parse(`${HEAD}SKILLS\nC++, ISO:27001, Go\n`).skills).toEqual(["C++", "ISO:27001", "Go"]);
  });
});

describe("employer beside the title and dates", () => {
  it("reads the employer from the line below", () => {
    const parsed = parse(`${HEAD}EXPERIENCE
Founder & Developer 2025-01 - Present
VeriWorkly | Remote
Building a resume builder focused on speed.
• Built things.
Senior Engineer Jan 2020 - Dec 2024
Acme Corporation, Berlin
• Shipped things.
`);
    expect(parsed.roles.map((role) => [role.title, role.employer])).toEqual([
      ["Founder & Developer", "VeriWorkly"],
      ["Senior Engineer", "Acme Corporation"],
    ]);
  });

  it("reads the employer from the line above", () => {
    const parsed = parse(`${HEAD}EXPERIENCE
Acme Corporation
Senior Engineer Jan 2020 - Present
Berlin, Germany
• Shipped things.
Globex
Engineer Jan 2017 - Dec 2019
• Fixed things.
`);
    expect(parsed.roles.map((role) => [role.title, role.employer])).toEqual([
      ["Senior Engineer", "Acme Corporation"],
      ["Engineer", "Globex"],
    ]);
  });

  it("reads the title from the line below when the employer holds the dates", () => {
    const parsed = parse(
      `${HEAD}EXPERIENCE\nAcme Corporation Jan 2020 - Present\nSenior Engineer\n• Shipped.\n`,
    );
    expect(parsed.roles.map((role) => [role.title, role.employer])).toEqual([
      ["Senior Engineer", "Acme Corporation"],
    ]);
  });

  it("does not take a description line or the next role's header", () => {
    const parsed = parse(`${HEAD}EXPERIENCE
Senior Engineer Jan 2020 - Present
Led the platform team
Staff Engineer, Globex
Jan 2017 - Dec 2019
`);
    expect(parsed.roles.map((role) => [role.title, role.employer])).toEqual([
      ["Senior Engineer", ""],
      ["Staff Engineer", "Globex"],
    ]);
  });

  it("does not hand one employer line to two roles", () => {
    const parsed = parse(`${HEAD}EXPERIENCE
Founder 2025-01 - Present
VeriWorkly
Engineer 2020-01 - 2024-12
`);
    expect(parsed.roles.map((role) => [role.title, role.employer])).toEqual([
      ["Founder", "VeriWorkly"],
      ["Engineer", ""],
    ]);
  });
});

describe("wrapped lines", () => {
  const rule = (text: string, id: string) => check(text).rules.find((r) => r.id === id);
  const bullets = (wrap: boolean) =>
    [
      "Designed and developed a full-featured resume builder with real-time preview and",
      "Built modular editor system enabling dynamic sections, customisation, export and",
      "Led a migration of the billing platform to event sourcing across four teams and",
    ]
      .map((line) => `• ${line}${wrap ? "\n" : " "}multi-template support for 3 regions.`)
      .join("\n");

  it("grades a bullet that wrapped the same as one that did not", () => {
    const wrapped = `${HEAD}EXPERIENCE\nEngineer, Acme Jan 2020 - Present\n${bullets(true)}\n`;
    const whole = `${HEAD}EXPERIENCE\nEngineer, Acme Jan 2020 - Present\n${bullets(false)}\n`;
    for (const id of ["ats-v2.content.verbs", "ats-v2.content.metrics"])
      expect(rule(wrapped, id)?.evidence).toBe(rule(whole, id)?.evidence);
    expect(rule(wrapped, "ats-v2.content.verbs")?.evidence).toMatch(/^100%/);
  });

  it("does not join a line that starts with a lowercase brand or ends a sentence", () => {
    const parsed = parse(`${HEAD}EXPERIENCE
• Shipped the checkout flow used by every merchant on the platform across the region
iOS Engineer, Acme Jan 2020 - Present
• Wrote the release tooling that every team on the platform now deploys through daily.
eBay Marketplace Engineer, eBay 2017 - 2019
`);
    expect(parsed.roles.map((role) => role.title)).toEqual([
      "iOS Engineer",
      "eBay Marketplace Engineer",
    ]);
  });

  it("rejoins a wrap at a hyphen without a space", () => {
    const wrapped = `${HEAD}SUMMARY\nEngineer who builds dependable payment systems with real-\ntime fraud checks.\n`;
    const whole = wrapped.replace("real-\ntime", "real-time");
    expect(check(wrapped).wordCount).toBe(check(whole).wordCount);
  });
});

describe("content lines", () => {
  it("grades the bullets when the resume has them, not the header rows around them", () => {
    const text = `${HEAD}GitHub | LinkedIn | Portfolio | Website
EXPERIENCE
Founder & Developer 2025-01 - Present
VeriWorkly | Remote | Product | Engineering
• Built the editor.
• Designed the export pipeline.
• Led the template rewrite.
`;
    expect(check(text).rules.find((r) => r.id === "ats-v2.content.verbs")?.evidence).toMatch(
      /^100%/,
    );
  });
});

describe("education printed over two lines", () => {
  const education = (body: string) =>
    parse(`${HEAD}EDUCATION\n${body}\nSKILLS\nGo\n`).education.map((entry) => [
      entry.school,
      entry.credential,
      entry.end?.year ?? null,
    ]);

  it("reads a degree over its school as one entry", () => {
    expect(
      education(
        "B.S., Computer Science 2015-09 - 2019-06\nUniversity of Washington\nGraduated with honors.",
      ),
    ).toEqual([["University of Washington", "B.S.", 2019]]);
  });

  it("reads a school over its degree as one entry", () => {
    expect(education("University of Washington 2015 - 2019\nB.S. Computer Science")).toEqual([
      ["University of Washington", "B.S.", 2019],
    ]);
  });

  it("keeps complete entries on consecutive lines apart", () => {
    expect(
      education(
        "M.S. Computer Science, Stanford University 2019 - 2021\nB.S. Mathematics, University of Washington 2015 - 2019",
      ),
    ).toEqual([
      ["Stanford University", "M.S.", 2021],
      ["University of Washington", "B.S.", 2019],
    ]);
  });
});

describe("Word exports", () => {
  it("takes a whole title-and-employer line as the header when the dated line holds a location", () => {
    const parsed = parse(`${HEAD}EXPERIENCE
Founder & Developer - VeriWorkly
2025-01 - Present | Remote
• Built things.
`);
    expect(parsed.roles.map((role) => [role.title, role.employer])).toEqual([
      ["Founder & Developer", "VeriWorkly"],
    ]);
  });

  it("does not read a links list under the skills as skills", () => {
    expect(
      parse(`${HEAD}SKILLS\nGo, Rust\nLinks\nhttps://github.com/jane\nwww.jane.dev\n`).skills,
    ).toEqual(["Go", "Rust"]);
    expect(parse(`${HEAD}SKILLS\nGo, https://github.com/jane, jane@example.com\n`).skills).toEqual([
      "Go",
    ]);
  });
});
