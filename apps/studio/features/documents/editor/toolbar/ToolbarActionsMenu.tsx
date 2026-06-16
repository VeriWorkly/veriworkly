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

import { Button, Menu, MenuItem, MenuSeparator } from "@veriworkly/ui";

import { cn } from "@/lib/utils";

import { useUserStore } from "@/store/useUserStore";

interface ToolbarActionsMenuProps {
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

const ToolbarActionsMenu = ({
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

          {(onFullPreview || onPdfDebug) ? <MenuSeparator /> : null}

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
              onReset();
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </MenuItem>

          <MenuItem
            onClick={() => {
              close();
              onEmptyFields();
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
