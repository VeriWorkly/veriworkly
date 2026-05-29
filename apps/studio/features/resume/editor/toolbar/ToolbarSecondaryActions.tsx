"use client";

import { Eye, Save } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@veriworkly/ui";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { getDocumentPreviewPath } from "@/features/documents/core/routes";

interface ToolbarSecondaryActionsProps {
  resumeId: string;
  onMessage: (msg: string) => void;
  getSaveFailureMessage: (reason: "quota-exceeded" | "unknown") => string;
}

const ToolbarSecondaryActions = ({
  resumeId,
  onMessage,
  getSaveFailureMessage,
}: ToolbarSecondaryActionsProps) => {
  const router = useRouter();

  const saveToStorage = useResumeStore((state) => state.saveToStorage);

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="rounded-xl"
        onClick={() => router.push(getDocumentPreviewPath("RESUME", resumeId))}
      >
        <Eye className="mr-2 h-4 w-4" />
        Full Preview
      </Button>

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
