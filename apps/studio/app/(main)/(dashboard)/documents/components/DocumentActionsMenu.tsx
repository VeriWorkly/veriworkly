"use client";

import {
  Copy,
  Edit2,
  Cloud,
  Share2,
  Trash2,
  RefreshCw,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

import { Menu, MenuItem, MenuSeparator } from "@veriworkly/ui";

import type { DocumentLibraryItem } from "@/features/documents/services/document-library";
import { getDocumentEditorPath } from "@/features/documents/core/routes";

export interface DocumentActionsMenuProps {
  doc: DocumentLibraryItem;
  syncing: boolean;
  onDeleteAction: (doc: DocumentLibraryItem) => void;
  onShareAction: (doc: DocumentLibraryItem) => void;
  onRenameAction: (doc: DocumentLibraryItem) => void;
  onSyncNowAction: (id: string) => void;
  onSyncDetailsAction: (id: string) => void;
  className?: string;
  triggerClassName?: string;
}

export function DocumentActionsMenu({
  doc,
  syncing,
  onDeleteAction,
  onShareAction,
  onRenameAction,
  onSyncNowAction,
  onSyncDetailsAction,
  className,
  triggerClassName,
}: DocumentActionsMenuProps) {
  const router = useRouter();
  const editorPath = getDocumentEditorPath(doc.type, doc.id);

  return (
    <div className={className}>
      <Menu
        size="sm"
        panelClassName="z-50"
        trigger={({ open, toggle, menuId }) => (
          <div
            className={cn(
              "transition-opacity duration-200",
              open ? "pointer-events-auto opacity-100" : triggerClassName,
            )}
          >
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="menu"
              aria-controls={open ? menuId : undefined}
              aria-label={`Open actions for ${doc.title}`}
              className="border-border bg-card/90 text-foreground hover:bg-background focus-visible:ring-accent flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm backdrop-blur focus-visible:ring-2 focus-visible:outline-none"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggle();
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        )}
      >
        {({ close }) => (
          <>
            <MenuItem
              className="h-8 rounded-lg text-xs"
              onClick={() => {
                close();
                router.push(editorPath);
              }}
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </MenuItem>

            <MenuItem
              className="h-8 rounded-lg text-xs"
              onClick={() => {
                close();
                onRenameAction(doc);
              }}
            >
              <Edit2 className="h-4 w-4" />
              Rename
            </MenuItem>

            <MenuItem
              className="h-8 rounded-lg text-xs"
              onClick={() => {
                close();
                onShareAction(doc);
              }}
            >
              <Share2 className="h-4 w-4" />
              Create public link
            </MenuItem>

            <MenuItem
              className="h-8 rounded-lg text-xs"
              disabled={syncing}
              onClick={() => {
                close();
                onSyncNowAction(doc.id);
              }}
            >
              <RefreshCw className="h-4 w-4" />
              {syncing ? "Syncing..." : "Sync now"}
            </MenuItem>

            <MenuItem
              className="h-8 rounded-lg text-xs"
              onClick={() => {
                close();
                onSyncDetailsAction(doc.id);
              }}
            >
              <Cloud className="h-4 w-4" />
              View sync details
            </MenuItem>

          <MenuItem
            className="h-8 rounded-lg text-xs"
            onClick={() => {
              close();
              void navigator.clipboard.writeText(`${window.location.origin}${editorPath}`);
              toast.success("Editor Link Copied");
            }}
          >
            <Copy className="h-4 w-4" />
            Copy Editor Link
          </MenuItem>

            <MenuSeparator />

            <MenuItem
              className="text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10 h-8 rounded-lg text-xs"
              onClick={() => {
                close();
                onDeleteAction(doc);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </MenuItem>
          </>
        )}
      </Menu>
    </div>
  );
}
