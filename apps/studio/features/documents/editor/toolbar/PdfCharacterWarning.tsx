"use client";

import { Button, Modal } from "@veriworkly/ui";

export interface PdfCharacterWarningProps {
  /** The sentence naming the fields and characters; null while the dialog is closed. */
  message: string | null;
  onClose: () => void;
  onDownloadPdf: () => void;
  onDownloadDocx: () => void;
  onDownloadHtml: () => void;
}

/**
 * Shown before a PDF export that would leave characters blank. DOCX and HTML keep them,
 * because Word and the browser fall back to a system font where the PDF has only what it
 * embeds.
 */
export function PdfCharacterWarning({
  message,
  onClose,
  onDownloadPdf,
  onDownloadDocx,
  onDownloadHtml,
}: PdfCharacterWarningProps) {
  return (
    <Modal open={message !== null} onClose={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>Some characters will not show in the PDF</Modal.Title>
          <Modal.Description>{message}</Modal.Description>
        </Modal.Header>

        <Modal.Footer>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="secondary" onClick={onDownloadPdf}>
            Download PDF anyway
          </Button>
          <Button size="sm" variant="secondary" onClick={onDownloadHtml}>
            Download HTML
          </Button>
          <Button size="sm" onClick={onDownloadDocx}>
            Download DOCX
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
