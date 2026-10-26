"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";

import ToolbarHeader from "@/features/documents/editor/toolbar/ToolbarHeader";
import ToolbarSaveButton from "@/features/documents/editor/toolbar/ToolbarSaveButton";
import ToolbarActionsMenu from "@/features/documents/editor/toolbar/ToolbarActionsMenu";
import ToolbarDownloadMenu from "@/features/documents/editor/toolbar/ToolbarDownloadMenu";
import { useDocumentDownloads } from "@/features/documents/editor/toolbar/useDocumentDownloads";
import { useDocumentJsonImport } from "@/features/documents/editor/toolbar/useDocumentJsonImport";
import { useHiddenFileInput } from "@/features/documents/editor/toolbar/useHiddenFileInput";
import { useSyncNowAction } from "@/features/documents/editor/toolbar/useSyncNowAction";

import { getDocumentPreviewPath } from "@/features/documents/core/routes";
import { getMasterProfileForReset } from "@/features/resume/services/master-profile";

import { useCoverLetterStore } from "@/features/cover-letter/store/cover-letter-store";

interface CoverLetterToolbarProps {
  documentId: string;
  message: string;
  onSave: () => void;
  onSetMessage: (message: string) => void;
  onImportMarkdown: (file: File | undefined) => Promise<void>;
  onOpenShare: () => void;
  onOpenDelete: () => void;
}

/**
 * Structured to match `features/resume/editor/ResumeToolbar.tsx`: an editable title in
 * the header, the shared save button, the shared download menu, and Full Preview /
 * PDF Debug inside the actions menu rather than as loose inline buttons.
 */
export const CoverLetterToolbar = memo(function CoverLetterToolbar({
  documentId,
  message,
  onSave,
  onSetMessage,
  onImportMarkdown,
  onOpenShare,
  onOpenDelete,
}: CoverLetterToolbarProps) {
  const router = useRouter();

  // Only what the toolbar shows: subscribing to the whole letter re-rendered it on every
  // keystroke and defeated `memo`. The export reads the letter when it runs.
  const title = useCoverLetterStore((state) => state.document?.title);
  const templateId = useCoverLetterStore((state) => state.document?.templateId);
  const updateTitle = useCoverLetterStore((state) => state.updateTitle);
  const resetDocument = useCoverLetterStore((state) => state.resetDocument);
  const emptyDocument = useCoverLetterStore((state) => state.emptyDocument);

  const handleSync = useSyncNowAction("COVER_LETTER", documentId, onSetMessage);

  const {
    activeDownload,
    pdfWarning,
    onDownloadPdf,
    onDownloadDocx,
    onDownloadHtml,
    onDownloadJson,
    onDownloadText,
    onDownloadMarkdown,
  } = useDocumentDownloads({
    getDocument: () => useCoverLetterStore.getState().document,
    onMessage: onSetMessage,
    // No `previewElementId`: the cover letter's HTML export is generated from its template
    // rather than scraped from the DOM, so there is nothing to point at.
  });

  const onImportJson = useDocumentJsonImport("COVER_LETTER", onSetMessage);

  const jsonInput = useHiddenFileInput(onImportJson);
  const markdownInput = useHiddenFileInput(onImportMarkdown);

  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
      <ToolbarHeader
        message={message}
        title={title ?? "Untitled Cover Letter"}
        onBack={() => router.push("/documents")}
        onTitleChange={updateTitle}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ToolbarSaveButton onSave={onSave} />

        <input
          type="file"
          className="hidden"
          ref={jsonInput.ref}
          accept="application/json"
          onChange={jsonInput.onChange}
        />

        <input
          type="file"
          className="hidden"
          ref={markdownInput.ref}
          accept="text/markdown,.md,.markdown"
          onChange={markdownInput.onChange}
        />

        <ToolbarDownloadMenu
          activeDownload={activeDownload}
          pdfWarning={pdfWarning}
          onDownloadPdf={onDownloadPdf}
          onDownloadDocx={onDownloadDocx}
          onDownloadHtml={onDownloadHtml}
          onDownloadText={onDownloadText}
          onDownloadJson={onDownloadJson}
          onDownloadMarkdown={onDownloadMarkdown}
        />

        <ToolbarActionsMenu
          documentLabel="cover letter"
          onShare={onOpenShare}
          onDelete={onOpenDelete}
          onImportJson={jsonInput.open}
          onImportMarkdown={markdownInput.open}
          onReset={async () => {
            // Reset means "back to a new letter", and a new letter is seeded from the
            // profile — so the identity block has to be re-fetched, not re-hardcoded.
            let master;

            try {
              master = await getMasterProfileForReset();
            } catch (error) {
              onSetMessage(`Not reset. ${(error as Error).message}`);
              return;
            }

            resetDocument(master);
            onSetMessage("Cover letter reset to defaults");
          }}
          onEmptyFields={() => {
            emptyDocument();
            onSetMessage("All fields cleared");
          }}
          onSync={handleSync}
          onFullPreview={() => router.push(getDocumentPreviewPath("COVER_LETTER", documentId))}
          onPdfDebug={
            process.env.NODE_ENV === "development"
              ? () =>
                  window.open(
                    `/pdf-debug/cover-letter/${templateId ?? ""}?id=${documentId}`,
                    "_blank",
                  )
              : undefined
          }
        />
      </div>
    </div>
  );
});
