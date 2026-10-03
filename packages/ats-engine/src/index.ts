/**
 * @veriworkly/ats-engine — deterministic resume scoring.
 *
 * A resume in (text, a structured document, or text plus layout signals), a report out. The
 * package holds no I/O, no authentication, no HTTP, and no state: extracting text from a PDF,
 * calling a model, and deciding who may see what are the host's job, which is what keeps this
 * runnable in a browser as well as on a server.
 *
 * Everything language-bound — month names, degree spellings, section headings, stopwords, title
 * words, action verbs — lives in the policy rather than in this source.
 *
 * Subpaths:
 * - `/document` (building structured input), `/format` (display helpers) and `/job` (job text
 *   from a web page) are dependency-free for browser bundles.
 * - `/ai` runs the model-backed tasks with any provider (`/ai/openai-compatible`,
 *   `/ai/anthropic`); `/ai/testing` has test doubles and the eval harness.
 * - `/locales` reads resumes in German and Hindi and from the US, Germany and India
 *   (`withLocales`), and is how a language or a country is contributed.
 * - `/node` reads PDF, DOCX and text files on Node — text, layout, hidden text — and `/node/child`
 *   is a forkable extraction process. The `ats-engine` CLI scores a file from the command line.
 */

export type {
  AtsCategoryScore,
  AtsDegreeLevel,
  AtsIscedLevel,
  AtsLayoutSignals,
  AtsParsedDate,
  AtsParsedEducation,
  AtsParsedField,
  AtsParsedResume,
  AtsParsedRole,
  AtsProvenance,
  AtsReport,
  AtsRequirement,
  AtsRuleResult,
  AtsSeverity,
} from "./types.js";

// Policy
export { AtsPolicyError, type AtsPolicyIssue } from "./policy/errors.js";
export { parseAtsPolicy } from "./policy/parse.js";
export type { AtsEnginePolicy, AtsEnginePolicyInput, AtsEngineRule } from "./policy/schema.js";
export { DEFAULT_POLICY } from "./policy/default.js";
export { policyFingerprint } from "./policy/fingerprint.js";
export { ENGINE_VERSION } from "./version.js";

// Input
export { AtsInputError, prepareResume, type AtsResumeInput, type PreparedResume } from "./input.js";
export * from "./document/index.js";

// Scoring
export { parseQuality, parseResume } from "./parser/index.js";
export { AtsScoringService, type AtsCheckOptions } from "./scoring/engine.js";
export type { AtsLocale, AtsLocaleOptions } from "./locales/resolve.js";
export { computeVerdict, type AtsVerdict } from "./scoring/verdict.js";
export { policyRubric, type AtsRubricEntry } from "./scoring/rubric.js";

// Presentation of a report at a chosen level of detail
export {
  shapeReport,
  type AtsFullReport,
  type AtsReportDetail,
  type AtsRestrictedReport,
  type AtsShapedReport,
} from "./report/shape.js";

// AI parse repair: when to offer it and what to accept from it
export {
  findGroundingViolations,
  isGrounded,
  normalizeForGrounding,
  type GroundingViolation,
} from "./repair/grounding.js";
export {
  mergeGrounded,
  needsRepair,
  type AtsRepairCandidate,
  type MergeOptions,
  type MergeResult,
} from "./repair/merge.js";
