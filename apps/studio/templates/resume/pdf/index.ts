import type { ComponentType } from "react";

import type { PdfTemplateProps } from "./types";

import { resumeTemplateRegistry } from "@/templates/resume/registry";

/**
 * Resolves a resume's PDF renderer on demand.
 *
 * Async, and deliberately so: eagerly importing every PDF template here is what
 * pulled `@react-pdf/renderer` into every route that touched this module. Callers are
 * export paths and the debug route, both of which are already asynchronous.
 */
export function loadTemplatePdfComponentById(
  id: string | undefined,
): Promise<ComponentType<PdfTemplateProps>> {
  return resumeTemplateRegistry.loadPdf(id);
}

/** Template ids that have a PDF renderer — used by contract and parity suites. */
export const pdfTemplateIds: string[] = resumeTemplateRegistry.ids;

export type { PdfTemplateProps };
