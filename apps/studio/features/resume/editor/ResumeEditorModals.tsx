"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { DocumentApi } from "@/features/documents/services/document-api";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { trackUsageEvent } from "@/features/analytics/services/usage-metrics";
import { deleteResume, createResume } from "@/features/resume/services/resume-service";

import DestructiveModal from "@/components/modals/DestructiveModal";
import ShareDocumentModal from "@/components/modals/ShareDocumentModal";

interface EditorModalsProps {
  shareModalOpen: boolean;
  onShareModalClose: () => void;
  deleteModalOpen: boolean;
  onDeleteModalClose: () => void;
}

const EditorModals = ({
  shareModalOpen,
  onShareModalClose,
  deleteModalOpen,
  onDeleteModalClose,
}: EditorModalsProps) => {
  const router = useRouter();
  const resume = useResumeStore((state) => state.resume);
  const setResume = useResumeStore((state) => state.setResume);
  const [isDeleting, setIsDeleting] = useState(false);

  async function onDeleteResume() {
    setIsDeleting(true);

    try {
      if (resume.sync.cloudDocumentId) {
        await DocumentApi.delete(resume.id);
      }

      const nextResume = deleteResume(resume.id);

      if (!nextResume) {
        const fallback = createResume();
        setResume(fallback);
        router.push(getDocumentEditorPath("RESUME", fallback.id));
      } else {
        setResume(nextResume);
        router.push(getDocumentEditorPath("RESUME", nextResume.id));
      }

      trackUsageEvent({ event: "resume_deleted" });
      toast.success("Resume deleted successfully");
      onDeleteModalClose();
    } catch (error) {
      toast.error("Failed to delete from cloud. Please try again.");
      console.error("Deletion error:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      {shareModalOpen && (
        <ShareDocumentModal
          documentId={resume.id}
          documentType="RESUME"
          documentTitle={resume.basics.fullName || "Untitled Resume"}
          onClose={onShareModalClose}
        />
      )}

      <DestructiveModal
        open={deleteModalOpen}
        onConfirmAction={onDeleteResume}
        onCloseAction={onDeleteModalClose}
        loading={isDeleting}
        entityName={resume.basics.fullName || "resume"}
        title="Delete Resume?"
      />
    </>
  );
};

export default EditorModals;
