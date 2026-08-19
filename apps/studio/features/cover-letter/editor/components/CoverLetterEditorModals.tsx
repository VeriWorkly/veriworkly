"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { DocumentApi } from "@/features/documents/services/document-api";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import {
  createDocumentFromMasterProfile,
  deleteDocument,
  listDocumentIndexEntries,
} from "@/features/documents/services/document-workspace-service";

import { useCoverLetterStore } from "@/features/cover-letter/store/cover-letter-store";

import DestructiveModal from "@/components/modals/DestructiveModal";
import ShareDocumentModal from "@/components/modals/ShareDocumentModal";

interface CoverLetterEditorModalsProps {
  shareModalOpen: boolean;
  onShareModalClose: () => void;
  deleteModalOpen: boolean;
  onDeleteModalClose: () => void;
}

/**
 * Mirrors `features/resume/editor/ResumeEditorModals.tsx`.
 *
 * Deleting a cover letter used to go through a bare `window.confirm()` while deleting a
 * resume got a themed modal with a loading state and cloud cleanup — same conceptual
 * action, two different treatments, and the cover letter path never deleted the cloud copy.
 */
const CoverLetterEditorModals = ({
  shareModalOpen,
  onShareModalClose,
  deleteModalOpen,
  onDeleteModalClose,
}: CoverLetterEditorModalsProps) => {
  const router = useRouter();

  const document = useCoverLetterStore((state) => state.document);
  const setDocument = useCoverLetterStore((state) => state.setDocument);

  const [isDeleting, setIsDeleting] = useState(false);

  async function onDeleteCoverLetter() {
    if (!document) return;

    setIsDeleting(true);

    try {
      if (document.sync.cloudDocumentId) {
        await DocumentApi.delete(document.id);
      }

      deleteDocument("COVER_LETTER", document.id);

      const next = listDocumentIndexEntries("COVER_LETTER")[0];

      if (next) {
        router.push(getDocumentEditorPath("COVER_LETTER", next.id));
      } else {
        // Same behaviour as the resume editor: never leave the user on a dead editor.
        const fallback = await createDocumentFromMasterProfile("COVER_LETTER");
        setDocument(null);
        router.push(getDocumentEditorPath("COVER_LETTER", fallback.id));
      }

      toast.success("Cover letter deleted successfully");
      onDeleteModalClose();
    } catch (error) {
      toast.error("Failed to delete from cloud. Please try again.");
      console.error("Deletion error:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  if (!document) return null;

  return (
    <>
      {shareModalOpen && (
        <ShareDocumentModal
          documentId={document.id}
          documentType="COVER_LETTER"
          documentTitle={document.title || "Untitled Cover Letter"}
          onClose={onShareModalClose}
        />
      )}

      <DestructiveModal
        open={deleteModalOpen}
        onConfirmAction={onDeleteCoverLetter}
        onCloseAction={onDeleteModalClose}
        loading={isDeleting}
        entityName={document.title || "cover letter"}
        title="Delete Cover Letter?"
      />
    </>
  );
};

export default CoverLetterEditorModals;
