"use client";

import type { ResumeData } from "@/types/resume";

import {
  safeText,
  formatDateRange,
  sanitizeFileName,
  escapeHtml,
} from "@/features/documents/utils/formatters";

export { safeText, formatDateRange, sanitizeFileName, escapeHtml };

export function getResumeTitle(resume: ResumeData): string {
  return resume.basics.fullName.trim() || "Untitled Resume";
}

export function getResumeFileBaseName(resume: ResumeData): string {
  return sanitizeFileName(resume.basics.fullName) || "resume";
}

export function getVisibleSectionMap(resume: ResumeData): Map<string, boolean> {
  return new Map(resume.sections.map((section) => [section.id, section.visible]));
}

export function isSectionVisible(
  visibleSections: Map<string, boolean>,
  sectionId: string,
): boolean {
  return visibleSections.get(sectionId) ?? true;
}
