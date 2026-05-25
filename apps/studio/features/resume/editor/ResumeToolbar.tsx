"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { FileSearch } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@veriworkly/ui";

import ToolbarHeader from "@/features/documents/editor/toolbar/ToolbarHeader";
import ToolbarActionsMenu from "@/features/documents/editor/toolbar/ToolbarActionsMenu";
import ToolbarDownloadMenu from "@/features/documents/editor/toolbar/ToolbarDownloadMenu";
import { useToolbarDownloads } from "@/features/resume/editor/toolbar/useToolbarDownloads";
import ToolbarSecondaryActions from "@/features/resume/editor/toolbar/ToolbarSecondaryActions";

import { useResume } from "@/features/resume/hooks/use-resume";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { saveResume, importResumeFromFile } from "@/features/resume/services/resume-service";

interface ToolbarProps {
  resumeId: string;
  resumePreviewId: string;
  onOpenShare: () => void;
  onOpenDelete: () => void;
}

const ResumeToolbar = ({ resumeId, resumePreviewId, onOpenShare, onOpenDelete }: ToolbarProps) => {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { resetResume, resume, setResume } = useResume();

  const [message, setMessage] = useState("Autosave ready");

  const {
    activeDownload,
    onDownloadPdf,
    onDownloadDocx,
    onDownloadHtml,
    onDownloadJson,
    onDownloadText,
    onDownloadMarkdown,
  } = useToolbarDownloads(resume, resumePreviewId, setMessage);

  function getSaveFailureMessage(reason: "quota-exceeded" | "unknown") {
    if (reason === "quota-exceeded") {
      return "Storage is full. Remove older resumes or exports and try again.";
    }
    return "Unable to save locally right now. Please try again.";
  }

  async function onImportResume(file: File | undefined) {
    if (!file) return;

    try {
      const importedResume = await importResumeFromFile(file);
      const saveResult = saveResume(importedResume);

      if (!saveResult.ok) {
        setMessage(getSaveFailureMessage(saveResult.reason));
        return;
      }

      setResume(importedResume);
      router.push(getDocumentEditorPath("RESUME", importedResume.id));
      setMessage("JSON imported successfully");
    } catch {
      setMessage("Import failed. Please use a valid JSON file");
    }
  }

  return (
    <div className="border-border bg-card/95 flex flex-wrap items-center justify-between gap-3 rounded-3xl border p-4 shadow-sm backdrop-blur">
      <ToolbarHeader title="Resume Editor" message={message} onBack={() => router.push("/")} />

      <div className="flex items-center gap-2">
        {process.env.NODE_ENV === "development" ? (
          <Button asChild size="sm" variant="secondary">
            <Link
              href={`/pdf-debug/resume/${resume.templateId}?id=${resume.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <FileSearch className="mr-2 h-4 w-4" />
              PDF Debug
            </Link>
          </Button>
        ) : null}

        <ToolbarSecondaryActions
          resumeId={resumeId}
          onMessage={setMessage}
          getSaveFailureMessage={getSaveFailureMessage}
        />

        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          accept="application/json"
          onChange={(event) => onImportResume(event.target.files?.[0])}
        />

        <ToolbarDownloadMenu
          onDownloadPdf={onDownloadPdf}
          onDownloadDocx={onDownloadDocx}
          onDownloadHtml={onDownloadHtml}
          onDownloadText={onDownloadText}
          onDownloadJson={onDownloadJson}
          activeDownload={activeDownload}
          onDownloadMarkdown={onDownloadMarkdown}
        />

        <ToolbarActionsMenu
          onShare={onOpenShare}
          onDelete={onOpenDelete}
          onExport={onDownloadJson}
          onImport={() => fileInputRef.current?.click()}
          onReset={() => {
            resetResume();
            setMessage("Resume reset to defaults");
          }}
        />
      </div>
    </div>
  );
};

export default ResumeToolbar;
