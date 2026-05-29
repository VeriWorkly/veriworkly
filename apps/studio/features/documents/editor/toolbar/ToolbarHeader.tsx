"use client";

import { ArrowLeft } from "lucide-react";

import { Button } from "@veriworkly/ui";

interface ToolbarHeaderProps {
  message: string;
  title?: string;
  onBack: () => void;
}

const ToolbarHeader = ({ message, title = "Document Editor", onBack }: ToolbarHeaderProps) => {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={onBack}
        title="Back to dashboard"
        aria-label="Back to dashboard"
        className="h-9 w-9 shrink-0 rounded-xl px-0"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-0">
        <p className="text-foreground truncate text-sm font-semibold">{title}</p>
        <p className="text-muted truncate text-xs">{message}</p>
      </div>
    </div>
  );
};

export default ToolbarHeader;
