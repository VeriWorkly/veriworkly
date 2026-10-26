// Exporting touches Blob/anchor download APIs and pulls in the cover letter preview
// module (which uses React hooks), so this is a client-only module. Required because
// `DocumentDefinition.loadExporter` is referenced from registry.tsx, which is itself
// reachable from server components.
"use client";

import type { BaseDocument, ExportFormat } from "@/features/documents/core/types";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { downloadBlob } from "@/features/documents/export/download";
import { getDocumentFileBaseName } from "./export-file-names";

function assertNever(value: never, context: string): never {
  throw new Error(`${context}: unhandled case ${JSON.stringify(value)}`);
}

/**
 * Cover letter export handlers. Reached only through
 * `DocumentDefinition.loadExporter`'s dynamic `import()`. Like resume-exporters.tsx, each format
 * imports its own module when it runs, so JSON, Markdown and text never download
 * `@react-pdf/renderer` or `docx`.
 */
export async function exportCoverLetterDocument(
  document: BaseDocument,
  format: ExportFormat,
): Promise<void> {
  const content = document.content as CoverLetterContent;
  const fileBase = getDocumentFileBaseName(document);

  switch (format) {
    case "json": {
      // The envelope, so a re-import keeps the template and title. Without `sync`: a file
      // carries no cloud identity (import mints a new one anyway).
      const { sync, ...envelope } = document;
      void sync;

      downloadBlob(
        new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" }),
        `${fileBase}.json`,
      );
      return;
    }
    case "docx": {
      const { exportCoverLetterAsDocx } = await import("@/features/documents/export/export-docx");
      return exportCoverLetterAsDocx(document);
    }
    case "html": {
      const { buildCoverLetterHtml } = await import("@/templates/cover-letter/web");
      const html = await buildCoverLetterHtml(content, document.templateId);
      downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${fileBase}.html`);
      return;
    }
    case "markdown": {
      const { buildCoverLetterMarkdown } = await import("@/templates/cover-letter/web");
      const text = buildCoverLetterMarkdown(content);
      downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${fileBase}.md`);
      return;
    }
    case "txt": {
      const { buildCoverLetterText } = await import("@/templates/cover-letter/web");
      const text = buildCoverLetterText(content);
      downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${fileBase}.txt`);
      return;
    }
    case "pdf": {
      const [{ pdf }, { createCoverLetterPdfElement }, { registerCoverLetterPdfFont }] =
        await Promise.all([
          import("@react-pdf/renderer"),
          import("@/templates/cover-letter/pdf"),
          import("@/templates/pdf/fonts"),
        ]);
      registerCoverLetterPdfFont(content);
      const renderer = await createCoverLetterPdfElement({
        content,
        templateId: document.templateId,
      });
      const blob = await pdf(renderer).toBlob();
      downloadBlob(blob, `${fileBase}.pdf`);
      return;
    }
    default:
      return assertNever(format, "exportCoverLetterDocument");
  }
}
