"use client";

import {
  Trash2,
  Share2,
  Download,
  RotateCcw,
  Settings2,
  ChevronDown,
  FolderInput,
} from "lucide-react";

import { Button, Menu, MenuItem, MenuSeparator } from "@veriworkly/ui";

interface ToolbarActionsMenuProps {
  onDelete: () => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onShare: () => void;
}

const ToolbarActionsMenu = ({
  onDelete,
  onExport,
  onImport,
  onReset,
  onShare,
}: ToolbarActionsMenuProps) => {
  return (
    <Menu
      panelClassName="min-w-52"
      trigger={({ menuId, open, toggle }) => (
        <Button
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={open ? menuId : undefined}
          className="gap-2"
          onClick={toggle}
          size="sm"
          variant="secondary"
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
              onImport();
            }}
          >
            <FolderInput className="h-4 w-4" />
            Import JSON
          </MenuItem>

          <MenuItem
            onClick={() => {
              close();
              onExport();
            }}
          >
            <Download className="h-4 w-4" />
            Export JSON
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
