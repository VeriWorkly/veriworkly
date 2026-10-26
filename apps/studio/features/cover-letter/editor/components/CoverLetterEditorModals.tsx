"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { getDocumentEditorPath } from "@/features/documents/core/routes";
import {
  deleteDocumentEverywhere,
  listDocumentIndexEntries,
} from "@/features/documents/services/document-workspace-service";

import { useCoverLetterStore } from "@/features/cover-letter/store/cover-letter-store";

import ConfirmDialog, { documentDeleteNotice } from "@/components/modals/ConfirmDialog";
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
      await deleteDocumentEverywhere("COVER_LETTER", document);

      const next = listDocumentIndexEntries("COVER_LETTER")[0];

      if (next) {
        router.push(getDocumentEditorPath("COVER_LETTER", next.id));
      } else {
        // The last one: back to the library, not into a new document nobody asked for.
        setDocument(null);
        router.push("/documents");
      }

      toast.success("Cover letter deleted successfully");
      onDeleteModalClose();
    } catch (error) {
      toast.error(
        `Could not delete the cover letter: ${error instanceof Error ? error.message : "please try again."}`,
      );
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

      <ConfirmDialog
        tone="destructive"
        confirmPhrase="DELETE"
        loading={isDeleting}
        open={deleteModalOpen}
        onConfirm={onDeleteCoverLetter}
        onClose={onDeleteModalClose}
        title={"Delete Cover Letter?"}
        cancelLabel={`Keep ${document.title || "cover letter"}`}
        description={documentDeleteNotice(Boolean(document.sync.cloudDocumentId))}
      />
    </>
  );
};

export default CoverLetterEditorModals;
