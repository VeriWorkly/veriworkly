import { pdf } from "@react-pdf/renderer";

import type { BaseDocument, ExportFormat } from "@/features/documents/core/types";

import { downloadBlob } from "@/features/documents/export/download";
import { exportResumeAsPdf } from "@/features/documents/export/export-pdf";
import { exportDocumentAsDocx, exportResumeAsDocx } from "@/features/documents/export/export-docx";
import { exportResumeAsHtml } from "@/features/documents/export/export-html";
import { exportResumeAsJson } from "@/features/documents/export/export-json";
import { exportResumeAsText } from "@/features/documents/export/export-text";
import { exportResumeAsMarkdown } from "@/features/documents/export/export-markdown";

import { InvoicePdf } from "@/features/invoice/render/pdf";
import { CoverLetterPdf } from "@/templates/cover-letter/pdf";
import { registerPdfFontById } from "@/templates/pdf/fonts";
import { FormalLetterPdf } from "@/features/formal-letter/render/pdf";
import {
  buildCoverLetterHtml,
  buildCoverLetterMarkdown,
  buildCoverLetterText,
} from "@/templates/cover-letter/web";
import type { CoverLetterContent } from "@/features/cover-letter/types";
import { escapeHtml } from "@/features/resume/services/resume-formatters";
import { getDocumentFileBaseName } from "./export-file-names";

function toTextDocument(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

export async function exportDocumentByType(
  document: BaseDocument,
  format: ExportFormat,
): Promise<void> {
  const fileBase = getDocumentFileBaseName(document);

  if (document.type === "RESUME") {
    if (format === "pdf") return exportResumeAsPdf(document.content as never);
    if (format === "docx") return exportResumeAsDocx(document.content as never);
    if (format === "html") return exportResumeAsHtml(document.content as never);
    if (format === "markdown") return exportResumeAsMarkdown(document.content as never);
    if (format === "json") return exportResumeAsJson(document.content as never);
    if (format === "txt") return exportResumeAsText(document.content as never);

    return;
  }

  if (format === "json") {
    downloadBlob(
      new Blob([JSON.stringify(document.content, null, 2)], { type: "application/json" }),
      `${fileBase}.json`,
    );

    return;
  }

  if (format === "docx") {
    return exportDocumentAsDocx(document);
  }

  if (format === "html") {
    const html =
      document.type === "COVER_LETTER"
        ? buildCoverLetterHtml(document.content as CoverLetterContent, document.templateId)
        : `<!doctype html><html><body><pre>${escapeHtml(toTextDocument(document.content))}</pre></body></html>`;

    downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${fileBase}.html`);

    return;
  }

  if (format === "txt" || format === "markdown") {
    const text =
      document.type === "COVER_LETTER"
        ? format === "markdown"
          ? buildCoverLetterMarkdown(document.content as never)
          : buildCoverLetterText(document.content as never)
        : toTextDocument(document.content);

    downloadBlob(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
      `${fileBase}.${format === "txt" ? "txt" : "md"}`,
    );

    return;
  }

  if (format === "pdf") {
    if (document.type === "COVER_LETTER") {
      registerPdfFontById((document.content as CoverLetterContent).appearance?.fontFamily);
    }

    const renderer =
      document.type === "COVER_LETTER" ? (
        <CoverLetterPdf content={document.content as never} templateId={document.templateId} />
      ) : document.type === "FORMAL_LETTER" ? (
        <FormalLetterPdf content={document.content as never} />
      ) : (
        <InvoicePdf content={document.content as never} />
      );

    const blob = await pdf(renderer).toBlob();
    downloadBlob(blob, `${fileBase}.pdf`);

    return;
  }
}
