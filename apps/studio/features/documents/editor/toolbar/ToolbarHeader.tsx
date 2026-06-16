"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@veriworkly/ui";

interface ToolbarHeaderProps {
  message: string;
  title?: string;
  onBack: () => void;
  onTitleChange?: (title: string) => void;
}

const ToolbarHeader = ({
  message,
  title = "Document Editor",
  onBack,
  onTitleChange,
}: ToolbarHeaderProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    if (!onTitleChange) return;
    setDraft(title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && onTitleChange) onTitleChange(trimmed);
    setEditing(false);
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={onBack}
        title="Back to dashboard"
        aria-label="Back to dashboard"
        className="h-9 w-9 shrink-0 rounded-xl px-0"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-0">
        <div className="flex items-center gap-1">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              autoFocus
              className="text-foreground w-full bg-transparent text-sm font-semibold outline-none"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditing(false);
              }}
            />
          ) : (
            <p
              className="text-foreground truncate text-sm font-semibold"
              title={onTitleChange ? "Click to rename" : undefined}
              onClick={startEditing}
              style={onTitleChange ? { cursor: "text" } : undefined}
            >
              {title}
            </p>
          )}

          {onTitleChange && !editing ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={startEditing}
              aria-label="Rename"
              className="h-5 w-5 shrink-0 rounded px-0 opacity-50 hover:opacity-100"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
        <p className="text-muted truncate text-xs">{message}</p>
      </div>
    </div>
  );
};

export default ToolbarHeader;
