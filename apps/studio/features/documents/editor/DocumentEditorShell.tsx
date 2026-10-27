"use client";

import type { KeyboardEvent, PointerEvent, ReactNode, WheelEvent } from "react";

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
import { useEffect, useMemo, useRef, useState } from "react";

import { Button, cn } from "@veriworkly/ui";

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
  /** Shown under the toolbar while the document needs a decision (see ChangedElsewhereNotice). */
  notice?: ReactNode;
  modals?: ReactNode;
  contentPanel: ReactNode;
  settingsPanel: ReactNode;
  preview: ReactNode;
  previewTitle: string;
  previewId?: string;
  settingsLabel?: string;
}

const ZOOM_STEP = 10;
const MIN_ZOOM = 25;
const MAX_ZOOM = 140;
/** The desktop starting zoom; a narrower canvas starts at whatever fits its width. */
const DEFAULT_ZOOM = 78;
const WHEEL_LINE_PX = 16;

const PAN_VISIBLE_PX = 80;

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** The zoom at which the page is exactly as wide as the canvas, or null while either is hidden. */
function measureFitZoom(canvas: HTMLElement | null, page: HTMLElement | null): number | null {
  if (!canvas || !page || canvas.clientWidth === 0 || page.offsetWidth === 0) return null;

  const style = window.getComputedStyle(canvas);
  const available =
    canvas.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);

  return Math.floor((available / page.offsetWidth) * 100);
}

export function DocumentEditorShell({
  toolbar,
  notice,
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
    /** A finger on a phone pans sideways only: up and down is the browser's own scroll. */
    touch: boolean;
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);

  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // The page's unscaled height, so the scroll area on a touch screen ends where the page does.
  const [pageHeight, setPageHeight] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  // Until the user zooms by hand, the zoom follows the canvas: a phone gets a page that fits
  // its width instead of a fixed 78% that is wider than the screen.
  const zoomedByUserRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const page = pageRef.current;

    if (!canvas || !page) return;

    // Observes both: the canvas is display:none on a hidden mobile tab, and the page has no
    // width until the template has loaded.
    const observer = new ResizeObserver(() => {
      setPageHeight(page.offsetHeight);

      if (zoomedByUserRef.current) return;

      const fit = measureFitZoom(canvas, page);
      if (fit !== null) setZoom(clampZoom(Math.min(DEFAULT_ZOOM, fit)));
    });

    observer.observe(canvas);
    observer.observe(page);

    return () => observer.disconnect();
  }, []);

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
      // A transform leaves the layout box at full size; this trims it to the drawn height so a
      // touch screen's native scroll does not run on past the page.
      marginBottom: pageHeight * (zoom / 100 - 1),
    }),
    [pan.x, pan.y, zoom, pageHeight],
  );

  function updateZoom(nextZoom: number) {
    zoomedByUserRef.current = true;
    setZoom(clampZoom(nextZoom));
  }

  /** Fits the page to the canvas width (never past 100%) and recentres it. */
  function fitCanvas() {
    const fit = measureFitZoom(canvasRef.current, pageRef.current);

    zoomedByUserRef.current = false;
    setZoom(clampZoom(fit === null ? DEFAULT_ZOOM : Math.min(100, fit)));
    setPan({ x: 0, y: 0 });
  }

  function resetCanvas() {
    const fit = measureFitZoom(canvasRef.current, pageRef.current);

    zoomedByUserRef.current = false;
    setZoom(clampZoom(fit === null ? DEFAULT_ZOOM : Math.min(DEFAULT_ZOOM, fit)));
    setPan({ x: 0, y: 0 });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({
      pointerId: event.pointerId,
      // Only where the canvas scrolls natively (a coarse primary pointer): on a touch laptop
      // the canvas does not scroll, so a finger still pans both ways.
      touch: event.pointerType === "touch" && window.matchMedia("(pointer: coarse)").matches,
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
      y: dragStart.touch ? dragStart.panY : dragStart.panY + event.clientY - dragStart.y,
    });
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (dragStart?.pointerId === event.pointerId) {
      setDragStart(null);
    }
  }

  /**
   * Wheel and trackpad scrolling pan the page, so a mouse user can read down a long document
   * without dragging. Ctrl+wheel (and trackpad pinch, which arrives as one) is left to the
   * browser's own zoom. Line-mode deltas (Firefox with a mouse wheel) are converted to pixels.
   */
  function handleCanvasWheel(event: WheelEvent<HTMLDivElement>) {
    if (event.ctrlKey) return;

    const scale = event.deltaMode === 1 ? WHEEL_LINE_PX : 1;

    const canvas = canvasRef.current;
    const page = pageRef.current;
    // Where the canvas scrolls natively (a coarse primary pointer, even with a trackpad or mouse
    // attached), the browser already scrolls it up and down; panning too would move it twice.
    const nativeScroll = window.matchMedia("(pointer: coarse)").matches;
    const scrollTop = canvas?.scrollTop ?? 0;

    setPan((current) => {
      const next = {
        x: current.x - event.deltaX * scale,
        y: nativeScroll ? current.y : current.y - event.deltaY * scale,
      };
      if (!canvas || !page) return next;

      // Keep at least PAN_VISIBLE_PX of the page inside the canvas: a trackpad flick adds up
      // to thousands of pixels and would otherwise send the page out of sight.
      const factor = zoom / 100;
      const pageWidth = page.offsetWidth * factor;
      const pageHeight = page.offsetHeight * factor;
      const maxX = Math.max(0, (canvas.clientWidth + pageWidth) / 2 - PAN_VISIBLE_PX);
      const maxY = Math.max(0, pageHeight - PAN_VISIBLE_PX);

      // The page's place in view is its pan less how far the canvas has scrolled.
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(scrollTop + PAN_VISIBLE_PX, Math.max(scrollTop - maxY, next.y)),
      };
    });
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

      {notice && <div className="shrink-0 px-3 pt-2 md:px-4">{notice}</div>}

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

            <IconToolButton label="Fit canvas" onClick={fitCanvas}>
              <Maximize2 className="h-4 w-4" />
            </IconToolButton>

            <IconToolButton label="Reset canvas" onClick={resetCanvas}>
              <RotateCcw className="h-4 w-4" />
            </IconToolButton>
          </div>

          <div className="border-border/70 bg-card/88 absolute top-3 right-3 z-20 hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-sm backdrop-blur lg:flex">
            <Move className="text-muted h-4 w-4" />
            <span className="text-muted">Scroll, drag or use arrow keys</span>
            <span className="bg-border h-1 w-1 rounded-full" />
            <span className="text-foreground truncate">{previewTitle}</span>
          </div>

          <div
            tabIndex={0}
            role="group"
            aria-label="Document preview canvas. Arrow keys pan, Shift for larger steps, Home resets."
            className={cn(
              // `touch-pinch-zoom`, not `touch-none`: two fingers can zoom in to read the page.
              // On a phone a finger scrolls up and down natively, with momentum; sideways, and on
              // other touch screens in every direction, it pans through the handlers below.
              "focus-visible:ring-accent/40 h-full min-h-0 cursor-grab touch-pinch-zoom overflow-hidden focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing pointer-coarse:touch-pan-y",
              dragStart ? "select-none" : "",
            )}
            onKeyDown={handleCanvasKeyDown}
            onWheel={handleCanvasWheel}
            onPointerUp={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerCancel={handlePointerEnd}
          >
            <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_42%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_42%,transparent)_1px,transparent_1px)] bg-size-[28px_28px]">
              <div
                ref={canvasRef}
                className="absolute inset-0 flex items-start justify-center overflow-hidden px-3 pt-20 pb-12 md:px-6 pointer-coarse:overflow-y-auto pointer-coarse:overscroll-contain"
              >
                {/* `motion-reduce:transition-none`: the pan/zoom transform is the largest
                    motion in the editor and arrow-key panning fires it repeatedly. */}
                {/* On a phone the preview scrolls, and the paged preview's hidden measuring copy
                    (taller than the pages) would add blank scroll below them; clipping keeps it
                    out of the scroll area without changing what it measures. */}
                <div
                  ref={pageRef}
                  className="origin-top transform-gpu transition-transform duration-150 ease-out motion-reduce:transition-none pointer-coarse:overflow-clip pointer-coarse:[overflow-clip-margin:24px]"
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
