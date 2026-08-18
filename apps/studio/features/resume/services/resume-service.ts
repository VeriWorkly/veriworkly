"use client";

export {
  saveResume,
  resetResume,
  createResume,
  deleteResume,
  readResumeById,
  loadResumeById,
  listSavedResumes,
  deleteResumeById,
  toResumeDocument,
  setAllResumesSyncEnabled,
  type ResumeListItem,
} from "./resume-core";

/**
 * Only the lazy dispatcher is re-exported here — never the export barrel.
 *
 * `export * from "@/features/documents/export"` used to sit on this line, which meant
 * importing anything from this module (e.g. `deleteResumeById` on the dashboard) pulled
 * `@react-pdf/renderer` + `docx` into that route's bundle: ~2.2MB on the document list
 * and the dashboard overview, neither of which exports anything.
 */
export { exportDocumentByType } from "@/features/documents/export/export-dispatcher";

export {
  safeText,
  escapeHtml,
  getResumeTitle,
  formatDateRange,
  isSectionVisible,
  sanitizeFileName,
  getResumeFileBaseName,
} from "./resume-formatters";

export { importResumeFromMarkdownFile, parseResumeMarkdown } from "./resume-markdown-import";

export type { SaveResumeResult, SaveResumeOptions } from "./resume-core";
