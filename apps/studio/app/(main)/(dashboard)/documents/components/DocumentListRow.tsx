"use client";

import Link from "next/link";

import { Badge, Button } from "@veriworkly/ui";

import type { SyncTelemetry } from "@/features/documents/services/document-sync";
import type { DocumentLibraryItem } from "@/features/documents/services/document-library";

import { getDocumentDefinition } from "@/features/documents/core/registry";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { formatRelative } from "@/features/documents/services/document-library";

import { DocumentActionsMenu } from "./DocumentActionsMenu";
import { docIconMap, getSyncLabel, getActivityLabel } from "./document-display";

interface DocumentListRowProps {
  doc: DocumentLibraryItem;
  syncing: boolean;
  telemetry: SyncTelemetry | null;
  onDeleteAction: (doc: DocumentLibraryItem) => void;
  onShareAction: (doc: DocumentLibraryItem) => void;
  onRenameAction: (doc: DocumentLibraryItem) => void;
  onSyncNowAction: (id: string) => void;
  onSyncDetailsAction: (id: string) => void;
}

export function DocumentListRow({
  doc,
  syncing,
  telemetry,
  onDeleteAction,
  onShareAction,
  onRenameAction,
  onSyncNowAction,
  onSyncDetailsAction,
}: DocumentListRowProps) {
  const Icon = docIconMap[doc.type];
  const editorPath = getDocumentEditorPath(doc.type, doc.id);

  return (
    <article className="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5">
      <div className="border-border bg-background flex h-12 w-10 shrink-0 items-center justify-center rounded-lg border sm:h-14 sm:w-11">
        <Icon className="text-accent h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-sm font-bold">{doc.title}</h2>
          <Badge className="px-2 py-0.5 text-[10px]">{getDocumentDefinition(doc.type).label}</Badge>
        </div>

        <p className="text-muted mt-1 truncate text-xs">{doc.description}</p>

        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <span className="bg-muted/25 rounded-md px-2 py-1">{doc.templateName}</span>

          <span className="bg-muted/25 rounded-md px-2 py-1">{getSyncLabel(doc.sync)}</span>

          <span className="bg-muted/25 rounded-md px-2 py-1">
            {getActivityLabel(doc.sync, telemetry)}
          </span>

          <span className="text-muted px-1 py-1" suppressHydrationWarning>
            Updated {formatRelative(doc.updatedAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        <Button asChild size="sm" variant="secondary">
          <Link href={editorPath}>Open</Link>
        </Button>

        <DocumentActionsMenu
          doc={doc}
          syncing={syncing}
          onShareAction={onShareAction}
          onRenameAction={onRenameAction}
          onDeleteAction={onDeleteAction}
          onSyncNowAction={onSyncNowAction}
          onSyncDetailsAction={onSyncDetailsAction}
        />
      </div>
    </article>
  );
}
