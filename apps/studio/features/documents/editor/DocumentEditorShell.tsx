"use client";

import type { KeyboardEvent, PointerEvent, ReactNode } from "react";

import {
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@veriworkly/ui";

import { cn } from "@/lib/utils";

type MobileTab = "content" | "preview" | "settings";

const MOBILE_TABS = ["content", "preview", "settings"] as const;

const TAB_LABELS: Record<MobileTab, string> = {
  content: "Content",
  preview: "Preview",
  settings: "Design",
};

/** Ids paired by `aria-controls` / `aria-labelledby`, so each tab names its own panel. */
function tabId(tab: MobileTab) {
  return `editor-tab-${tab}`;
}

function panelId(tab: MobileTab) {
  return `editor-panel-${tab}`;
}

const PAN_STEP = 32;
const PAN_STEP_LARGE = 160;

interface DocumentEditorShellProps {
  toolbar: ReactNode;
  modals?: ReactNode;
  contentPanel: ReactNode;
  settingsPanel: ReactNode;
  preview: ReactNode;
  previewTitle: string;
  previewId?: string;
  settingsLabel?: string;
}

const ZOOM_STEP = 10;
const MIN_ZOOM = 45;
const MAX_ZOOM = 140;

export function DocumentEditorShell({
  toolbar,
  modals,
  contentPanel,
  settingsPanel,
  preview,
  previewTitle,
  previewId,
  settingsLabel = "Design",
}: DocumentEditorShellProps) {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [contentOpen, setContentOpen] = useState(true);

  const [dragStart, setDragStart] = useState<{
    pointerId: number;
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);

  const [zoom, setZoom] = useState(78);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [activeTab, setActiveTab] = useState<MobileTab>("content");

  /**
   * Collapsing a rail on desktop moves the mobile tab off it, so the two states can never
   * disagree about whether that panel exists. Without this the rail would stay mounted
   * (hidden) purely to keep the mobile tab satisfied, and a later resize would land on a
   * tab pointing at a panel the user had collapsed away.
   */
  function collapseRail(rail: Exclude<MobileTab, "preview">) {
    if (rail === "content") {
      setContentOpen(false);
    } else {
      setSettingsOpen(false);
    }

    if (activeTab === rail) {
      setActiveTab("preview");
    }
  }

  const previewTransform = useMemo(
    () => ({
      transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom / 100})`,
    }),
    [pan.x, pan.y, zoom],
  );

  function updateZoom(nextZoom: number) {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom)));
  }

  function resetCanvas() {
    setZoom(78);
    setPan({ x: 0, y: 0 });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;

    setPan({
      x: dragStart.panX + event.clientX - dragStart.x,
      y: dragStart.panY + event.clientY - dragStart.y,
    });
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (dragStart?.pointerId === event.pointerId) {
      setDragStart(null);
    }
  }

  /**
   * Keyboard panning. The canvas was pointer-only — no focusable element, no role, no name
   * — so at high zoom a keyboard-only user could not reach parts of the preview at all.
   * Shift takes a larger step; Home or 0 recentres.
   */
  function handleCanvasKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? PAN_STEP_LARGE : PAN_STEP;

    const delta = {
      ArrowLeft: { x: step, y: 0 },
      ArrowRight: { x: -step, y: 0 },
      ArrowUp: { x: 0, y: step },
      ArrowDown: { x: 0, y: -step },
    }[event.key];

    if (delta) {
      event.preventDefault();
      setPan((current) => ({ x: current.x + delta.x, y: current.y + delta.y }));
      return;
    }

    if (event.key === "Home" || event.key === "0") {
      event.preventDefault();
      resetCanvas();
    }
  }

  /** Roving focus across the tablist, per the WAI-ARIA tabs pattern. */
  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const offset = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    const bound = { Home: 0, End: MOBILE_TABS.length - 1 }[event.key];

    const nextIndex =
      offset === undefined
        ? bound
        : (MOBILE_TABS.indexOf(activeTab) + offset + MOBILE_TABS.length) % MOBILE_TABS.length;

    if (nextIndex === undefined) return;

    event.preventDefault();

    const nextTab = MOBILE_TABS[nextIndex];

    setActiveTab(nextTab);
    event.currentTarget.querySelector<HTMLButtonElement>(`#${tabId(nextTab)}`)?.focus();
  }

  return (
    <div className="bg-background flex h-dvh min-h-0 flex-col overflow-hidden">
      <div className="border-border/80 bg-card/95 z-30 shrink-0 border-b px-3 py-2 shadow-[0_1px_0_color-mix(in_oklab,var(--foreground)_4%,transparent)] backdrop-blur md:px-4">
        {toolbar}
      </div>

      {modals}

      {/*
        A real WAI-ARIA tablist. These were three plain buttons whose only cue for the
        selected one was a visual variant, so a screen reader announced three buttons and
        gave no indication which panel was showing — the same defect `SectionAccordion`'s
        aria-expanded/aria-controls pairing was added to avoid.
      */}
      <div
        role="tablist"
        aria-label="Editor panels"
        onKeyDown={handleTabKeyDown}
        className="border-border/80 bg-card/95 grid shrink-0 grid-cols-3 gap-1 border-b p-1 md:hidden"
      >
        {MOBILE_TABS.map((tab) => (
          <MobileTabButton
            key={tab}
            tab={tab}
            label={tab === "settings" ? settingsLabel : TAB_LABELS[tab]}
            active={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          />
        ))}
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 overflow-hidden",
          contentOpen && settingsOpen
            ? "md:grid-cols-[340px_minmax(0,1fr)_340px] xl:grid-cols-[380px_minmax(0,1fr)_380px]"
            : contentOpen
              ? "md:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]"
              : settingsOpen
                ? "md:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]"
                : "md:grid-cols-1",
        )}
      >
        {/*
          Mounted whenever either viewport wants it, then shown per breakpoint: the mobile
          tab bar owns visibility below `md`, the collapse state owns it above. Gating the
          mount on `contentOpen` alone let a collapsed rail hide the panel the mobile
          "Content" tab was pointing at, leaving the whole body empty.
        */}
        {contentOpen || activeTab === "content" ? (
          <EditorRail
            side="left"
            label="Content"
            id={panelId("content")}
            labelledBy={tabId("content")}
            className={cn(
              activeTab === "content" ? "flex" : "hidden",
              contentOpen ? "md:flex" : "md:hidden",
            )}
            onClose={() => collapseRail("content")}
          >
            {contentPanel}
          </EditorRail>
        ) : null}

        <main
          id={panelId("preview")}
          role="tabpanel"
          aria-labelledby={tabId("preview")}
          className={cn(
            "relative min-h-0 bg-[color-mix(in_oklab,var(--background)_86%,white)]",
            activeTab === "preview" ? "block" : "hidden md:block",
          )}
        >
          <div className="border-border/70 bg-card/88 absolute top-3 left-3 z-20 flex items-center gap-1 rounded-full border p-1 shadow-sm backdrop-blur">
            {/* Paired with the rail's collapse control, so both halves of rail collapsing
                are desktop-only. */}
            {!contentOpen ? (
              <IconToolButton
                className="hidden md:flex"
                label="Open content panel"
                onClick={() => setContentOpen(true)}
              >
                <PanelLeftOpen className="h-4 w-4" />
              </IconToolButton>
            ) : null}

            {!settingsOpen ? (
              <IconToolButton
                className="hidden md:flex"
                label={`Open ${settingsLabel.toLowerCase()} panel`}
                onClick={() => setSettingsOpen(true)}
              >
                <PanelRightOpen className="h-4 w-4" />
              </IconToolButton>
            ) : null}

            <div className="bg-border/70 mx-1 h-5 w-px" />

            <IconToolButton label="Zoom out" onClick={() => updateZoom(zoom - ZOOM_STEP)}>
              <ZoomOut className="h-4 w-4" />
            </IconToolButton>

            {/* Live region: the zoom buttons are properly labelled, but the level itself
                was plain text, so pressing them announced nothing at all. */}
            <div
              aria-live="polite"
              aria-atomic="true"
              className="text-foreground min-w-13 px-2 text-center text-xs font-semibold tabular-nums"
            >
              {zoom}%
            </div>

            <IconToolButton label="Zoom in" onClick={() => updateZoom(zoom + ZOOM_STEP)}>
              <ZoomIn className="h-4 w-4" />
            </IconToolButton>

            <IconToolButton label="Fit canvas" onClick={() => updateZoom(78)}>
              <Maximize2 className="h-4 w-4" />
            </IconToolButton>

            <IconToolButton label="Reset canvas" onClick={resetCanvas}>
              <RotateCcw className="h-4 w-4" />
            </IconToolButton>
          </div>

          <div className="border-border/70 bg-card/88 absolute top-3 right-3 z-20 hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-sm backdrop-blur lg:flex">
            <Move className="text-muted h-4 w-4" />
            <span className="text-muted">Drag canvas or use arrow keys</span>
            <span className="bg-border h-1 w-1 rounded-full" />
            <span className="text-foreground truncate">{previewTitle}</span>
          </div>

          <div
            tabIndex={0}
            role="group"
            aria-label="Document preview canvas. Arrow keys pan, Shift for larger steps, Home resets."
            className={cn(
              "focus-visible:ring-accent/40 h-full min-h-0 cursor-grab touch-none overflow-hidden focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing",
              dragStart ? "select-none" : "",
            )}
            onKeyDown={handleCanvasKeyDown}
            onPointerUp={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerCancel={handlePointerEnd}
          >
            <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_42%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_42%,transparent)_1px,transparent_1px)] bg-size-[28px_28px]">
              <div className="absolute inset-0 flex items-start justify-center overflow-hidden px-6 pt-20 pb-12">
                {/* `motion-reduce:transition-none`: the pan/zoom transform is the largest
                    motion in the editor and arrow-key panning fires it repeatedly. */}
                <div
                  className="origin-top transform-gpu transition-transform duration-150 ease-out motion-reduce:transition-none"
                  id={previewId}
                  style={previewTransform}
                >
                  {preview}
                </div>
              </div>
            </div>
          </div>
        </main>

        {settingsOpen || activeTab === "settings" ? (
          <EditorRail
            side="right"
            label={settingsLabel}
            id={panelId("settings")}
            labelledBy={tabId("settings")}
            onClose={() => collapseRail("settings")}
            className={cn(
              activeTab === "settings" ? "flex" : "hidden",
              settingsOpen ? "md:flex" : "md:hidden",
            )}
          >
            {settingsPanel}
          </EditorRail>
        ) : null}
      </div>
    </div>
  );
}

function EditorRail({
  children,
  className,
  id,
  label,
  labelledBy,
  onClose,
  side,
}: {
  children: ReactNode;
  className?: string;
  id: string;
  label: string;
  labelledBy: string;
  onClose: () => void;
  side: "left" | "right";
}) {
  const CloseIcon = side === "left" ? PanelLeftClose : PanelRightClose;

  return (
    <aside
      id={id}
      role="tabpanel"
      aria-labelledby={labelledBy}
      className={cn(
        "border-border/80 bg-card min-h-0 flex-col overflow-hidden",
        side === "left" ? "border-r" : "border-l",
        className,
      )}
    >
      <div className="border-border/70 flex h-12 shrink-0 items-center justify-between border-b px-4">
        <p className="text-foreground text-sm font-semibold">{label}</p>

        {/* Desktop-only: below `md` the tab bar owns which panel is showing, so collapsing
            a rail there would only ever take the current tab's content away. */}
        <button
          type="button"
          onClick={onClose}
          aria-label={`Collapse ${label.toLowerCase()} panel`}
          className="text-muted hover:bg-background hover:text-foreground hidden h-8 w-8 items-center justify-center rounded-lg transition md:flex"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}

function IconToolButton({
  children,
  className,
  label,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      aria-label={label}
      className={cn(
        "text-muted hover:bg-background hover:text-foreground focus-visible:ring-accent/40 flex h-8 w-8 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      {children}
    </button>
  );
}

function MobileTabButton({
  active,
  label,
  onClick,
  tab,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  tab: MobileTab;
}) {
  return (
    <Button
      size="sm"
      role="tab"
      id={tabId(tab)}
      onClick={onClick}
      aria-selected={active}
      aria-controls={panelId(tab)}
      // Roving tabIndex: only the selected tab is in the tab order, so Tab moves from the
      // tablist into the panel rather than through all three tabs.
      tabIndex={active ? 0 : -1}
      variant={active ? "primary" : "ghost"}
      className="h-9 rounded-xl px-2 text-xs"
    >
      {label}
    </Button>
  );
}
