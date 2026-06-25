"use client";

import Link from "next/link";
import Image from "next/image";
import { FileText } from "lucide-react";

import { Badge } from "@veriworkly/ui";

import { getDocumentDefinition } from "@/features/documents/core/registry";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { type DocumentLibraryItem } from "@/features/documents/services/document-library";
import { DocumentActionsMenu } from "../documents/components/DocumentActionsMenu";

interface RecentCardProps {
  doc: DocumentLibraryItem;
  syncing: boolean;
  onDeleteAction: (doc: DocumentLibraryItem) => void;
  onShareAction: (doc: DocumentLibraryItem) => void;
  onRenameAction: (doc: DocumentLibraryItem) => void;
  onSyncNowAction: (id: string) => void;
  onSyncDetailsAction: (id: string) => void;
}

const RecentCard = ({
  doc,
  syncing,
  onDeleteAction,
  onShareAction,
  onRenameAction,
  onSyncNowAction,
  onSyncDetailsAction,
}: RecentCardProps) => {
  const definition = getDocumentDefinition(doc.type);
  const editorPath = getDocumentEditorPath(doc.type, doc.id);

  return (
    <div className="border-border bg-background/70 group hover:border-accent/40 hover:bg-card relative overflow-hidden rounded-xl border transition">
      <div className="border-border/70 relative h-32 border-b bg-[color-mix(in_oklab,var(--card)_78%,var(--background))]">
        {doc.previewImage ? (
          <Image
            fill
            alt=""
            priority
            sizes="80vw"
            src={doc.previewImage}
            className="object-cover object-top p-2"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileText className="text-accent h-8 w-8" />
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-bold">{doc.title}</h3>
          <Badge className="px-2 py-0.5 text-[10px]">{definition.label}</Badge>
        </div>

        <p className="text-muted mt-1 truncate text-xs">{doc.description || doc.templateName}</p>
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
    </div>
  );
};

export default RecentCard;
