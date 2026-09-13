"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import type { DocumentType } from "@/features/documents/core/document-types";
import { getDocumentEditorPath } from "@/features/documents/core/routes";

const WorkspaceSearchModal = dynamic(
  () => import("../WorkspaceSearchModal").then((mod) => mod.WorkspaceSearchModal),
  { ssr: false },
);

const NewDocumentModal = dynamic(
  () => import("../NewDocumentModal").then((mod) => mod.NewDocumentModal),
  { ssr: false },
);

const ImportProfileModal = dynamic(
  () => import("../ImportProfileModal").then((mod) => mod.ImportProfileModal),
  { ssr: false },
);

interface DashboardModalsHostProps {
  searchOpen: boolean;
  onCloseSearch: () => void;
  newDocumentOpen: boolean;
  onCloseNewDocument: () => void;
  onCreateNewDocument: (type: DocumentType) => void;
  importModalOpen: boolean;
  onCloseImportModal: () => void;
  importProvider: "linkedin" | "github";
  onOpenImport: (provider: "linkedin" | "github") => void;
}

export function DashboardModalsHost({
  searchOpen,
  onCloseSearch,
  newDocumentOpen,
  onCloseNewDocument,
  onCreateNewDocument,
  importModalOpen,
  onCloseImportModal,
  importProvider,
  onOpenImport,
}: DashboardModalsHostProps) {
  const router = useRouter();

  return (
    <>
      {searchOpen ? (
        <WorkspaceSearchModal
          open={searchOpen}
          onClose={onCloseSearch}
          onOpenDocument={(doc) => router.push(getDocumentEditorPath(doc.type, doc.id))}
        />
      ) : null}

      {newDocumentOpen ? (
        <NewDocumentModal
          open={newDocumentOpen}
          onCreate={onCreateNewDocument}
          onClose={onCloseNewDocument}
          onImportAction={(provider) => {
            onOpenImport(provider);
          }}
        />
      ) : null}

      {importModalOpen ? (
        <ImportProfileModal
          open={importModalOpen}
          onClose={onCloseImportModal}
          initialProvider={importProvider}
        />
      ) : null}
    </>
  );
}
