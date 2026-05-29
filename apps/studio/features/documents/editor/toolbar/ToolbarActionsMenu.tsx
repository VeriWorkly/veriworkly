"use client";

import {
  Trash2,
  Share2,
  RotateCcw,
  Settings2,
  FileCode2,
  ChevronDown,
  FolderInput,
} from "lucide-react";

import { Button, Menu, MenuItem, MenuSeparator } from "@veriworkly/ui";

interface ToolbarActionsMenuProps {
  onDelete: () => void;
  onImportJson: () => void;
  onImportMarkdown: () => void;
  onReset: () => void;
  onShare: () => void;
}

const ToolbarActionsMenu = ({
  onDelete,
  onImportJson,
  onImportMarkdown,
  onReset,
  onShare,
}: ToolbarActionsMenuProps) => {
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
            onClick={() => {
              close();
              onShare();
            }}
          >
            <Share2 className="h-4 w-4" />
            Create Share Link
          </MenuItem>

          <MenuSeparator />

          <MenuItem
            onClick={() => {
              close();
              onReset();
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </MenuItem>

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
