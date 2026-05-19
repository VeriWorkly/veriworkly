"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import type { TemplateComponent } from "@/types/template";

import { Card } from "@veriworkly/ui";

import {
  startResumeSyncWorker,
  hydrateCloudResumeByIdToLocalStorage,
} from "@/features/resume/services/resume-sync";
import {
  loadResumeById,
  createResumeWithTemplate,
} from "@/features/resume/services/resume-service";
import { useResume } from "@/features/resume/hooks/use-resume";
import { loadWorkspaceSettingsFromLocalStorage } from "@/features/documents/services/workspace-settings";

import { loadTemplateComponentById } from "@/templates";

import Toolbar from "./Toolbar";
import EditorModals from "./EditorModals";
import EditorContentPanel from "./EditorContentPanel";
import EditorSettingsPanel from "./EditorSettingsPanel";

import { useUserStore } from "@/store/useUserStore";

interface EditorLayoutProps {
  resumeId: string;
}

const EditorLayout = ({ resumeId }: EditorLayoutProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasHydratedRef = useRef(false);

  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  const { hydrateFromStorage, resume, saveToStorage, setResume } = useResume();

  const [panelOpen, setPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [activePanel, setActivePanel] = useState<"content" | "settings">("content");

  const [templateComponent, setTemplateComponent] = useState<TemplateComponent | null>(null);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const deferredResume = useDeferredValue(resume);

  const resumePreviewId = `resume-preview-${resume.id}`;

  const stagePaddingClass = resume.customization.pagePadding === 0 ? "p-0" : "p-3 md:p-6";

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (resumeId === "new") {
        const template = searchParams.get("template") || "executive-clarity";
        const newResume = createResumeWithTemplate(template);

        router.replace(`/editor/resume/${newResume.id}`);

        return;
      }

      if (resumeId) {
        const routeResume = loadResumeById(resumeId);

        if (routeResume) {
          setResume(routeResume);
          hasHydratedRef.current = true;

          return;
        }

        const cloudResult = await hydrateCloudResumeByIdToLocalStorage(resumeId);

        if (!cancelled && cloudResult.ok) {
          const hydratedResume = loadResumeById(resumeId);

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
  }, [hydrateFromStorage, resumeId, router, searchParams, setResume]);

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

    startResumeSyncWorker({
      enabled: isLoggedIn && workspaceSettings.autoSyncEnabled,
      idleDelayMs: 12_000,
    });
  }, [isLoggedIn, resume.updatedAt]);

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

  return (
    <div className="flex h-[calc(100dvh-2rem)] min-h-0 flex-col gap-4 overflow-hidden">
      <div className="sticky top-0 z-30">
        <Toolbar
          resumeId={resumeId}
          resumePreviewId={resumePreviewId}
          onOpenShare={() => setShareModalOpen(true)}
          onOpenDelete={() => setDeleteModalOpen(true)}
        />
      </div>

      <EditorModals
        shareModalOpen={shareModalOpen}
        onShareModalClose={() => setShareModalOpen(false)}
        deleteModalOpen={deleteModalOpen}
        onDeleteModalClose={() => setDeleteModalOpen(false)}
      />

      <div className="border-border bg-card inline-flex rounded-2xl border p-1 md:hidden">
        <button
          className={`rounded-xl px-4 py-2 text-sm font-medium ${
            activeTab === "editor" ? "bg-accent text-accent-foreground" : "text-muted"
          }`}
          onClick={() => setActiveTab("editor")}
          type="button"
        >
          Edit
        </button>

        <button
          className={`rounded-xl px-4 py-2 text-sm font-medium ${
            activeTab === "preview" ? "bg-accent text-accent-foreground" : "text-muted"
          }`}
          onClick={() => setActiveTab("preview")}
          type="button"
        >
          Preview
        </button>
      </div>

      <div
        className={`grid min-h-0 flex-1 gap-4 overflow-hidden ${
          panelOpen ? "xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]" : "grid-cols-1"
        }`}
      >
        {panelOpen ? (
          <div className={activeTab === "preview" ? "hidden min-h-0 md:block" : "block min-h-0"}>
            <Card className="flex h-full min-h-0 flex-col p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="border-border bg-background inline-flex rounded-2xl border p-1">
                  <button
                    className={`rounded-xl px-3 py-2 text-sm font-medium ${
                      activePanel === "content" ? "bg-accent text-accent-foreground" : "text-muted"
                    }`}
                    onClick={() => setActivePanel("content")}
                    type="button"
                  >
                    Content
                  </button>

                  <button
                    className={`rounded-xl px-3 py-2 text-sm font-medium ${
                      activePanel === "settings" ? "bg-accent text-accent-foreground" : "text-muted"
                    }`}
                    onClick={() => setActivePanel("settings")}
                    type="button"
                  >
                    Settings
                  </button>
                </div>

                <button
                  className="border-border bg-background text-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-xl border text-lg"
                  onClick={() => setPanelOpen(false)}
                  type="button"
                >
                  x
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {activePanel === "content" ? <EditorContentPanel /> : <EditorSettingsPanel />}
              </div>
            </Card>
          </div>
        ) : null}

        {!panelOpen ? (
          <div className={activeTab === "preview" ? "hidden min-h-0 md:block" : "block min-h-0"}>
            <Card className="space-y-3 p-3">
              <p className="text-muted px-1 text-xs font-semibold tracking-[0.2em] uppercase">
                Panels
              </p>

              <button
                type="button"
                className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium ${
                  activePanel === "content"
                    ? "bg-accent text-accent-foreground"
                    : "bg-background text-muted"
                }`}
                onClick={() => {
                  setActivePanel("content");
                  setPanelOpen(true);
                }}
              >
                Open content editor
              </button>

              <button
                type="button"
                className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium ${
                  activePanel === "settings"
                    ? "bg-accent text-accent-foreground"
                    : "bg-background text-muted"
                }`}
                onClick={() => {
                  setActivePanel("settings");
                  setPanelOpen(true);
                }}
              >
                Open style settings
              </button>
            </Card>
          </div>
        ) : null}

        <Card
          className={`h-full min-h-0 flex-col overflow-hidden p-0 ${
            activeTab === "editor" ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="from-background via-card to-background relative flex min-h-0 flex-1 flex-col bg-linear-to-br">
            <div className="border-border/80 bg-card/80 shrink-0 border-b px-4 py-3 backdrop-blur md:px-6">
              <div>
                <p className="text-muted text-[11px] font-semibold tracking-[0.22em] uppercase">
                  Live Preview
                </p>

                <p className="text-foreground text-sm font-medium">
                  {deferredResume.basics.fullName || "Untitled Resume"}
                </p>
              </div>
            </div>

            <div className="relative h-full min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
              <div
                className={`relative flex min-h-[70vh] justify-center rounded-3xl border border-dashed border-[color-mix(in_oklab,var(--border)_70%,transparent)] bg-[color-mix(in_oklab,var(--background)_92%,white)] ${stagePaddingClass}`}
              >
                <div className="w-full max-w-212.5" id={resumePreviewId}>
                  {templateComponent
                    ? (() => {
                        const TemplateComponent = templateComponent;
                        return <TemplateComponent resume={deferredResume} />;
                      })()
                    : null}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EditorLayout;
