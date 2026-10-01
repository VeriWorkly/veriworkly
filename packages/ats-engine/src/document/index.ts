/**
 * @veriworkly/ats-engine/document — building structured resume input.
 *
 * Dependency-free, so an editor can assemble an `AtsResumeDocument` in the browser without
 * bundling the scorer. Validation happens in the engine when the document is scored.
 */

export {
  ATS_DOCUMENT_FORMAT,
  DOCUMENT_LIMITS,
  isResumeDocument,
  type AtsDocumentBasics,
  type AtsDocumentEducation,
  type AtsDocumentEntry,
  type AtsDocumentProject,
  type AtsDocumentRole,
  type AtsDocumentSection,
  type AtsDocumentSkillGroup,
  type AtsResumeDocument,
} from "./types.js";
export { renderResumeDocument } from "./render.js";
export { fromJsonResume, isJsonResume } from "./jsonResume.js";
