"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@veriworkly/ui";
import {
  leavingLosesEdits,
  SAVE_PERSISTED_MESSAGE,
  SAVE_QUEUED_MESSAGE,
} from "@/features/documents/services/save-failure-message";
import { DOCUMENT_TITLE_MAX_LENGTH } from "@/features/documents/core/document-title";

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
        onClick={() => {
          // The edits since a failed save exist only in this page (S-408).
          if (
            leavingLosesEdits(message) &&
            !window.confirm(
              "Your latest edits could not be saved on this device and will be lost if you leave. Use Download → JSON first to keep them. Leave anyway?",
            )
          ) {
            return;
          }

          onBack();
        }}
        title="Back to documents"
        aria-label="Back to documents"
        className="h-9 w-9 shrink-0 rounded-xl px-0"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-0">
        <div className="flex items-center gap-1">
          {editing ? (
            <input
              ref={inputRef}
              aria-label="Document title"
              value={draft}
              maxLength={DOCUMENT_TITLE_MAX_LENGTH}
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
        {/* The editor's only persistent save feedback. Owned by the editor, not the
            toolbar, so autosave can report through it — see `ResumeEditor`. */}
        <p className="text-muted truncate text-xs" data-testid="editor-status">
          {message}
        </p>
        {/* Announced only when it matters: routine "Saving…/Saved" after every pause in typing
            would talk over the user's own typing echo. */}
        <p role="status" aria-live="polite" className="sr-only">
          {message === SAVE_QUEUED_MESSAGE || message === SAVE_PERSISTED_MESSAGE ? "" : message}
        </p>
      </div>
    </div>
  );
};

export default ToolbarHeader;
