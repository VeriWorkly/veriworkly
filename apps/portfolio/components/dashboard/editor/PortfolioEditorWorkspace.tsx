"use client";

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import { useEffect, useState } from "react";
import { usePortfolioStore } from "@/store/portfolio-store";
import { EditorCommandBar } from "@/components/dashboard/editor/EditorCommandBar";
import { StructureRail } from "@/components/dashboard/editor/StructureRail";
import { ContentCanvas } from "@/components/dashboard/editor/ContentCanvas";
import { PreviewStage } from "@/components/dashboard/editor/PreviewStage";
import { TemplatePicker } from "@/components/dashboard/editor/TemplatePicker";
import { WorkspaceNotice } from "@/components/dashboard/editor/WorkspaceNotice";
import { useWorkspace } from "@/components/WorkspaceProvider";

export function PortfolioEditorWorkspace() {
  const initialData = useWorkspace();
  const hydrate = usePortfolioStore((state) => state.hydrateWorkspace);
  const load = usePortfolioStore((state) => state.loadWorkspace);
  const save = usePortfolioStore((state) => state.saveDraft);
  const ready = usePortfolioStore((state) => state.ready);
  const sections = usePortfolioStore((state) => state.content.sections);
  const [selectedSectionId, setSelectedSectionId] = useState("profile");
  const [structureOpen, setStructureOpen] = useState(true);
  const [contentOpen, setContentOpen] = useState(true);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const validSelectedSectionId =
    selectedSectionId === "profile" || sections.some((section) => section.id === selectedSectionId)
      ? selectedSectionId
      : "profile";

  useEffect(() => {
    if (initialData.workspace) hydrate(initialData);
    else void load();
  }, [hydrate, initialData, load]);

  useEffect(() => {
    if (!ready || usePortfolioStore.getState().draft) return;
    void save();
  }, [ready, save]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (usePortfolioStore.getState().isDirty) void save();
    }, 12000);
    return () => window.clearInterval(timer);
  }, [save]);

  return (
    <main className="workspace-theme bg-paper-2 text-ink flex h-dvh min-h-0 flex-col overflow-hidden">
      <EditorCommandBar />
      <div
        className={`grid min-h-0 flex-1 ${
          structureOpen && contentOpen
            ? "lg:grid-cols-[15rem_minmax(23rem,31rem)_minmax(0,1fr)]"
            : structureOpen
              ? "lg:grid-cols-[15rem_minmax(0,1fr)]"
              : contentOpen
                ? "lg:grid-cols-[minmax(23rem,31rem)_minmax(0,1fr)]"
                : "lg:grid-cols-1"
        }`}
      >
        {structureOpen ? (
          <StructureRail
            selectedSectionId={validSelectedSectionId}
            onSelect={setSelectedSectionId}
            onClose={() => setStructureOpen(false)}
            onOpenTemplates={() => setTemplatePickerOpen(true)}
          />
        ) : null}
        {contentOpen ? (
          <ContentCanvas
            selectedSectionId={validSelectedSectionId}
            onClose={() => setContentOpen(false)}
          />
        ) : null}
        <PreviewStage
          structureOpen={structureOpen}
          contentOpen={contentOpen}
          onOpenStructure={() => setStructureOpen(true)}
          onOpenContent={() => setContentOpen(true)}
          onFocusDesktop={() => {
            setStructureOpen(false);
            setContentOpen(false);
          }}
          onOpenEditingPanels={() => {
            setStructureOpen(true);
            setContentOpen(true);
          }}
        />
      </div>
      <TemplatePicker open={templatePickerOpen} onClose={() => setTemplatePickerOpen(false)} />
      <WorkspaceNotice />
    </main>
  );
}
