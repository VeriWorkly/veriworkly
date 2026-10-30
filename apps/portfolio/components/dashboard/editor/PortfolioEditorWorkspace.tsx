"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { usePortfolioStore, usePortfolioStoreApi, shouldAutosave } from "@/store/portfolio-store";
import { isPremiumTemplate } from "@/lib/portfolio";
import type { PublishIssue } from "@/lib/portfolio-limits";
import { hasPortfolioAccess } from "@/lib/portfolio-status";
import { templates as templateCatalog } from "@/templates/catalog/templates";
import { EditorCommandBar } from "@/components/dashboard/editor/EditorCommandBar";
import { StructureRail } from "@/components/dashboard/editor/StructureRail";
import { ContentCanvas } from "@/components/dashboard/editor/ContentCanvas";
import { PreviewStage } from "@/components/dashboard/editor/PreviewStage";
import { TemplatePicker } from "@/components/dashboard/editor/TemplatePicker";

/** Below `lg` the three panels become tabs, one at a time (P-024). */
const TABS = [
  { id: "structure", label: "Structure" },
  { id: "content", label: "Content" },
  { id: "preview", label: "Preview" },
] as const;
type EditorTab = (typeof TABS)[number]["id"];

export function PortfolioEditorWorkspace() {
  // These effects read the *latest* state at fire time rather than subscribing, so they
  // go through the store API instead of a selector.
  const storeApi = usePortfolioStoreApi();
  const save = usePortfolioStore((state) => state.saveDraft);
  const ready = usePortfolioStore((state) => state.ready);
  const selectedPageIdState = usePortfolioStore((state) => state.selectedPageId);
  const setSelectedPageId = usePortfolioStore((state) => state.setSelectedPageId);
  // The fallback stays outside the selector: a new [] per call makes the store loop forever.
  const pages = usePortfolioStore((state) => state.content.pages) ?? [];
  const rootSections = usePortfolioStore((state) => state.content.sections);
  const sections = selectedPageIdState
    ? pages.find((p) => p.id === selectedPageIdState)?.sections || []
    : rootSections;
  const [selectedSectionId, setSelectedSectionId] = useState("profile");
  const [structureOpen, setStructureOpen] = useState(true);
  const [contentOpen, setContentOpen] = useState(true);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [highlightTemplateId, setHighlightTemplateId] = useState<string>();
  const [tab, setTab] = useState<EditorTab>("content");

  const validSelectedSectionId =
    selectedSectionId === "profile" || sections.some((section) => section.id === selectedSectionId)
      ? selectedSectionId
      : "profile";

  // A signed-in account without a draft gets its first one. Never a guest: that wrote the blank
  // default to this browser, which was then offered over the account's draft after logging in.
  useEffect(() => {
    const state = storeApi.getState();
    if (!ready || state.draft || !state.user) return;
    void save().then((result) => {
      if (!result.ok) storeApi.getState().setMessage(result.message);
    });
  }, [ready, save, storeApi]);

  // Autosave and the leave-page warning run for the whole workspace (WorkspaceProvider). Leaving
  // the editor sends what is pending now rather than up to 12 s later (P-022).
  useEffect(
    () => () => {
      const state = storeApi.getState();
      if (shouldAutosave(state)) {
        void state.saveDraft().then((result) => {
          if (!result.ok) storeApi.getState().setMessage(result.message);
        });
      }
    },
    [storeApi],
  );

  // `/editor?template=<id>` from the template gallery (P-030): read once, then dropped from the
  // address so a reload does not apply it again.
  const templateParamRead = useRef(false);
  useEffect(() => {
    if (!ready || templateParamRead.current) return;
    templateParamRead.current = true;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("template");
    if (!id) return;
    url.searchParams.delete("template");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    const template = templateCatalog.find((entry) => entry.id === id);
    if (!template) return;
    const state = storeApi.getState();
    if (isPremiumTemplate(template.id) && !hasPortfolioAccess(state.billing)) {
      // The address bar is read once after mount (it is not known during the server render),
      // so the picker can only open from here. Opening it is the highlight being set.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHighlightTemplateId(template.id);
      return;
    }
    if (state.content.templateId !== template.id) {
      state.updateContent({ templateId: template.id });
      toast.success(`${template.name} applied.`);
    }
  }, [ready, storeApi]);

  const selectSection = useCallback((id: string) => {
    setSelectedSectionId(id);
    setContentOpen(true);
    setTab("content");
  }, []);

  // A publish checklist entry: open the page, section and field that needs fixing.
  const jumpTo = useCallback(
    (issue: PublishIssue) => {
      setSelectedPageId(issue.pageId);
      selectSection(issue.sectionId);
      if (issue.fieldId) {
        const fieldId = issue.fieldId;
        window.setTimeout(() => document.getElementById(fieldId)?.focus(), 50);
      }
    },
    [selectSection, setSelectedPageId],
  );

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = TABS.findIndex((entry) => entry.id === tab);
    const next = TABS[(index + step + TABS.length) % TABS.length].id;
    setTab(next);
    document.getElementById(`editor-tab-${next}`)?.focus();
  };

  return (
    <main className="workspace-theme bg-paper-2 text-ink flex h-dvh min-h-0 flex-col overflow-hidden">
      <EditorCommandBar onJump={jumpTo} />
      <div
        role="tablist"
        aria-label="Editor panels"
        className="border-line bg-panel grid shrink-0 grid-cols-3 border-b lg:hidden"
      >
        {TABS.map((entry) => (
          <button
            key={entry.id}
            id={`editor-tab-${entry.id}`}
            role="tab"
            aria-selected={tab === entry.id}
            aria-controls={`editor-panel-${entry.id}`}
            tabIndex={tab === entry.id ? 0 : -1}
            className={`min-h-11 border-b-2 text-xs font-extrabold ${
              tab === entry.id ? "border-accent text-ink" : "text-muted border-transparent"
            }`}
            onClick={() => setTab(entry.id)}
            onKeyDown={onTabKey}
            type="button"
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div
        className={`grid min-h-0 flex-1 grid-rows-1 ${
          structureOpen && contentOpen
            ? "lg:grid-cols-[15rem_minmax(23rem,31rem)_minmax(0,1fr)]"
            : structureOpen
              ? "lg:grid-cols-[15rem_minmax(0,1fr)]"
              : contentOpen
                ? "lg:grid-cols-[minmax(23rem,31rem)_minmax(0,1fr)]"
                : "lg:grid-cols-1"
        }`}
      >
        <StructureRail
          visibility={panelVisibility(tab === "structure", structureOpen, "flex")}
          selectedSectionId={validSelectedSectionId}
          onSelect={selectSection}
          onClose={() => setStructureOpen(false)}
          onOpenTemplates={() => setTemplatePickerOpen(true)}
        />
        <ContentCanvas
          visibility={panelVisibility(tab === "content", contentOpen, "block")}
          selectedSectionId={validSelectedSectionId}
          onClose={() => setContentOpen(false)}
        />
        <PreviewStage
          visibility={panelVisibility(tab === "preview", true, "block")}
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
      <TemplatePicker
        open={templatePickerOpen || Boolean(highlightTemplateId)}
        highlightId={highlightTemplateId}
        onClose={() => {
          setTemplatePickerOpen(false);
          setHighlightTemplateId(undefined);
        }}
      />
    </main>
  );
}

/**
 * A panel's display classes: below `lg` only the active tab shows; from `lg` up the panels sit
 * side by side and each can be closed.
 */
function panelVisibility(activeTab: boolean, openOnDesktop: boolean, display: "flex" | "block") {
  const mobile = activeTab ? (display === "flex" ? "flex" : "block") : "hidden";
  const desktop = openOnDesktop ? (display === "flex" ? "lg:flex" : "lg:block") : "lg:hidden";
  return `${mobile} ${desktop}`;
}
