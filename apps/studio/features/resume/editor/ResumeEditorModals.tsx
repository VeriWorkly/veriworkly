"use client";

import { toast } from "sonner";
import { memo, useState } from "react";
import { useRouter } from "next/navigation";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { trackUsageEvent } from "@/features/analytics/services/usage-metrics";
import { readResumeById } from "@/features/resume/services/resume-service";
import {
  deleteDocumentEverywhere,
  listDocumentIndexEntries,
} from "@/features/documents/services/document-workspace-service";

import ConfirmDialog, { documentDeleteNotice } from "@/components/modals/ConfirmDialog";
import ShareDocumentModal from "@/components/modals/ShareDocumentModal";

interface EditorModalsProps {
  shareModalOpen: boolean;
  onShareModalClose: () => void;
  deleteModalOpen: boolean;
  onDeleteModalClose: () => void;
}

/**
 * Memoised for the same reason as the toolbar: it hangs off the editor, which re-renders
 * on every keystroke, and it renders two modals whose props are otherwise unchanged. It
 * subscribes only to what it shows, so a keystroke in the content does not re-render it.
 */
const EditorModals = memo(function EditorModals({
  shareModalOpen,
  onShareModalClose,
  deleteModalOpen,
  onDeleteModalClose,
}: EditorModalsProps) {
  const router = useRouter();
  const resumeId = useResumeStore((state) => state.resume.id);
  const title = useResumeStore(
    (state) => state.resume.title || state.resume.basics.fullName || "Untitled Resume",
  );
  const inCloud = useResumeStore((state) => Boolean(state.resume.sync.cloudDocumentId));
  const setResume = useResumeStore((state) => state.setResume);
  const [isDeleting, setIsDeleting] = useState(false);

  async function onDeleteResume() {
    setIsDeleting(true);

    try {
      await deleteDocumentEverywhere("RESUME", useResumeStore.getState().resume);

      const nextId = listDocumentIndexEntries("RESUME")[0]?.id;
      const nextResume = nextId ? readResumeById(nextId) : null;

      if (nextResume) {
        setResume(nextResume);
        router.push(getDocumentEditorPath("RESUME", nextResume.id));
      } else {
        // The last one: back to the library, not into a new document nobody asked for.
        router.push("/documents");
      }

      trackUsageEvent({ event: "resume_deleted" });
      toast.success("Resume deleted successfully");
      onDeleteModalClose();
    } catch (error) {
      toast.error(
        `Could not delete the resume: ${error instanceof Error ? error.message : "please try again."}`,
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      {shareModalOpen && (
        <ShareDocumentModal
          documentId={resumeId}
          documentType="RESUME"
          documentTitle={title}
          onClose={onShareModalClose}
        />
      )}

      <ConfirmDialog
        tone="destructive"
        confirmPhrase="DELETE"
        loading={isDeleting}
        open={deleteModalOpen}
        onConfirm={onDeleteResume}
        onClose={onDeleteModalClose}
        title={"Delete Resume?"}
        cancelLabel={`Keep ${title}`}
        description={documentDeleteNotice(inCloud)}
      />
    </>
  );
});

export default EditorModals;
