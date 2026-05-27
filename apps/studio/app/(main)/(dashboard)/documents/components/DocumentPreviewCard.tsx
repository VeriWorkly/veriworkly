"use client";

import Link from "next/link";
import Image from "next/image";

import { Badge } from "@veriworkly/ui";

import type { SyncTelemetry } from "@/features/documents/services/document-sync";
import type { DocumentLibraryItem } from "@/features/documents/services/document-library";

import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { getDocumentDefinition } from "@/features/documents/core/registry";
import { formatRelative } from "@/features/documents/services/document-library";

import { DocumentActionsMenu } from "./DocumentActionsMenu";
import { getSyncLabel, getActivityLabel, LibraryDocumentIcon } from "./document-display";

interface DocumentPreviewCardProps {
  doc: DocumentLibraryItem;
  syncing: boolean;
  telemetry: SyncTelemetry | null;
  onDeleteAction: (doc: DocumentLibraryItem) => void;
  onShareAction: (doc: DocumentLibraryItem) => void;
  onRenameAction: (doc: DocumentLibraryItem) => void;
  onSyncNowAction: (id: string) => void;
  onSyncDetailsAction: (id: string) => void;
}

export function DocumentPreviewCard({
  doc,
  syncing,
  telemetry,
  onDeleteAction,
  onShareAction,
  onRenameAction,
  onSyncNowAction,
  onSyncDetailsAction,
}: DocumentPreviewCardProps) {
  const editorPath = getDocumentEditorPath(doc.type, doc.id);

  return (
    <article className="group border-border bg-card hover:border-accent/40 relative aspect-3/4 w-full min-w-0 overflow-hidden rounded-xl border transition hover:shadow-sm">
      <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--background)_94%,white)]">
        <DocumentThumbnailPreview doc={doc} />
      </div>

      <div className="bg-background/90 border-border absolute right-0 bottom-0 left-0 z-10 min-w-0 translate-y-0 border-t p-3 backdrop-blur-md transition-transform duration-300 ease-in-out md:translate-y-[calc(100%-44px)] md:group-focus-within:translate-y-0 md:group-hover:translate-y-0">
        <div className="flex h-5 items-center justify-between gap-2">
          <h2 className="text-foreground truncate pr-2 text-sm font-bold">{doc.title}</h2>

          <Badge className="shrink-0 px-2 py-0.5 text-[10px] leading-none">
            {getDocumentDefinition(doc.type).label}
          </Badge>
        </div>

        <div className="mt-2.5 space-y-2.5">
          {doc.description && (
            <p className="text-muted-foreground truncate text-xs">{doc.description}</p>
          )}

          <div className="text-muted-foreground border-border/50 flex items-center justify-between gap-3 border-t pt-2 text-xs">
            <span className="truncate">{doc.templateName}</span>
            <span className="shrink-0" suppressHydrationWarning>
              {formatRelative(doc.updatedAt)}
            </span>
          </div>

          <dl className="text-muted-foreground grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-muted/20 border-border/40 min-w-0 rounded-lg border px-2 py-1.5">
              <dt className="sr-only">Status</dt>
              <dd className="text-foreground truncate font-medium">{getSyncLabel(doc.sync)}</dd>
            </div>

            <div className="bg-muted/20 border-border/40 min-w-0 rounded-lg border px-2 py-1.5">
              <dt className="sr-only">Activity</dt>
              <dd className="truncate">{getActivityLabel(doc.sync, telemetry)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <Link
        href={editorPath}
        aria-label={`Open ${doc.title}`}
        className="focus-visible:ring-accent absolute inset-0 z-20 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      />

      <DocumentActionsMenu
        doc={doc}
        syncing={syncing}
        onShareAction={onShareAction}
        onRenameAction={onRenameAction}
        onDeleteAction={onDeleteAction}
        onSyncNowAction={onSyncNowAction}
        onSyncDetailsAction={onSyncDetailsAction}
        className="absolute top-2 right-2 z-30"
        triggerClassName="opacity-100 pointer-events-auto md:opacity-0 md:pointer-events-none transition-opacity duration-200 md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:group-focus-within:opacity-100 md:group-focus-within:pointer-events-auto"
      />
    </article>
  );
}

function DocumentThumbnailPreview({ doc }: { doc: DocumentLibraryItem }) {
  if (doc.previewImage) {
    return (
      <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--background)_92%,white)]">
        <Image
          fill
          priority
          src={doc.previewImage}
          className="object-contain p-3"
          alt={`${doc.templateName} preview`}
          sizes="(max-width: 768px) 100vw, 25vw"
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 p-4">
      <div className="border-border bg-card h-full rounded-xl border p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-accent/10 text-accent flex h-9 w-9 items-center justify-center rounded-lg">
            <LibraryDocumentIcon className="h-5 w-5" type={doc.type} />
          </div>

          <div className="grid flex-1 gap-2">
            <div className="bg-muted/30 h-2.5 rounded-full" />
            <div className="bg-muted/20 h-2 rounded-full" />
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          <div className="bg-muted/25 h-2 rounded-full" />
          <div className="bg-muted/25 h-2 rounded-full" />
          <div className="bg-muted/20 h-2 w-2/3 rounded-full" />
        </div>
      </div>
    </div>
  );
}
