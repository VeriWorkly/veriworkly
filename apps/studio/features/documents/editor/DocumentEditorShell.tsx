"use client";

import type { ReactNode } from "react";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button, Card } from "@veriworkly/ui";

import { cn } from "@/lib/utils";

type EditorPanel = "content" | "settings";
type MobileTab = "editor" | "preview";

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
  settingsLabel = "Settings",
  defaultPanel = "content",
}: DocumentEditorShellProps) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<MobileTab>("editor");
  const [activePanel, setActivePanel] = useState<EditorPanel>(defaultPanel);

  return (
    <div className="flex h-[calc(100dvh-2rem)] min-h-0 flex-col gap-4 overflow-hidden">
      <div className="sticky top-0 z-30">{toolbar}</div>

      {modals}

      <div className="border-border bg-card inline-flex shrink-0 rounded-2xl border p-1 md:hidden">
        <button
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium",
            activeTab === "editor" ? "bg-accent text-accent-foreground" : "text-muted",
          )}
          onClick={() => setActiveTab("editor")}
          type="button"
        >
          Edit
        </button>

        <button
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium",
            activeTab === "preview" ? "bg-accent text-accent-foreground" : "text-muted",
          )}
          onClick={() => setActiveTab("preview")}
          type="button"
        >
          Preview
        </button>
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-4 overflow-hidden",
          panelOpen ? "xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]" : "grid-cols-1",
        )}
      >
        {panelOpen ? (
          <div className={activeTab === "preview" ? "hidden min-h-0 md:block" : "block min-h-0"}>
            <Card className="flex h-full min-h-0 flex-col p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="border-border bg-background inline-flex rounded-2xl border p-1">
                  <PanelTabButton
                    active={activePanel === "content"}
                    label={contentLabel}
                    onClick={() => setActivePanel("content")}
                  />

                  <PanelTabButton
                    active={activePanel === "settings"}
                    label={settingsLabel}
                    onClick={() => setActivePanel("settings")}
                  />
                </div>

                <button
                  className="border-border bg-background text-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-xl border"
                  onClick={() => setPanelOpen(false)}
                  type="button"
                  aria-label="Collapse editor panel"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {activePanel === "content" ? contentPanel : settingsPanel}
              </div>
            </Card>
          </div>
        ) : (
          <div className={activeTab === "preview" ? "hidden min-h-0 md:block" : "block min-h-0"}>
            <Card className="space-y-3 p-3">
              <p className="text-muted px-1 text-xs font-semibold tracking-[0.2em] uppercase">
                Panels
              </p>

              <Button
                className="w-full justify-start"
                variant={activePanel === "content" ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  setActivePanel("content");
                  setPanelOpen(true);
                }}
              >
                <PanelLeftOpen className="mr-2 h-4 w-4" />
                Open {contentLabel.toLowerCase()}
              </Button>

              <Button
                className="w-full justify-start"
                variant={activePanel === "settings" ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  setActivePanel("settings");
                  setPanelOpen(true);
                }}
              >
                <PanelLeftOpen className="mr-2 h-4 w-4" />
                Open {settingsLabel.toLowerCase()}
              </Button>
            </Card>
          </div>
        )}

        <Card
          className={cn(
            "h-full min-h-0 flex-col overflow-hidden p-0",
            activeTab === "editor" ? "hidden md:flex" : "flex",
          )}
        >
          <div className="from-background via-card to-background relative flex min-h-0 flex-1 flex-col bg-linear-to-br">
            <div className="border-border/80 bg-card/80 shrink-0 border-b px-4 py-3 backdrop-blur md:px-6">
              <p className="text-muted text-[11px] font-semibold tracking-[0.22em] uppercase">
                Live Preview
              </p>
              <p className="text-foreground text-sm font-medium">{previewTitle}</p>
            </div>

            <div className="relative h-full min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
              <div
                className={cn(
                  "relative flex min-h-[70vh] justify-center rounded-3xl border border-dashed border-[color-mix(in_oklab,var(--border)_70%,transparent)] bg-[color-mix(in_oklab,var(--background)_92%,white)]",
                  previewStageClassName,
                )}
              >
                <div className="w-full max-w-212.5" id={previewId}>
                  {preview}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PanelTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-medium",
        active ? "bg-accent text-accent-foreground" : "text-muted",
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
