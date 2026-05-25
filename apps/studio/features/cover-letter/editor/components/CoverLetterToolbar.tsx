"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { FileSearch } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@veriworkly/ui";

import type { CoverLetterContent } from "@/features/cover-letter/types";
import type { BaseDocument, ExportFormat } from "@/features/documents/core/types";

import ToolbarHeader from "@/features/documents/editor/toolbar/ToolbarHeader";
import ToolbarActionsMenu from "@/features/documents/editor/toolbar/ToolbarActionsMenu";
import ToolbarDownloadMenu from "@/features/documents/editor/toolbar/ToolbarDownloadMenu";

import { getDocumentPreviewPath } from "@/features/documents/core/routes";
import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";
import { exportDocumentByType } from "@/features/documents/export/export-dispatcher";

interface CoverLetterToolbarProps {
  document: BaseDocument<CoverLetterContent>;
  message: string;
  onDelete: () => void;
  onImportJson: (file: File | undefined) => Promise<void>;
  onOpenShare: () => void;
  onSave: () => void;
  onSetMessage: (message: string) => void;
  onUpdateDocument: (
    next: BaseDocument<CoverLetterContent>,
    options?: { debounceMs?: number; flush?: boolean },
  ) => void;
}

export function CoverLetterToolbar({
  document,
  message,
  onDelete,
  onImportJson,
  onOpenShare,
  onSave,
  onSetMessage,
  onUpdateDocument,
}: CoverLetterToolbarProps) {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDownload, setActiveDownload] = useState<ExportFormat | null>(null);

  async function download(format: ExportFormat) {
    setActiveDownload(format);

    try {
      await exportDocumentByType(document, format);
      onSetMessage(`${format.toUpperCase()} downloaded`);
    } catch {
      onSetMessage(`Could not generate ${format.toUpperCase()}`);
    } finally {
      setActiveDownload(null);
    }
  }

  return (
    <header className="border-border bg-card/95 z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-3xl border p-4 shadow-sm backdrop-blur">
      <ToolbarHeader
        title="Cover Letter Editor"
        message={message}
        onBack={() => router.push("/documents")}
      />

      <div className="flex flex-wrap items-center gap-2">
        {process.env.NODE_ENV === "development" ? (
          <Button asChild size="sm" variant="secondary">
            <Link
              href={`/pdf-debug/cover-letter/${document.templateId}?id=${document.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <FileSearch className="mr-2 h-4 w-4" />
              PDF Debug
            </Link>
          </Button>
        ) : null}

        <Button
          size="sm"
          variant="secondary"
          onClick={() => router.push(getDocumentPreviewPath("COVER_LETTER", document.id))}
        >
          Full Preview
        </Button>

        <Button size="sm" variant="secondary" onClick={onSave}>
          Save
        </Button>

        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          accept="application/json"
          onChange={(event) => {
            void onImportJson(event.target.files?.[0]).finally(() => {
              event.currentTarget.value = "";
            });
          }}
        />

        <ToolbarDownloadMenu
          activeDownload={activeDownload}
          onDownloadPdf={() => download("pdf")}
          onDownloadDocx={() => download("docx")}
          onDownloadHtml={() => void download("html")}
          onDownloadText={() => void download("txt")}
          onDownloadJson={() => void download("json")}
          onDownloadMarkdown={() => void download("markdown")}
        />

        <ToolbarActionsMenu
          onShare={onOpenShare}
          onDelete={onDelete}
          onExport={() => void download("json")}
          onImport={() => fileInputRef.current?.click()}
          onReset={() => {
            const reset = createDefaultCoverLetter(document.id);
            onUpdateDocument({ ...reset, updatedAt: new Date().toISOString() }, { flush: true });
            onSetMessage("Cover letter reset to defaults");
          }}
        />
      </div>
    </header>
  );
}
