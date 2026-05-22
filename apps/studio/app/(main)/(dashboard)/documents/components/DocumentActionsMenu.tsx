"use client";

import { Copy, Cloud, Share2, Trash2, RefreshCw, ExternalLink, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Menu, MenuItem, MenuSeparator } from "@veriworkly/ui";

import type { DocumentLibraryItem } from "@/features/documents/services/document-library";

export interface DocumentActionsMenuProps {
  doc: DocumentLibraryItem;
  syncing: boolean;
  onDeleteAction: (doc: DocumentLibraryItem) => void;
  onShareAction: (doc: DocumentLibraryItem) => void;
  onSyncNowAction: (id: string) => void;
  onSyncDetailsAction: (id: string) => void;
}

export function DocumentActionsMenu({
  doc,
  syncing,
  onDeleteAction,
  onShareAction,
  onSyncNowAction,
  onSyncDetailsAction,
}: DocumentActionsMenuProps) {
  return (
    <Menu
      size="sm"
      panelClassName="z-50"
      trigger={({ open, toggle, menuId }) => (
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={open ? menuId : undefined}
          aria-label={`Open actions for ${doc.title}`}
          className="border-border bg-card/90 text-foreground hover:bg-background flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm backdrop-blur"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggle();
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <MenuItem
            className="h-8 rounded-lg text-xs"
            onClick={() => {
              close();
              window.location.href = `/editor/${doc.type.toLowerCase()}/${doc.id}`;
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Open
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
              void navigator.clipboard.writeText(
                `${window.location.origin}/editor/${doc.type.toLowerCase()}/${doc.id}`,
              );
              toast.success("Document link copied");
            }}
          >
            <Copy className="h-4 w-4" />
            Copy link
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
  );
}
