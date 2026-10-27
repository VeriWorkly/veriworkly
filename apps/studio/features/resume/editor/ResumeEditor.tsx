"use client";

import type { ResumeData } from "@/types/resume";

import { createElement, useCallback, useDeferredValue } from "react";

import { readResumeById } from "@/features/resume/services/resume-service";
import { DocumentEditorShell } from "@/features/documents/editor/DocumentEditorShell";
import { DocumentLoadStateCard } from "@/features/documents/editor/DocumentStateCard";
import {
  ChangedElsewhereNotice,
  RecoveredEditsNotice,
} from "@/features/documents/editor/ChangedElsewhereNotice";
import { useDocumentTabTitle } from "@/features/documents/editor/editor-load-status";
import { useDocumentEditorSession } from "@/features/documents/editor/useDocumentEditorSession";

import { loadTemplateComponentById } from "@/templates";
import { useTemplateComponent } from "@/templates/shared/use-template-component";

import ResumeToolbar from "./ResumeToolbar";
import ResumeEditorModals from "./ResumeEditorModals";
import EditorContentPanel from "./EditorContentPanel";
import EditorSettingsPanel from "./EditorSettingsPanel";
import { ResumePagedPreview } from "./ResumePagedPreview";

import { useResumeStore } from "@/features/resume/store/resume-store";

interface ResumeEditorProps {
  documentId: string;
}

const ResumeEditor = ({ documentId }: ResumeEditorProps) => {
  // Narrow selectors: this component sits above the shell and rebuilds the toolbar, modals
  // and preview elements on each render, so it must not subscribe to every store change.
  const resume = useResumeStore((state) => state.resume);
  const setResume = useResumeStore((state) => state.setResume);
  const saveToStorage = useResumeStore((state) => state.saveToStorage);

  const loadIntoStore = useCallback(
    (id: string) => {
      const stored = readResumeById(id);

      if (stored) setResume(stored);
      return Boolean(stored);
    },
    [setResume],
  );

  const restoreIntoStore = useCallback(
    (recovered: unknown) => setResume(recovered as ResumeData),
    [setResume],
  );

  const session = useDocumentEditorSession({
    type: "RESUME",
    documentId,
    loadIntoStore,
    saveToStorage,
    document: resume,
    replaceInStore: restoreIntoStore,
  });

  const deferredResume = useDeferredValue(resume);

  const resumePreviewId = `resume-preview-${resume.id}`;

  // The tab names the document, not the route.
  const tabTitle = resume.title || resume.basics.fullName || "Untitled resume";

  useDocumentTabTitle(tabTitle, session.isReady);

  const TemplateComponent = useTemplateComponent(
    loadTemplateComponentById,
    deferredResume.templateId,
  );

  // `createElement` rather than JSX: the template is resolved at runtime, and the React
  // compiler lint treats a capitalized hook result in JSX position as a component
  // declared during render.
  const preview = TemplateComponent ? (
    <ResumePagedPreview paperSize={deferredResume.customization.paperSize}>
      {createElement(TemplateComponent, { resume: deferredResume })}
    </ResumePagedPreview>
  ) : null;

  if (!session.isReady) {
    return (
      <DocumentLoadStateCard
        noun="resume"
        load={session.load}
        isReady={session.isReady}
        onRetry={session.retryLoad}
        notFoundMessage="Return to documents and choose another resume."
      />
    );
  }

  return (
    <DocumentEditorShell
      notice={
        session.changedElsewhere ? (
          <ChangedElsewhereNotice
            changedElsewhere={session.changedElsewhere}
            busy={session.resolvingChange}
            onKeepMine={session.keepMine}
            onKeepOther={session.keepOther}
          />
        ) : session.recovered ? (
          <RecoveredEditsNotice
            savedAt={session.recovered.savedAt}
            onRestore={session.restoreRecovered}
            onDiscard={session.discardRecovered}
          />
        ) : null
      }
      toolbar={
        <ResumeToolbar
          resumeId={documentId}
          message={session.message}
          onSetMessage={session.setMessage}
          resumePreviewId={resumePreviewId}
          onOpenShare={session.openShare}
          onOpenDelete={session.openDelete}
        />
      }
      modals={
        <ResumeEditorModals
          shareModalOpen={session.shareModalOpen}
          onShareModalClose={session.closeShare}
          deleteModalOpen={session.deleteModalOpen}
          onDeleteModalClose={session.closeDelete}
        />
      }
      contentPanel={<EditorContentPanel />}
      settingsPanel={<EditorSettingsPanel />}
      preview={preview}
      previewId={resumePreviewId}
      previewTitle={tabTitle}
      settingsLabel="Style settings"
    />
  );
};

export default ResumeEditor;
