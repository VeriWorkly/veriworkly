import type { AtsParsedResume, AtsReport } from "#services/ats/types";

/**
 * Inputs for the wire-compatibility check (`ai-wire.test.ts`).
 *
 * `ai-wire-bodies.json` holds the exact request bodies the OpenAI-SDK call sites sent for these
 * inputs before they moved onto `@veriworkly/ats-engine/ai`. The migrated path must send the
 * same bytes, so a refactor cannot quietly change what production asks the model for.
 *
 * Deliberately free of contact details: analysis redacts those before sending, so a resume with
 * none is the one input where the pre-migration and post-migration bodies must be identical.
 */
const resumeText = [
  "Senior Engineer",
  "Acme Corporation",
  "2019 - 2023",
  "Built payment systems in TypeScript and Go.",
].join("\n");

const jobDescription = "We need TypeScript, Kubernetes and payments experience.";

/**
 * The empty parse as the engine shaped it when `ai-wire-bodies.json` was recorded, before it
 * recovered certifications and spoken languages. The wire report keeps this shape so the recorded
 * bytes still match.
 */
const RECORDED_EMPTY_PARSED: Omit<
  AtsParsedResume,
  "certifications" | "spokenLanguages" | "highestIsced" | "provenance"
> & {
  provenance: Omit<AtsParsedResume["provenance"], "certifications" | "spokenLanguages">;
} = {
  name: "",
  email: "",
  phone: "",
  links: [],
  roles: [],
  education: [],
  skills: [],
  monthsOfExperience: null,
  provenance: {
    name: "none",
    email: "none",
    phone: "none",
    roles: "none",
    education: "none",
    skills: "none",
  },
};

/** A parse that found nothing: the shape every report carries, with no contact details in it. */
export const EMPTY_PARSED: AtsParsedResume = {
  ...RECORDED_EMPTY_PARSED,
  certifications: [],
  spokenLanguages: [],
  highestIsced: null,
  provenance: {
    ...RECORDED_EMPTY_PARSED.provenance,
    certifications: "none",
    spokenLanguages: "none",
  },
};

const report = {
  version: "ats-v2",
  readinessScore: 72,
  jobMatchScore: 40,
  matchedKeywords: ["typescript", "payments"],
  missingKeywords: ["kubernetes"],
  parsingWarnings: [],
  strengths: ["Clear structure"],
  failedChecks: [],
  prioritizedFixes: [],
  rules: [],
  categories: [],
  checksPassed: 0,
  checksTotal: 0,
  wordCount: 120,
  parsed: RECORDED_EMPTY_PARSED,
} as unknown as AtsReport;

export const WIRE_INPUTS = { resumeText, jobDescription, report };
