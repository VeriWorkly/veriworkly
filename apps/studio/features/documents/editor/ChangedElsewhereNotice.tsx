"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@veriworkly/ui";

import type { ChangedElsewhere } from "./useDocumentEditorSession";

interface ChangedElsewhereNoticeProps {
  changedElsewhere: ChangedElsewhere;
  busy: boolean;
  onKeepMine: () => void;
  onKeepOther: () => void;
}

const COPY: Record<ChangedElsewhere, { title: string; body: string; other: string }> = {
  device: {
    title: "This document changed on another device",
    body: "The cloud has a newer version than the one your edits started from. Your edits are saved on this device, but not backed up until you choose.",
    other: "Use the cloud version",
  },
  tab: {
    title: "This document changed elsewhere",
    body: "Another tab or a cloud update saved a different version while you were editing. Your edits in this tab are not saved until you choose, and are lost if you leave first.",
    other: "Use the other version",
  },
};

/** The choice the editor asks for instead of saving over, or backing up over, another version. */
export function ChangedElsewhereNotice({
  changedElsewhere,
  busy,
  onKeepMine,
  onKeepOther,
}: ChangedElsewhereNoticeProps) {
  const copy = COPY[changedElsewhere];

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3"
    >
      <AlertTriangle
        aria-hidden
        className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400"
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{copy.title}</p>
        <p className="text-muted-foreground text-xs">{copy.body}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={busy} onClick={onKeepOther}>
          {copy.other}
        </Button>

        <Button size="sm" loading={busy} onClick={onKeepMine}>
          Keep my version
        </Button>
      </div>
    </div>
  );
}

interface RecoveredEditsNoticeProps {
  savedAt: string;
  onRestore: () => void;
  onDiscard: () => void;
}

/** Offers back the edits that were held (not saved) when this document was last left. */
export function RecoveredEditsNotice({ savedAt, onRestore, onDiscard }: RecoveredEditsNoticeProps) {
  const time = new Date(savedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3"
    >
      <AlertTriangle
        aria-hidden
        className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400"
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">You left this document with unsaved edits</p>
        <p className="text-muted-foreground text-xs">
          They were not saved because another tab had saved a different version. Restoring puts them
          back in the editor, where they are saved over the current version.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onDiscard}>
          Discard
        </Button>

        <Button size="sm" onClick={onRestore}>
          Restore my unsaved edits from {time}
        </Button>
      </div>
    </div>
  );
}
