"use client";

import { Save } from "lucide-react";

import { Button } from "@veriworkly/ui";

import { useResumeStore } from "@/features/resume/store/resume-store";

interface ToolbarSecondaryActionsProps {
  onMessage: (msg: string) => void;
  getSaveFailureMessage: (reason: "quota-exceeded" | "unknown") => string;
}

const ToolbarSecondaryActions = ({
  onMessage,
  getSaveFailureMessage,
}: ToolbarSecondaryActionsProps) => {
  const saveToStorage = useResumeStore((state) => state.saveToStorage);

  return (
    <>
      <Button
        onClick={() => {
          const saveResult = saveToStorage({ flush: true });

          if (!saveResult.ok) {
            onMessage(getSaveFailureMessage(saveResult.reason));
            return;
          }

          onMessage("Draft saved locally");
        }}
        size="sm"
        variant="secondary"
        className="rounded-xl"
      >
        <Save className="mr-2 h-4 w-4" />
        Save
      </Button>
    </>
  );
};

export default ToolbarSecondaryActions;
