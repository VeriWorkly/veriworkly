"use client";

import { useState } from "react";

import type { BaseDocument, ExportFormat } from "@/features/documents/core/types";

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

  async function download(format: ExportFormat): Promise<void> {
    const document = getDocument();

    if (!document) return;

    const label = FORMAT_LABELS[format];

    setActiveDownload(format);

    try {
      const { exportDocumentByType } =
        await import("@/features/documents/export/export-dispatcher");

      await exportDocumentByType(document, format, { previewElementId });

      onMessage(`${label} downloaded successfully`);

      // Type-aware, so cover letter exports are finally counted. Previously only the
      // resume toolbar tracked anything, which made cover letter exports invisible.
      void trackUsageEvent({ event: getDocumentExportEventName(document.type) });
    } catch {
      onMessage(`Could not generate ${label}. Try again.`);
    } finally {
      setActiveDownload(null);
    }
  }

  return {
    activeDownload,
    onDownloadPdf: () => download("pdf"),
    onDownloadDocx: () => download("docx"),
    onDownloadHtml: () => void download("html"),
    onDownloadText: () => void download("txt"),
    onDownloadJson: () => void download("json"),
    onDownloadMarkdown: () => void download("markdown"),
  };
}
