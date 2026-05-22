"use client";

import { ArrowLeft } from "lucide-react";

import { Button } from "@veriworkly/ui";

interface ToolbarHeaderProps {
  message: string;
  title?: string;
  onBack: () => void;
}

const ToolbarHeader = ({ message, title = "Resume Editor", onBack }: ToolbarHeaderProps) => {
  return (
    <div className="flex items-start gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={onBack}
        title="Back to dashboard"
        aria-label="Back to dashboard"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div>
        <p className="text-foreground text-sm font-semibold">{title}</p>
        <p className="text-muted text-sm">{message}</p>
      </div>
    </div>
  );
};

export default ToolbarHeader;
