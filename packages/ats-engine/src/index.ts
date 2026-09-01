/**
 * @veriworkly/ats-engine — deterministic resume scoring.
 *
 * Text in (plus optional layout signals), entities and a report out. The package holds no I/O,
 * no authentication, no HTTP, and no state: extracting text from a PDF or a DOCX is the host's
 * job, which is what keeps this runnable in a browser as well as on a server.
 *
 * Everything language-bound — month names, degree spellings, section headings, stopwords, title
 * words, action verbs — lives in the policy rather than in this source, so supporting another
 * language is a data file rather than a rewrite.
 */

export type {
  AtsCategoryScore,
  AtsDegreeLevel,
  AtsLayoutSignals,
  AtsParsedDate,
  AtsParsedEducation,
  AtsParsedResume,
  AtsParsedRole,
  AtsReport,
  AtsRuleResult,
  AtsSeverity,
} from "./types.js";

export { AtsPolicyError, type AtsPolicyIssue } from "./policy/errors.js";
export { parseAtsPolicy } from "./policy/parse.js";
export { atsEngineSchema, type AtsEnginePolicy, type AtsEngineRule } from "./policy/schema.js";
export { DEFAULT_POLICY } from "./policy/default.js";

export { parseQuality, parseResume } from "./parser/index.js";

export { AtsScoringService } from "./scoring/engine.js";
export { computeVerdict, type AtsVerdict } from "./scoring/verdict.js";
