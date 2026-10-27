import { describe, expect, it } from "vitest";

import { check, DEFAULT_POLICY } from "@veriworkly/ats-engine";

import { toAtsDocument } from "@/features/ats/resume-document";
import { defaultResume } from "@/features/resume/constants/default-resume";

/** Certificates and languages reach the engine as its own rows, so it can judge them. */
function sample() {
  const resume = structuredClone(defaultResume);
  resume.certificates = [
    {
      ...({} as (typeof resume.certificates)[number]),
      id: "c1",
      title: "AWS Certified Solutions Architect – Associate",
      issuer: "Amazon Web Services",
      date: "2023-05",
      website: "",
      referenceId: "",
      description: "",
    },
  ];
  resume.languages = [
    { id: "l1", language: "German", fluency: "limited" },
    { id: "l2", language: "English", fluency: "native" },
  ];
  return resume;
}

describe("certificates and languages in the ATS document", () => {
  it("are sent as certification and language rows", () => {
    const sections = toAtsDocument(sample()).sections;
    expect(sections.find((s) => s.kind === "certifications")).toMatchObject({
      items: [
        {
          name: "AWS Certified Solutions Architect – Associate",
          issuer: "Amazon Web Services",
          date: "2023-05",
        },
      ],
    });
    expect(sections.find((s) => s.kind === "languages")).toMatchObject({
      items: [
        { language: "German", level: "limited working proficiency" },
        { language: "English", level: "native" },
      ],
    });
  });

  it("are filed by the engine with their levels", () => {
    const report = check(toAtsDocument(sample()), DEFAULT_POLICY);
    expect(report.parsed.certifications.map((row) => row.issuer)).toEqual(["Amazon Web Services"]);
    expect(report.parsed.spokenLanguages.map((row) => row.cefr)).toEqual(["B1", "C2"]);
  });
});

describe("S-296: renamed headings in the ATS document", () => {
  it("S-296: keeps each section on its id and its standard heading, so the score does not move", () => {
    const renamed = sample();
    renamed.sections = renamed.sections.map((section) =>
      section.id === "experience"
        ? { ...section, label: "Berufserfahrung" }
        : section.id === "certifications"
          ? { ...section, label: "Zertifikate" }
          : section,
    );

    const sections = toAtsDocument(renamed).sections;

    expect(sections.find((s) => s.kind === "experience")?.title).toBe("Experience");
    expect(sections.find((s) => s.kind === "certifications")?.title).toBe("Certifications");
    expect(check(toAtsDocument(renamed), DEFAULT_POLICY).readinessScore).toBe(
      check(toAtsDocument(sample()), DEFAULT_POLICY).readinessScore,
    );
  });
});
