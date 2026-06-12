import { useEffect, useRef, useState } from "react";
import { Laptop, Monitor, PanelLeftOpen, PanelRightOpen, Smartphone } from "lucide-react";
import { usePortfolioStore } from "@/store/portfolio-store";

export interface PreviewStageProps {
  structureOpen: boolean;
  contentOpen: boolean;
  onOpenStructure: () => void;
  onOpenContent: () => void;
  onFocusDesktop: () => void;
  onOpenEditingPanels: () => void;
}

export function PreviewStage({
  structureOpen,
  contentOpen,
  onOpenStructure,
  onOpenContent,
  onFocusDesktop,
  onOpenEditingPanels,
}: PreviewStageProps) {
  const [viewport, setViewport] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const content = usePortfolioStore((state) => state.content);
  const draft = usePortfolioStore((state) => state.draft);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const width = { mobile: 390, tablet: 768, desktop: "100%" }[viewport];

  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: "veriworkly:portfolio-preview", content },
      window.location.origin,
    );
  }, [content]);

  function setPreviewViewport(next: "mobile" | "tablet" | "desktop") {
    setViewport(next);
    if (next === "desktop") onFocusDesktop();
    else onOpenEditingPanels();
  }

  return (
    <aside className="bg-panel min-h-0 overflow-hidden">
      <div className="border-line flex h-11 items-center justify-between border-b px-3">
        <div className="flex items-center gap-1">
          {!structureOpen ? (
            <button
              className="text-muted hover:bg-paper grid size-7 place-items-center rounded-md"
              onClick={onOpenStructure}
              aria-label="Open page structure"
              type="button"
            >
              <PanelLeftOpen size={14} aria-hidden="true" />
            </button>
          ) : null}
          {!contentOpen ? (
            <button
              className="text-muted hover:bg-paper grid size-7 place-items-center rounded-md"
              onClick={onOpenContent}
              aria-label="Open content editor"
              type="button"
            >
              <PanelRightOpen size={14} aria-hidden="true" />
            </button>
          ) : null}
          <span className="ml-1 text-xs font-extrabold">Live preview</span>
        </div>
        <div className="bg-paper flex rounded-lg p-1">
          {(
            [
              ["mobile", Smartphone],
              ["tablet", Laptop],
              ["desktop", Monitor],
            ] as const
          ).map(([id, Icon]) => (
            <button
              key={id}
              className={`grid size-7 place-items-center rounded-md ${
                viewport === id ? "bg-panel text-accent shadow-sm" : "text-muted"
              }`}
              onClick={() => setPreviewViewport(id)}
              aria-label={`${id} preview`}
              type="button"
            >
              <Icon size={14} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      <div className="bg-paper-2 flex h-[calc(100%-2.75rem)] justify-center overflow-auto p-3">
        {draft ? (
          <iframe
            ref={frameRef}
            title="Live portfolio preview"
            src={`/preview/${draft.id}`}
            onLoad={() =>
              frameRef.current?.contentWindow?.postMessage(
                { type: "veriworkly:portfolio-preview", content },
                window.location.origin,
              )
            }
            style={{ width }}
            className="bg-panel shadow-shadow h-full min-h-[640px] shrink-0 border-0 transition-[width] duration-300"
          />
        ) : (
          <div className="text-muted grid h-full w-full place-items-center text-center text-xs font-bold">
            Saving the first draft to start live preview...
          </div>
        )}
      </div>
    </aside>
  );
}
