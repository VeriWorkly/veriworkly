import { describe, expect, it } from "vitest";

import { AtsScoringService, DEFAULT_POLICY, type AtsRequirement } from "../src/index.js";
import { BUILT_IN_LOCALES, withLocales } from "../src/locales/index.js";

const NOW = new Date("2026-10-01T00:00:00Z");

const RESUME = `Jane Doe
jane@example.com | +1 415 555 0142
Experience
Senior Engineer, Acme Corp Jan 2019 - Present
- Built payment services in Go and Kubernetes for 2M users
Engineer, Globex Jan 2016 - Dec 2018
- Built data pipelines with Python and Kafka
Education
B.S. Computer Science, State University 2015
Skills
Go, Python, Kubernetes, Terraform, PostgreSQL
Languages
English (native), Spanish (professional)`;

const judge = (job: string, resume = RESUME, policy = DEFAULT_POLICY) =>
  AtsScoringService.check(resume, policy, { jobDescription: job, now: NOW }).requirements;
const one = (line: string, resume?: string) =>
  judge(`Requirements\n- ${line}`, resume)[0] as AtsRequirement;

describe("requirements", () => {
  it("reads each line under the posting's headings, with its importance", () => {
    const found = judge(
      "Senior Engineer\nRequirements\n- Go\n- Kubernetes\nNice to have\n- Terraform",
    );
    expect(found.map((r) => [r.text, r.importance])).toEqual([
      ["Go", "required"],
      ["Kubernetes", "required"],
      ["Terraform", "preferred"],
    ]);
  });

  it("falls back to the bullets of a posting with no headings", () => {
    expect(judge("We need someone great.\n- Go services\n- Kubernetes").map((r) => r.text)).toEqual(
      ["Go services", "Kubernetes"],
    );
  });

  it("is empty without a posting", () => {
    expect(AtsScoringService.check(RESUME, DEFAULT_POLICY, { now: NOW }).requirements).toEqual([]);
  });
});

describe("skills", () => {
  it("is met with the resume's own lines as evidence, work history before the skills list", () => {
    expect(one("Experience with Kubernetes and Terraform")).toMatchObject({
      kind: "skills",
      status: "met",
      terms: [
        { term: "kubernetes", found: true },
        { term: "terraform", found: true },
      ],
      evidence: [
        "Built payment services in Go and Kubernetes for 2M users",
        "Go, Python, Kubernetes, Terraform, PostgreSQL",
      ],
    });
  });

  it("takes either side of an alternative, even one that opens the line", () => {
    expect(one("Kafka or RabbitMQ")).toMatchObject({
      status: "met",
      evidence: ["Built data pipelines with Python and Kafka"],
    });
  });

  it("is partial with some and missing with none", () => {
    expect(one("Go and Rust").status).toBe("partial");
    expect(one("Strong experience with AWS and Rust")).toMatchObject({
      status: "missing",
      evidence: [],
    });
  });
});

describe("knockouts", () => {
  it("compares years with the work history", () => {
    expect(one("5+ years of backend experience")).toMatchObject({
      kind: "experience",
      detail: "10 years in the work history, 5 asked",
    });
    expect(one("12+ years of experience")).toMatchObject({
      status: "missing",
      detail: "10 years in the work history, 12 asked",
    });
  });

  it("compares a degree by level, and lets stated equivalence stand in for one", () => {
    expect(one("Bachelor's degree in Computer Science")).toMatchObject({
      kind: "education",
      status: "met",
    });
    expect(one("Master's degree required")).toMatchObject({ status: "missing" });
    expect(one("Master's degree or equivalent experience")).toMatchObject({
      status: "partial",
      detail:
        "Bachelor's or equivalent read; Master's or equivalent asked, or equivalent experience",
    });
  });

  it("finds a language the resume names", () => {
    expect(one("Fluent in Spanish")).toMatchObject({ kind: "language", status: "met" });
    expect(one("Fluent in German")).toMatchObject({ kind: "language", status: "missing" });
  });

  it("leaves the right to work and a clearance unverifiable unless the resume states them", () => {
    expect(one("Must be authorized to work in the United States")).toMatchObject({
      kind: "authorization",
      status: "unverifiable",
    });
    expect(
      one("Active security clearance", `${RESUME}\nActive TS/SCI security clearance`),
    ).toMatchObject({
      kind: "clearance",
      status: "met",
    });
  });

  it("reads a German posting with the German pack", () => {
    const policy = withLocales(DEFAULT_POLICY, BUILT_IN_LOCALES);
    const found = judge(
      "Ihr Profil\n- Mindestens 3 Jahre Berufserfahrung in der Backend-Entwicklung mit Go\n- Abgeschlossenes Studium der Informatik oder vergleichbare Qualifikation\n- Verhandlungssichere Englischkenntnisse\n- Gültige Arbeitserlaubnis für Deutschland",
      RESUME,
      policy,
    );
    expect(found.map((r) => [r.kind, r.status])).toEqual([
      ["experience", "met"],
      ["education", "met"],
      ["language", "met"],
      ["authorization", "unverifiable"],
    ]);
  });
});

describe("cost", () => {
  it("stays bounded on thousands of lines under a policy with hundreds of phrases", () => {
    const policy = {
      ...DEFAULT_POLICY,
      keywordMatch: {
        ...DEFAULT_POLICY.keywordMatch,
        phrases: Array.from({ length: 400 }, (_, i) => `made up phrase ${i}`),
      },
    };
    const resume = Array.from({ length: 6_000 }, (_, i) => `- go k8s ${i}`).join("\n");
    const job = `Requirements\n${Array.from({ length: 30 }, (_, i) => `- Go, Kubernetes and tool${i}`).join("\n")}`;
    const started = performance.now();
    expect(judge(job, resume, policy)).toHaveLength(25);
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});
