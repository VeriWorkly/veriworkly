"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileSearch, Save } from "lucide-react";

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
  onImportMarkdown: (file: File | undefined) => Promise<void>;
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
  onImportMarkdown,
  onOpenShare,
  onSave,
  onSetMessage,
  onUpdateDocument,
}: CoverLetterToolbarProps) {
  const router = useRouter();

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const markdownInputRef = useRef<HTMLInputElement>(null);
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
    <header className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2">
      <ToolbarHeader
        title="Cover Letter Editor"
        message={message}
        onBack={() => router.push("/documents")}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        {process.env.NODE_ENV === "development" ? (
          <Button asChild size="sm" variant="ghost" className="rounded-xl">
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
          variant="ghost"
          className="rounded-xl"
          onClick={() => router.push(getDocumentPreviewPath("COVER_LETTER", document.id))}
        >
          <Eye className="mr-2 h-4 w-4" />
          Full Preview
        </Button>

        <Button size="sm" variant="secondary" className="rounded-xl" onClick={onSave}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>

        <input
          type="file"
          className="hidden"
          ref={jsonInputRef}
          accept="application/json"
          onChange={(event) => {
            void onImportJson(event.target.files?.[0]).finally(() => {
              event.currentTarget.value = "";
            });
          }}
        />

        <input
          type="file"
          className="hidden"
          ref={markdownInputRef}
          accept="text/markdown,.md,.markdown"
          onChange={(event) => {
            void onImportMarkdown(event.target.files?.[0]).finally(() => {
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
          onImportJson={() => jsonInputRef.current?.click()}
          onImportMarkdown={() => markdownInputRef.current?.click()}
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
