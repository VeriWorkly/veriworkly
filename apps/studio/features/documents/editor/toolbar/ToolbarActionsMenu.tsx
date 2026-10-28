"use client";

import {
  Eye,
  Copy,
  Cloud,
  Trash2,
  Share2,
  Eraser,
  RotateCcw,
  Settings2,
  FileCode2,
  FileSearch,
  FolderInput,
  ScanSearch,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { useParams } from "next/navigation";

import { Button, Menu, MenuItem, MenuSeparator, cn } from "@veriworkly/ui";

import ConfirmDialog from "@/components/modals/ConfirmDialog";

import { toastSignInRequired } from "@/lib/sign-in";
import { useUserStore } from "@/store/useUserStore";

import { parseDocumentRouteSegment } from "@/features/documents/core/routes";
import { useCreateDocument } from "@/components/dashboard/hooks/useCreateDocument";

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
  /** Resumes only: opens the ATS checker on this document. */
  onCheckAts?: () => void;
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
  onCheckAts,
  onPdfDebug,
}: ToolbarActionsMenuProps) => {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const { duplicateDocument } = useCreateDocument();

  // The editor's route names the open document; both editors mount this menu there.
  const params = useParams<{ type: string; id: string }>();
  const routeType = params?.type ? parseDocumentRouteSegment(params.type) : null;

  const onDuplicate =
    routeType && params?.id ? () => void duplicateDocument(routeType, params.id) : undefined;

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
        onDuplicate={onDuplicate}
        onImportJson={onImportJson}
        onImportMarkdown={onImportMarkdown}
        onShare={onShare}
        onSync={onSync}
        onFullPreview={onFullPreview}
        onCheckAts={onCheckAts}
        onPdfDebug={onPdfDebug}
        onRequestReset={() => setPendingWipe("reset")}
        onRequestEmpty={() => setPendingWipe("empty")}
      />

      <ConfirmDialog
        open={pendingWipe !== null}
        onConfirm={confirmPendingWipe}
        onClose={() => setPendingWipe(null)}
        title={pendingWipe === "empty" ? "Empty all fields?" : "Reset to defaults?"}
        description={
          pendingWipe === "empty"
            ? `This clears every field in this ${documentLabel}. There is no undo.`
            : `This replaces this ${documentLabel}'s content with your Master Profile, or empties it if you have none. The template and style stay. There is no undo.`
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
  onDuplicate?: () => void;
  onImportJson: () => void;
  onImportMarkdown: () => void;
  onShare: () => void;
  onSync: () => void;
  onFullPreview?: () => void;
  onCheckAts?: () => void;
  onPdfDebug?: () => void;
  onRequestReset: () => void;
  onRequestEmpty: () => void;
}

const ToolbarActionsMenuTrigger = ({
  isLoggedIn,
  onDelete,
  onDuplicate,
  onImportJson,
  onImportMarkdown,
  onShare,
  onSync,
  onFullPreview,
  onCheckAts,
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

          {onCheckAts ? (
            <MenuItem
              className={cn(
                !isLoggedIn && "opacity-50 hover:bg-transparent focus-visible:bg-transparent",
              )}
              aria-disabled={!isLoggedIn || undefined}
              onClick={(e) => {
                // The checker scans with the account's allowance, as on the ATS page.
                if (!isLoggedIn) {
                  e.preventDefault();
                  e.stopPropagation();

                  toastSignInRequired("Sign in to check resumes with ATS.");

                  return;
                }

                close();
                onCheckAts();
              }}
            >
              <ScanSearch className="h-4 w-4" />
              Check with ATS
              {!isLoggedIn ? (
                <span className="text-muted ml-auto text-xs whitespace-nowrap">Sign in</span>
              ) : null}
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

          {onFullPreview || onCheckAts || onPdfDebug ? <MenuSeparator /> : null}

          {onDuplicate ? (
            <MenuItem
              onClick={() => {
                close();
                onDuplicate();
              }}
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </MenuItem>
          ) : null}

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
            aria-disabled={!isLoggedIn || undefined}
            onClick={(e) => {
              if (!isLoggedIn) {
                e.preventDefault();
                e.stopPropagation();

                toastSignInRequired("Sign in to share documents.");

                return;
              }

              close();
              onShare();
            }}
          >
            <Share2 className="h-4 w-4" />
            Create Share Link
            {!isLoggedIn ? (
              <span className="text-muted ml-auto text-xs whitespace-nowrap">Sign in</span>
            ) : null}
          </MenuItem>

          <MenuItem
            className={cn(
              !isLoggedIn && "opacity-50 hover:bg-transparent focus-visible:bg-transparent",
            )}
            aria-disabled={!isLoggedIn || undefined}
            onClick={(e) => {
              if (!isLoggedIn) {
                e.preventDefault();
                e.stopPropagation();

                toastSignInRequired("Sign in to back up documents.");

                return;
              }

              close();
              onSync();
            }}
          >
            <Cloud className="h-4 w-4" />
            Back up now
            {!isLoggedIn ? (
              <span className="text-muted ml-auto text-xs whitespace-nowrap">Sign in</span>
            ) : null}
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
