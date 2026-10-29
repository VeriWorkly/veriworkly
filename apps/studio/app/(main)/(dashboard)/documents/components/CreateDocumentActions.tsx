"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArchiveRestore, Plus, Upload } from "lucide-react";

import { Button, cn } from "@veriworkly/ui";

import { useCreateDocument } from "@/components/dashboard/hooks/useCreateDocument";
import { useDocumentJsonImport } from "@/features/documents/editor/toolbar/useDocumentJsonImport";
import { useHiddenFileInput } from "@/features/documents/editor/toolbar/useHiddenFileInput";

/** Every outcome of a restore is toasted; there is no status line here. */
const ignoreMessage = () => {};

const NewDocumentModal = dynamic(
  () =>
    import("@/components/dashboard/modals/NewDocumentModal").then((mod) => mod.NewDocumentModal),
  { ssr: false },
);

const ImportProfileModal = dynamic(
  () =>
    import("@/components/dashboard/modals/ImportProfileModal").then(
      (mod) => mod.ImportProfileModal,
    ),
  { ssr: false },
);

type ImportProvider = "linkedin" | "github";

/**
 * Create and import buttons for page content (empty states, the library header). The
 * sidebar's New Document button is not on phones, so every page that asks for a first
 * document carries its own, each with its own modals.
 */
export function CreateDocumentActions({
  createLabel = "New document",
  showImport = false,
  className,
}: {
  createLabel?: string;
  showImport?: boolean;
  className?: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [importProvider, setImportProvider] = useState<ImportProvider | null>(null);
  const { createNewDocument } = useCreateDocument();
  // The sign-out and delete-account backup restores from here, with no document needed: making
  // one first to reach an editor's Import JSON filled the free slot the backup needed (S-409).
  const {
    ref: backupRef,
    onChange: onBackupFile,
    open: openBackupFile,
  } = useHiddenFileInput(useDocumentJsonImport("RESUME", ignoreMessage));

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <Button
        size="sm"
        variant="primary"
        onClick={() => setCreateOpen(true)}
        className={cn("h-10 gap-2 rounded-xl px-4", showImport && "w-full sm:w-auto")}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {createLabel}
      </Button>

      {showImport ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setImportProvider("linkedin")}
          className="border-border h-10 w-full gap-2 rounded-xl border px-4 shadow-none sm:w-auto"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          Import from LinkedIn/GitHub
        </Button>
      ) : null}

      {showImport ? (
        <>
          <input
            type="file"
            className="hidden"
            ref={backupRef}
            accept="application/json"
            onChange={onBackupFile}
          />

          <Button
            size="sm"
            variant="ghost"
            onClick={openBackupFile}
            className="h-10 w-full gap-2 rounded-xl px-4 sm:w-auto"
          >
            <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
            Restore a backup
          </Button>
        </>
      ) : null}

      {createOpen ? (
        <NewDocumentModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreate={createNewDocument}
          onImportAction={setImportProvider}
        />
      ) : null}

      {importProvider ? (
        <ImportProfileModal
          open
          initialProvider={importProvider}
          onClose={() => setImportProvider(null)}
        />
      ) : null}
    </div>
  );
}
