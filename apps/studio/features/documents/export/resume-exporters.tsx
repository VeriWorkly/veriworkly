// Client-only for the same reason as cover-letter-exporters.tsx: these run in the
// browser, and the module is reached from registry.tsx which server components import.
"use client";

import type { BaseDocument, ExportFormat } from "@/features/documents/core/types";
import type { DocumentExportOptions } from "@/features/documents/core/definition";
import type { ResumeData } from "@/types/resume";

import { exportResumeAsPdf } from "@/features/documents/export/export-pdf";
import { exportResumeAsDocx } from "@/features/documents/export/export-docx";
import { exportResumeAsHtml } from "@/features/documents/export/export-html";
import { exportResumeAsJson } from "@/features/documents/export/export-json";
import { exportResumeAsText } from "@/features/documents/export/export-text";
import { exportResumeAsMarkdown } from "@/features/documents/export/export-markdown";

function assertNever(value: never, context: string): never {
  throw new Error(`${context}: unhandled case ${JSON.stringify(value)}`);
}

/**
 * Resume export handlers.
 *
 * Split out of the old combined dispatcher so that this module — and the
 * `@react-pdf/renderer` + resume PDF templates it pulls in — is only ever reached
 * through `DocumentDefinition.loadExporter`'s dynamic `import()`. Downloading a
 * resume must not load the cover letter templates, and listing documents must not
 * load either.
 */
export async function exportResumeDocument(
  document: BaseDocument,
  format: ExportFormat,
  options?: DocumentExportOptions,
): Promise<void> {
  const content = document.content as ResumeData;

  switch (format) {
    case "pdf":
      return exportResumeAsPdf(content);
    case "docx":
      return exportResumeAsDocx(content);
    case "html":
      /*
       * Resolution of the HTML divergence (VW-04/VW-07): resume HTML export stays
       * **WYSIWYG** wherever a rendered preview exists, because that is the output every
       * existing user already gets from the editor and it reflects the template they chose.
       *
       * `previewElementId` is absent on surfaces with nothing rendered to scrape (the
       * document list, a share page), and `exportResumeAsHtml` falls back to generating the
       * document from `ResumeData` there. One exporter, one decision point.
       */
      return exportResumeAsHtml(content, options?.previewElementId);
    case "markdown":
      return exportResumeAsMarkdown(content);
    case "json":
      return exportResumeAsJson(content);
    case "txt":
      return exportResumeAsText(content);
    default:
      return assertNever(format, "exportResumeDocument");
  }
}
