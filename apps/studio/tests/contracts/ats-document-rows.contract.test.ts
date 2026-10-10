import { describe, expect, it } from "vitest";

import { AtsScoringService, DEFAULT_POLICY } from "@veriworkly/ats-engine";

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
    const report = AtsScoringService.check(toAtsDocument(sample()), DEFAULT_POLICY);
    expect(report.parsed.certifications.map((row) => row.issuer)).toEqual(["Amazon Web Services"]);
    expect(report.parsed.spokenLanguages.map((row) => row.cefr)).toEqual(["B1", "C2"]);
  });
});
