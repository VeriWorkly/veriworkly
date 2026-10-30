"use client";

import { useCallback, useEffect, useState } from "react";
import { usePortfolioStore, usePortfolioStoreApi, type SaveResult } from "@/store/portfolio-store";
import { EditorCommandBar } from "@/components/dashboard/editor/EditorCommandBar";
import { StructureRail } from "@/components/dashboard/editor/StructureRail";
import { ContentCanvas } from "@/components/dashboard/editor/ContentCanvas";
import { PreviewStage } from "@/components/dashboard/editor/PreviewStage";
import { TemplatePicker } from "@/components/dashboard/editor/TemplatePicker";

export function PortfolioEditorWorkspace() {
  // These effects read the *latest* state at fire time rather than subscribing, so they
  // go through the store API instead of a selector — the autosave timer must not be torn
  // down and rebuilt on every keystroke.
  const storeApi = usePortfolioStoreApi();
  const save = usePortfolioStore((state) => state.saveDraft);
  const setMessage = usePortfolioStore((state) => state.setMessage);
  // Nobody clicked anything for these saves, so a failure goes to the workspace notice.
  const noticeOnFailure = useCallback(
    (result: SaveResult) => {
      if (!result.ok) setMessage(result.message);
    },
    [setMessage],
  );
  const ready = usePortfolioStore((state) => state.ready);
  const selectedPageIdState = usePortfolioStore((state) => state.selectedPageId);
  const pages = usePortfolioStore((state) => state.content.pages || []);
  const rootSections = usePortfolioStore((state) => state.content.sections);
  const sections = selectedPageIdState
    ? pages.find((p) => p.id === selectedPageIdState)?.sections || []
    : rootSections;
  const [selectedSectionId, setSelectedSectionId] = useState("profile");
  const [structureOpen, setStructureOpen] = useState(true);
  const [contentOpen, setContentOpen] = useState(true);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const validSelectedSectionId =
    selectedSectionId === "profile" || sections.some((section) => section.id === selectedSectionId)
      ? selectedSectionId
      : "profile";

  useEffect(() => {
    if (!ready || storeApi.getState().draft) return;
    void save().then(noticeOnFailure);
  }, [ready, save, storeApi, noticeOnFailure]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (storeApi.getState().isDirty) void save().then(noticeOnFailure);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [save, storeApi, noticeOnFailure]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!storeApi.getState().isDirty) return;
      event.preventDefault();
      // Legacy browsers ignore preventDefault() here and instead show the
      // "leave site?" prompt only when returnValue is set to a truthy value.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [storeApi]);

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
    </main>
  );
}
