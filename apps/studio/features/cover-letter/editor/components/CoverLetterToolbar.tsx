"use client";

import { toast } from "sonner";
import { memo, useRef } from "react";
import { useRouter } from "next/navigation";

import ToolbarHeader from "@/features/documents/editor/toolbar/ToolbarHeader";
import ToolbarSaveButton from "@/features/documents/editor/toolbar/ToolbarSaveButton";
import ToolbarActionsMenu from "@/features/documents/editor/toolbar/ToolbarActionsMenu";
import ToolbarDownloadMenu from "@/features/documents/editor/toolbar/ToolbarDownloadMenu";
import { useDocumentDownloads } from "@/features/documents/editor/toolbar/useDocumentDownloads";
import { useDocumentJsonImport } from "@/features/documents/editor/toolbar/useDocumentJsonImport";

import { useUserStore } from "@/store/useUserStore";

import { getDocumentPreviewPath } from "@/features/documents/core/routes";
import { syncDocumentNow } from "@/features/documents/services/document-sync";
import { getMasterProfileForNewDocument } from "@/features/resume/services/master-profile";

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

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const markdownInputRef = useRef<HTMLInputElement>(null);

  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  const document = useCoverLetterStore((state) => state.document);
  const updateTitle = useCoverLetterStore((state) => state.updateTitle);
  const resetDocument = useCoverLetterStore((state) => state.resetDocument);
  const emptyDocument = useCoverLetterStore((state) => state.emptyDocument);

  async function handleSync() {
    if (!isLoggedIn) {
      toast.error("Please log in to sync documents.");
      return;
    }

    onSetMessage("Syncing with cloud...");

    try {
      await syncDocumentNow("COVER_LETTER", documentId);
      onSetMessage("Synced successfully");
      toast.success("Synced successfully");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Sync failed";
      onSetMessage(`Sync failed: ${errMsg}`);
      toast.error(errMsg);
    }
  }

  const {
    activeDownload,
    onDownloadPdf,
    onDownloadDocx,
    onDownloadHtml,
    onDownloadJson,
    onDownloadText,
    onDownloadMarkdown,
  } = useDocumentDownloads({
    getDocument: () => document,
    onMessage: onSetMessage,
    // No `previewElementId`: the cover letter's HTML export is generated from its template
    // rather than scraped from the DOM, so there is nothing to point at.
  });

  const onImportJson = useDocumentJsonImport("COVER_LETTER", onSetMessage);

  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
      <ToolbarHeader
        message={message}
        title={document?.title ?? "Untitled Cover Letter"}
        onBack={() => router.push("/documents")}
        onTitleChange={updateTitle}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ToolbarSaveButton onSave={onSave} />

        <input
          type="file"
          className="hidden"
          ref={jsonInputRef}
          accept="application/json"
          onChange={(event) => {
            void onImportJson(event.target.files?.[0]).finally(() => {
              event.currentTarget.value = "";
            });
          }}
        />

        <input
          type="file"
          className="hidden"
          ref={markdownInputRef}
          accept="text/markdown,.md,.markdown"
          onChange={(event) => {
            void onImportMarkdown(event.target.files?.[0]).finally(() => {
              event.currentTarget.value = "";
            });
          }}
        />

        <ToolbarDownloadMenu
          activeDownload={activeDownload}
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
          onImportJson={() => jsonInputRef.current?.click()}
          onImportMarkdown={() => markdownInputRef.current?.click()}
          onReset={async () => {
            // Reset means "back to a new letter", and a new letter is seeded from the
            // profile — so the identity block has to be re-fetched, not re-hardcoded.
            resetDocument(await getMasterProfileForNewDocument());
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
                    `/pdf-debug/cover-letter/${document?.templateId ?? ""}?id=${documentId}`,
                    "_blank",
                  )
              : undefined
          }
        />
      </div>
    </div>
  );
});
