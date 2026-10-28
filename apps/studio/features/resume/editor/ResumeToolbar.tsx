"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";

import {
  toResumeDocument,
  importResumeFromMarkdownFile,
} from "@/features/resume/services/resume-service";

import ToolbarHeader from "@/features/documents/editor/toolbar/ToolbarHeader";
import ToolbarActionsMenu from "@/features/documents/editor/toolbar/ToolbarActionsMenu";
import ToolbarDownloadMenu from "@/features/documents/editor/toolbar/ToolbarDownloadMenu";
import { getSaveFailureMessage } from "@/features/documents/services/save-failure-message";
import { useDocumentDownloads } from "@/features/documents/editor/toolbar/useDocumentDownloads";
import {
  useDocumentJsonImport,
  useImportAsNewDocument,
} from "@/features/documents/editor/toolbar/useDocumentJsonImport";
import { useHiddenFileInput } from "@/features/documents/editor/toolbar/useHiddenFileInput";
import { useSyncNowAction } from "@/features/documents/editor/toolbar/useSyncNowAction";
import ToolbarSaveButton from "@/features/documents/editor/toolbar/ToolbarSaveButton";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { getMasterProfileForReset } from "@/features/resume/services/master-profile";

import { getDocumentPreviewPath } from "@/features/documents/core/routes";
import { flushPendingSave } from "@/features/documents/services/document-workspace-service";

interface ToolbarProps {
  resumeId: string;
  resumePreviewId: string;
  /**
   * Status line text. Owned by `ResumeEditor` — as in the cover letter editor — because
   * autosave lives there and needs to report save failures here.
   */
  message: string;
  onSetMessage: (message: string) => void;
  onOpenShare: () => void;
  onOpenDelete: () => void;
}

/**
 * Memoised, like the content and settings panels. It renders two `Menu` trees and two
 * hidden file inputs, all of which reconciled on every keystroke because the editor above
 * re-renders as the resume changes. Its props are stable now (the editor's callbacks are
 * `useCallback`ed), so the bail-out actually takes effect — except when `message` changes,
 * which is the one prop that genuinely has to reach the header.
 */
const ResumeToolbar = memo(function ResumeToolbar({
  resumeId,
  resumePreviewId,
  message,
  onSetMessage,
  onOpenShare,
  onOpenDelete,
}: ToolbarProps) {
  const router = useRouter();

  // Only what the toolbar shows: subscribing to the whole resume re-rendered it on every
  // keystroke and defeated `memo`. Export and import read the resume when they run.
  const title = useResumeStore((state) => state.resume.title);
  const templateId = useResumeStore((state) => state.resume.templateId);
  const resetResume = useResumeStore((state) => state.resetResume);
  const emptyResume = useResumeStore((state) => state.emptyResume);
  const updateTitle = useResumeStore((state) => state.updateTitle);
  const saveToStorage = useResumeStore((state) => state.saveToStorage);

  const handleSync = useSyncNowAction("RESUME", resumeId, onSetMessage);

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
    // The store holds bare `ResumeData`; the shared export path takes the envelope.
    getDocument: () => toResumeDocument(useResumeStore.getState().resume),
    onMessage: onSetMessage,
    // Keeps "Export → HTML" on the WYSIWYG branch, which is what this button has always
    // produced — see export-html.ts.
    previewElementId: resumePreviewId,
  });

  const onImportResume = useDocumentJsonImport("RESUME", onSetMessage);
  const importAsNewDocument = useImportAsNewDocument("RESUME", onSetMessage);

  async function onImportMarkdown(file: File | undefined) {
    if (!file) return;

    let imported;

    try {
      imported = toResumeDocument(
        await importResumeFromMarkdownFile(file, useResumeStore.getState().resume),
      );
    } catch {
      onSetMessage("Import failed. Please use a valid Markdown file");
      return;
    }

    await importAsNewDocument({
      title: imported.title,
      templateId: imported.templateId,
      content: imported.content,
    });
  }

  const jsonInput = useHiddenFileInput(onImportResume);
  const markdownInput = useHiddenFileInput(onImportMarkdown);

  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
      <ToolbarHeader
        message={message}
        title={title ?? "Untitled Resume"}
        onBack={() => router.push("/documents")}
        onTitleChange={updateTitle}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ToolbarSaveButton
          onSave={() => {
            const saveResult = saveToStorage({ flush: true });

            onSetMessage(
              saveResult.ok ? "Saved on this device" : getSaveFailureMessage(saveResult.reason),
            );
          }}
        />

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
          onDownloadPdf={onDownloadPdf}
          onDownloadDocx={onDownloadDocx}
          onDownloadHtml={onDownloadHtml}
          onDownloadText={onDownloadText}
          onDownloadJson={onDownloadJson}
          activeDownload={activeDownload}
          pdfWarning={pdfWarning}
          onDownloadMarkdown={onDownloadMarkdown}
        />

        <ToolbarActionsMenu
          documentLabel="resume"
          onShare={onOpenShare}
          onDelete={onOpenDelete}
          onImportJson={jsonInput.open}
          onImportMarkdown={markdownInput.open}
          onReset={async () => {
            // Same as a new resume: seeded from the profile, never the sample.
            let master;

            try {
              master = await getMasterProfileForReset();
            } catch (error) {
              onSetMessage(`Not reset. ${(error as Error).message}`);
              return;
            }

            const result = resetResume(master);
            onSetMessage(
              result.ok ? "Resume reset to defaults" : getSaveFailureMessage(result.reason),
            );
          }}
          onEmptyFields={() => {
            const result = emptyResume();
            onSetMessage(result.ok ? "All fields cleared" : getSaveFailureMessage(result.reason));
          }}
          onSync={handleSync}
          onFullPreview={() => router.push(getDocumentPreviewPath("RESUME", resumeId))}
          onCheckAts={() => {
            // The checker reads the saved resume: the last keystrokes go with it.
            flushPendingSave("RESUME", resumeId);
            router.push(`/ats?document=${encodeURIComponent(resumeId)}`);
          }}
          onPdfDebug={
            process.env.NODE_ENV === "development"
              ? () => window.open(`/pdf-debug/resume/${templateId}?id=${resumeId}`, "_blank")
              : undefined
          }
        />
      </div>
    </div>
  );
});

export default ResumeToolbar;
