"use client";

import type { PointerEvent, ReactNode } from "react";

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

type EditorPanel = "content" | "settings";
type MobileTab = "content" | "preview" | "settings";

interface DocumentEditorShellProps {
  toolbar: ReactNode;
  modals?: ReactNode;
  contentPanel: ReactNode;
  settingsPanel: ReactNode;
  preview: ReactNode;
  previewTitle: string;
  previewId?: string;
  previewStageClassName?: string;
  contentLabel?: string;
  settingsLabel?: string;
  defaultPanel?: EditorPanel;
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
  previewStageClassName,
  contentLabel = "Content",
  settingsLabel = "Design",
  defaultPanel = "content",
}: DocumentEditorShellProps) {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [contentOpen, setContentOpen] = useState(defaultPanel !== "settings");

  const [dragStart, setDragStart] = useState<{
    pointerId: number;
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);

  const [zoom, setZoom] = useState(78);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [activeTab, setActiveTab] = useState<MobileTab>(
    defaultPanel === "settings" ? "settings" : "content",
  );

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

  return (
    <div className="bg-background flex h-dvh min-h-0 flex-col overflow-hidden">
      <div className="border-border/80 bg-card/95 z-30 shrink-0 border-b px-3 py-2 shadow-[0_1px_0_color-mix(in_oklab,var(--foreground)_4%,transparent)] backdrop-blur md:px-4">
        {toolbar}
      </div>

      {modals}

      <div className="border-border/80 bg-card/95 grid shrink-0 grid-cols-3 gap-1 border-b p-1 md:hidden">
        <MobileTabButton
          label={contentLabel}
          active={activeTab === "content"}
          onClick={() => setActiveTab("content")}
        />

        <MobileTabButton
          label="Preview"
          active={activeTab === "preview"}
          onClick={() => setActiveTab("preview")}
        />

        <MobileTabButton
          label={settingsLabel}
          active={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
        />
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
        {contentOpen ? (
          <EditorRail
            side="left"
            label={contentLabel}
            className={activeTab === "content" ? "flex" : "hidden md:flex"}
            onClose={() => setContentOpen(false)}
          >
            {contentPanel}
          </EditorRail>
        ) : null}

        <main
          className={cn(
            "relative min-h-0 bg-[color-mix(in_oklab,var(--background)_86%,white)]",
            activeTab === "preview" ? "block" : "hidden md:block",
          )}
        >
          <div className="border-border/70 bg-card/88 absolute top-3 left-3 z-20 flex items-center gap-1 rounded-full border p-1 shadow-sm backdrop-blur">
            {!contentOpen ? (
              <IconToolButton
                label={`Open ${contentLabel.toLowerCase()} panel`}
                onClick={() => setContentOpen(true)}
              >
                <PanelLeftOpen className="h-4 w-4" />
              </IconToolButton>
            ) : null}

            {!settingsOpen ? (
              <IconToolButton
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

            <div className="text-foreground min-w-13 px-2 text-center text-xs font-semibold tabular-nums">
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
            <span className="text-muted">Drag canvas</span>
            <span className="bg-border h-1 w-1 rounded-full" />
            <span className="text-foreground truncate">{previewTitle}</span>
          </div>

          <div
            className={cn(
              "h-full min-h-0 cursor-grab touch-none overflow-hidden active:cursor-grabbing",
              dragStart ? "select-none" : "",
            )}
            onPointerUp={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerCancel={handlePointerEnd}
          >
            <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_42%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_42%,transparent)_1px,transparent_1px)] bg-size-[28px_28px]">
              <div className="absolute inset-0 flex items-start justify-center overflow-hidden px-6 pt-20 pb-12">
                <div
                  className={cn(
                    "origin-top transform-gpu transition-transform duration-150 ease-out",
                    previewStageClassName,
                  )}
                  id={previewId}
                  style={previewTransform}
                >
                  {preview}
                </div>
              </div>
            </div>
          </div>
        </main>

        {settingsOpen ? (
          <EditorRail
            side="right"
            label={settingsLabel}
            onClose={() => setSettingsOpen(false)}
            className={activeTab === "settings" ? "flex" : "hidden md:flex"}
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
  label,
  onClose,
  side,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  onClose: () => void;
  side: "left" | "right";
}) {
  const CloseIcon = side === "left" ? PanelLeftClose : PanelRightClose;

  return (
    <aside
      className={cn(
        "border-border/80 bg-card min-h-0 flex-col overflow-hidden",
        side === "left" ? "border-r" : "border-l",
        className,
      )}
    >
      <div className="border-border/70 flex h-12 shrink-0 items-center justify-between border-b px-4">
        <p className="text-foreground text-sm font-semibold">{label}</p>

        <button
          type="button"
          onClick={onClose}
          aria-label={`Collapse ${label.toLowerCase()} panel`}
          className="text-muted hover:bg-background hover:text-foreground flex h-8 w-8 items-center justify-center rounded-lg transition"
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
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      aria-label={label}
      className="text-muted hover:bg-background hover:text-foreground focus-visible:ring-accent/40 flex h-8 w-8 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

function MobileTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      variant={active ? "primary" : "ghost"}
      className="h-9 rounded-xl px-2 text-xs"
    >
      {label}
    </Button>
  );
}
