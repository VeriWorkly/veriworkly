import { describe, expect, it } from "vitest";

import { AtsScoringService, DEFAULT_POLICY, type AtsReport } from "../src/index.js";

const NOW = new Date("2026-10-01T00:00:00Z");
const check = (text: string) => AtsScoringService.check(text, DEFAULT_POLICY, { now: NOW });
const rule = (report: AtsReport, id: string) =>
  report.rules.find((r) => r.id === `ats-v2.content.${id}`);
const HEAD = "Jane Doe\njane@example.com | +1 415 555 0142\nEXPERIENCE\n";

describe("timeline", () => {
  it("flags a role that starts after today", () => {
    const found = rule(
      check(`${HEAD}Engineer, Acme Jan 2028 - Present\n- Built things`),
      "timeline",
    );
    expect(found).toMatchObject({ passed: false, severity: "info", scoreImpact: 3 });
    expect(found?.evidence).toContain("Jan 2028, after today");
  });

  it("flags three roles held at once for months", () => {
    const text = `${HEAD}Engineer, Acme Jan 2020 - Present
Advisor, Globex Mar 2020 - Present
Mentor, Initech Jun 2020 - Present
`;
    expect(rule(check(text), "timeline")?.evidence).toContain(
      "more than 2 roles overlap from 2020",
    );
  });

  it.each([
    ["two roles at once", "Engineer, Acme Jan 2020 - Present\nAdvisor, Globex Mar 2020 - Present"],
    [
      "three roles meeting for two months",
      "Engineer, Acme Jan 2020 - Mar 2021\nLead, Globex Feb 2021 - Present\nAdvisor, Initech Feb 2021 - Present",
    ],
    [
      "a gap between roles",
      "Engineer, Acme Jan 2015 - Dec 2016\nEngineer, Globex Jan 2020 - Present",
    ],
  ])("leaves %s alone", (_, roles) => {
    expect(rule(check(`${HEAD}${roles}\n`), "timeline")?.passed).toBe(true);
  });
});

describe("skills without evidence", () => {
  const SKILLS = "SKILLS\nPython, Kubernetes, Terraform, Rust";

  it("flags a list the rest of the resume never backs, naming the skills", () => {
    const found = rule(
      check(`${HEAD}Engineer, Acme Jan 2020 - Present\n- Built Python services\n${SKILLS}`),
      "skillEvidence",
    );
    expect(found).toMatchObject({ passed: false, severity: "info" });
    expect(found?.evidence).toBe(
      "75% of listed skills appear nowhere but the skills list, such as Kubernetes, Terraform, Rust.",
    );
  });

  it("counts a project as evidence", () => {
    const text = `${HEAD}Engineer, Acme Jan 2020 - Present
- Built Python services on Kubernetes
PROJECTS
Infra kit
- Terraform modules and a Rust CLI
${SKILLS}`;
    expect(rule(check(text), "skillEvidence")?.passed).toBe(true);
  });

  it("does not judge a list of two", () => {
    expect(
      rule(check(`${HEAD}Engineer, Acme Jan 2020 - Present\nSKILLS\nGo, Rust`), "skillEvidence"),
    ).toBeUndefined();
  });
});
