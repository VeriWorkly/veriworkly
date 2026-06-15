"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import type { TemplateComponent } from "@/types/template";

import { useResume } from "@/features/resume/hooks/use-resume";

import {
  loadResumeById,
  createResumeWithTemplate,
} from "@/features/resume/services/resume-service";
import {
  startDocumentSyncWorker,
  hydrateCloudDocumentByIdToLocalStorage,
} from "@/features/documents/services/document-sync";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { DocumentEditorShell } from "@/features/documents/editor/DocumentEditorShell";
import { loadWorkspaceSettingsFromLocalStorage } from "@/features/documents/services/workspace-settings";

import { loadTemplateComponentById } from "@/templates";

import ResumeToolbar from "./ResumeToolbar";
import ResumeEditorModals from "./ResumeEditorModals";
import EditorContentPanel from "./EditorContentPanel";
import EditorSettingsPanel from "./EditorSettingsPanel";
import { ResumePagedPreview } from "./ResumePagedPreview";

import { useUserStore } from "@/store/useUserStore";

interface ResumeEditorProps {
  documentId: string;
}

const ResumeEditor = ({ documentId }: ResumeEditorProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasHydratedRef = useRef(false);

  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  const { hydrateFromStorage, resume, saveToStorage, setResume } = useResume();

  const [templateComponent, setTemplateComponent] = useState<TemplateComponent | null>(null);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const deferredResume = useDeferredValue(resume);

  const resumePreviewId = `resume-preview-${resume.id}`;

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (documentId === "new") {
        const template = searchParams.get("template") || "executive-clarity";
        const newResume = createResumeWithTemplate(template);

        router.replace(getDocumentEditorPath("RESUME", newResume.id));

        return;
      }

      if (documentId) {
        const routeResume = loadResumeById(documentId);

        if (routeResume) {
          setResume(routeResume);
          hasHydratedRef.current = true;

          return;
        }

        const cloudResult = await hydrateCloudDocumentByIdToLocalStorage("RESUME", documentId);

        if (!cancelled && cloudResult.ok) {
          const hydratedResume = loadResumeById(documentId);

          if (hydratedResume) {
            setResume(hydratedResume);
            hasHydratedRef.current = true;
            return;
          }
        }
      }

      if (!cancelled) {
        hydrateFromStorage();
        hasHydratedRef.current = true;
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [hydrateFromStorage, documentId, router, searchParams, setResume]);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }

    saveToStorage({ debounceMs: 300 });
  }, [resume, saveToStorage]);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }

    if (!isLoggedIn) {
      return;
    }

    const workspaceSettings = loadWorkspaceSettingsFromLocalStorage();

    startDocumentSyncWorker("RESUME", {
      enabled: isLoggedIn && workspaceSettings.autoSyncEnabled,
      idleDelayMs: 12_000,
    });
  }, [isLoggedIn, resume.id]);

  useEffect(() => {
    let cancelled = false;

    const loadTemplate = async () => {
      const nextTemplate = await loadTemplateComponentById(deferredResume.templateId);

      if (!cancelled) {
        setTemplateComponent(() => nextTemplate);
      }
    };

    void loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [deferredResume.templateId]);

  const preview = templateComponent
    ? (() => {
        const TemplateComponent = templateComponent;
        return (
          <ResumePagedPreview>
            <TemplateComponent resume={deferredResume} />
          </ResumePagedPreview>
        );
      })()
    : null;

  return (
    <DocumentEditorShell
      toolbar={
        <ResumeToolbar
          resumeId={documentId}
          resumePreviewId={resumePreviewId}
          onOpenShare={() => setShareModalOpen(true)}
          onOpenDelete={() => setDeleteModalOpen(true)}
        />
      }
      modals={
        <ResumeEditorModals
          shareModalOpen={shareModalOpen}
          onShareModalClose={() => setShareModalOpen(false)}
          deleteModalOpen={deleteModalOpen}
          onDeleteModalClose={() => setDeleteModalOpen(false)}
        />
      }
      contentPanel={<EditorContentPanel />}
      settingsPanel={<EditorSettingsPanel />}
      preview={preview}
      previewId={resumePreviewId}
      previewTitle={deferredResume.basics.fullName || "Untitled Resume"}
      previewStageClassName="p-0"
      settingsLabel="Style settings"
    />
  );
};

export default ResumeEditor;
