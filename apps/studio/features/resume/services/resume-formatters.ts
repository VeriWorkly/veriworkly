"use client";

import type { ResumeData } from "@/types/resume";

import {
  safeText,
  formatDateRange,
  sanitizeFileName,
  escapeHtml,
} from "@/features/documents/utils/formatters";
import { titleFileName } from "@/features/documents/export/export-file-names";

export { safeText, formatDateRange, escapeHtml };

/** The resume's own title, else the person's name: never the default "untitled-resume" (S-396). */
export function getResumeFileBaseName(resume: ResumeData): string {
  return titleFileName(resume.title) || sanitizeFileName(resume.basics.fullName) || "resume";
}
