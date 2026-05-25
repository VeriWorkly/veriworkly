"use client";

import { useRouter } from "next/navigation";

import { Button } from "@veriworkly/ui";

import { useResume } from "@/features/resume/hooks/use-resume";
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

  const { saveToStorage } = useResume();

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => router.push(getDocumentPreviewPath("RESUME", resumeId))}
      >
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
      >
        Save
      </Button>
    </>
  );
};

export default ToolbarSecondaryActions;
