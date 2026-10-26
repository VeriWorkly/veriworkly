"use client";

import { useRef, useState } from "react";

import type { BaseDocument, ExportFormat } from "@/features/documents/core/types";
import type { PdfCharacterWarningProps } from "./PdfCharacterWarning";

import { trackUsageEvent } from "@/features/analytics/services/usage-metrics";
import { getDocumentExportEventName } from "@/features/analytics/services/document-events";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  docx: "DOCX",
  html: "HTML",
  markdown: "Markdown",
  json: "JSON",
  txt: "Plain text",
};

interface UseDocumentDownloadsOptions {
  /**
   * Resolved at click time, not per render: the resume toolbar builds its `BaseDocument`
   * from live store state, and doing that on every keystroke would be pure waste for a
   * menu the user opens occasionally.
   */
  getDocument: () => BaseDocument | null;
  onMessage: (message: string) => void;
  /** Forwarded to the exporter; see `DocumentExportOptions.previewElementId`. */
  previewElementId?: string;
}

/**
 * The download half of both editor toolbars.
 *
 * Both toolbars hand-rolled this: the `activeDownload` state, the try/finally that clears
 * it, the status-line wording, and — on the resume side only — a second implementation of
 * every format behind its own dynamic imports. That parallel path is gone; there is one
 * entry point (`exportDocumentByType`) and one place that reports the outcome.
 *
 * The dispatcher import stays dynamic. It is cheap itself, but it reaches the registry's
 * `loadExporter`, and keeping the whole chain lazy is what keeps `@react-pdf/renderer`
 * (~1.8MB) and `docx` (~390KB) out of routes that merely list or edit documents.
 */
export function useDocumentDownloads({
  getDocument,
  onMessage,
  previewElementId,
}: UseDocumentDownloadsOptions) {
  const [activeDownload, setActiveDownload] = useState<ExportFormat | null>(null);
  const [pdfWarning, setPdfWarning] = useState<string | null>(null);
  // State lags a render behind a double click; the ref stops a second export starting.
  const busy = useRef(false);

  /**
   * S-288: the embedded fonts have no CJK, Korean, Devanagari, Arabic, Hebrew or Thai
   * glyphs, so the PDF would print those characters as nothing. Ask first; DOCX and HTML
   * keep them. The check only advises: if it fails, the PDF is generated anyway.
   */
  async function downloadPdf(): Promise<void> {
    if (busy.current) return;

    const document = getDocument();

    if (!document) return;

    busy.current = true;
    setActiveDownload("pdf");

    let warning: string | null = null;

    try {
      const { describeUndrawablePdfText, findTextPdfCannotDraw } =
        await import("@/features/documents/export/pdf-unsupported-text");
      const blanks = findTextPdfCannotDraw(document);

      if (blanks.length > 0) warning = describeUndrawablePdfText(blanks);
    } catch (error) {
      console.error("PDF character check failed; exporting without it", error);
    } finally {
      busy.current = false;
      setActiveDownload(null);
    }

    if (warning) {
      setPdfWarning(warning);
      return;
    }

    await download("pdf");
  }

  function fromPdfWarning(format: ExportFormat) {
    return () => {
      setPdfWarning(null);
      void download(format);
    };
  }

  async function download(format: ExportFormat): Promise<void> {
    if (busy.current) return;

    const document = getDocument();

    if (!document) return;

    const label = FORMAT_LABELS[format];

    busy.current = true;
    setActiveDownload(format);

    try {
      const { exportDocumentByType } =
        await import("@/features/documents/export/export-dispatcher");

      await exportDocumentByType(document, format, { previewElementId });

      onMessage(`${label} downloaded successfully`);

      // Type-aware, so cover letter exports are finally counted. Previously only the
      // resume toolbar tracked anything, which made cover letter exports invisible.
      void trackUsageEvent({ event: getDocumentExportEventName(document.type) });
    } catch (error) {
      const reason = error instanceof Error && error.message ? ` ${error.message}` : "";

      console.error(`${label} export failed`, error);
      onMessage(`Could not generate ${label}.${reason} Try again.`);
    } finally {
      busy.current = false;
      setActiveDownload(null);
    }
  }

  return {
    activeDownload,
    pdfWarning: {
      message: pdfWarning,
      onClose: () => setPdfWarning(null),
      onDownloadPdf: fromPdfWarning("pdf"),
      onDownloadDocx: fromPdfWarning("docx"),
      onDownloadHtml: fromPdfWarning("html"),
    } satisfies PdfCharacterWarningProps,
    onDownloadPdf: downloadPdf,
    onDownloadDocx: () => download("docx"),
    onDownloadHtml: () => void download("html"),
    onDownloadText: () => void download("txt"),
    onDownloadJson: () => void download("json"),
    onDownloadMarkdown: () => void download("markdown"),
  };
}
