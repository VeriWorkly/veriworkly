"use client";

import {
  Eye,
  Cloud,
  Trash2,
  Share2,
  Eraser,
  RotateCcw,
  Settings2,
  FileCode2,
  FileSearch,
  FolderInput,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { Button, Menu, MenuItem, MenuSeparator } from "@veriworkly/ui";

import { cn } from "@/lib/utils";

import ConfirmModal from "@/components/modals/ConfirmModal";

import { useUserStore } from "@/store/useUserStore";

interface ToolbarActionsMenuProps {
  /** Shown in the reset/empty confirmations, e.g. "resume" or "cover letter". */
  documentLabel: string;
  onDelete: () => void;
  onImportJson: () => void;
  onImportMarkdown: () => void;
  onReset: () => void;
  onShare: () => void;
  onSync: () => void;
  onEmptyFields: () => void;
  onFullPreview?: () => void;
  onPdfDebug?: () => void;
}

type PendingWipe = "reset" | "empty";

const ToolbarActionsMenu = ({
  documentLabel,
  onDelete,
  onImportJson,
  onImportMarkdown,
  onReset,
  onShare,
  onSync,
  onEmptyFields,
  onFullPreview,
  onPdfDebug,
}: ToolbarActionsMenuProps) => {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  // "Reset to Defaults" and "Empty Fields" both discard the entire document and there is
  // no undo stack, yet they used to fire straight from the menu with no confirmation —
  // while document *deletion* right below them did get a confirm dialog. Confirming here
  // covers both editors at once, since they share this menu.
  const [pendingWipe, setPendingWipe] = useState<PendingWipe | null>(null);

  function confirmPendingWipe() {
    if (pendingWipe === "reset") onReset();
    if (pendingWipe === "empty") onEmptyFields();

    setPendingWipe(null);
  }

  return (
    <>
      <ToolbarActionsMenuTrigger
        isLoggedIn={isLoggedIn}
        onDelete={onDelete}
        onImportJson={onImportJson}
        onImportMarkdown={onImportMarkdown}
        onShare={onShare}
        onSync={onSync}
        onFullPreview={onFullPreview}
        onPdfDebug={onPdfDebug}
        onRequestReset={() => setPendingWipe("reset")}
        onRequestEmpty={() => setPendingWipe("empty")}
      />

      <ConfirmModal
        open={pendingWipe !== null}
        onConfirmAction={confirmPendingWipe}
        onCloseAction={() => setPendingWipe(null)}
        title={pendingWipe === "empty" ? "Empty all fields?" : "Reset to defaults?"}
        description={
          pendingWipe === "empty"
            ? `This clears every field in this ${documentLabel}. There is no undo.`
            : `This replaces this ${documentLabel}'s content with the starter template. There is no undo.`
        }
        confirmLabel={pendingWipe === "empty" ? "Empty fields" : "Reset"}
        cancelLabel="Keep my changes"
      />
    </>
  );
};

interface ToolbarActionsMenuTriggerProps {
  isLoggedIn: boolean;
  onDelete: () => void;
  onImportJson: () => void;
  onImportMarkdown: () => void;
  onShare: () => void;
  onSync: () => void;
  onFullPreview?: () => void;
  onPdfDebug?: () => void;
  onRequestReset: () => void;
  onRequestEmpty: () => void;
}

const ToolbarActionsMenuTrigger = ({
  isLoggedIn,
  onDelete,
  onImportJson,
  onImportMarkdown,
  onShare,
  onSync,
  onFullPreview,
  onPdfDebug,
  onRequestReset,
  onRequestEmpty,
}: ToolbarActionsMenuTriggerProps) => {
  return (
    <Menu
      panelClassName="min-w-52"
      trigger={({ menuId, open, toggle }) => (
        <Button
          size="sm"
          onClick={toggle}
          variant="secondary"
          aria-expanded={open}
          aria-haspopup="menu"
          className="gap-2 rounded-xl"
          aria-controls={open ? menuId : undefined}
        >
          <Settings2 className="h-4 w-4" />
          Actions
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
    >
      {({ close }) => (
        <>
          {onFullPreview ? (
            <MenuItem
              onClick={() => {
                close();
                onFullPreview();
              }}
            >
              <Eye className="h-4 w-4" />
              Full Preview
            </MenuItem>
          ) : null}

          {onPdfDebug ? (
            <MenuItem
              onClick={() => {
                close();
                onPdfDebug();
              }}
            >
              <FileSearch className="h-4 w-4" />
              PDF Debug
            </MenuItem>
          ) : null}

          {onFullPreview || onPdfDebug ? <MenuSeparator /> : null}

          <MenuItem
            onClick={() => {
              close();
              onImportJson();
            }}
          >
            <FolderInput className="h-4 w-4" />
            Import JSON
          </MenuItem>

          <MenuItem
            onClick={() => {
              close();
              onImportMarkdown();
            }}
          >
            <FileCode2 className="h-4 w-4" />
            Import Markdown
          </MenuItem>

          <MenuSeparator />

          <MenuItem
            className={cn(
              !isLoggedIn && "opacity-50 hover:bg-transparent focus-visible:bg-transparent",
            )}
            onClick={(e) => {
              if (!isLoggedIn) {
                e.preventDefault();
                e.stopPropagation();

                toast.error("Please log in to share documents.");

                return;
              }

              close();
              onShare();
            }}
          >
            <Share2 className="h-4 w-4" />
            Create Share Link
          </MenuItem>

          <MenuItem
            className={cn(
              !isLoggedIn && "opacity-50 hover:bg-transparent focus-visible:bg-transparent",
            )}
            onClick={(e) => {
              if (!isLoggedIn) {
                e.preventDefault();
                e.stopPropagation();

                toast.error("Please log in to sync documents.");

                return;
              }

              close();
              onSync();
            }}
          >
            <Cloud className="h-4 w-4" />
            Upload to Cloud
          </MenuItem>

          <MenuSeparator />

          <MenuItem
            onClick={() => {
              close();
              onRequestReset();
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </MenuItem>

          <MenuItem
            onClick={() => {
              close();
              onRequestEmpty();
            }}
          >
            <Eraser className="h-4 w-4" />
            Empty Fields
          </MenuItem>

          <MenuSeparator />

          <MenuItem
            className="text-red-600 hover:text-red-700"
            onClick={() => {
              close();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </MenuItem>
        </>
      )}
    </Menu>
  );
};

export default ToolbarActionsMenu;
