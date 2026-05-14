"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import ToolbarHeader from "@/app/(main)/editor/components/toolbar/ToolbarHeader";
import ToolbarActionsMenu from "@/app/(main)/editor/components/toolbar/ToolbarActionsMenu";
import ToolbarDownloadMenu from "@/app/(main)/editor/components/toolbar/ToolbarDownloadMenu";
import ToolbarSecondaryActions from "@/app/(main)/editor/components/toolbar/ToolbarSecondaryActions";
import { useToolbarDownloads } from "@/app/(main)/editor/components/toolbar/useToolbarDownloads";

import { saveResume, importResumeFromFile } from "@/features/resume/services/resume-service";
import { useResume } from "@/features/resume/hooks/use-resume";

interface ToolbarProps {
  resumeId: string;
  resumePreviewId: string;
  onOpenShare: () => void;
  onOpenDelete: () => void;
}

const Toolbar = ({ resumeId, resumePreviewId, onOpenShare, onOpenDelete }: ToolbarProps) => {
  const router = useRouter();
  const { resetResume, resume, setResume } = useResume();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState("Autosave ready");

  const {
    activeDownload,
    onDownloadDocx,
    onDownloadHtml,
    onDownloadJson,
    onDownloadMarkdown,
    onDownloadPdf,
    onDownloadText,
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
      router.push(`/editor/${importedResume.id}`);
      setMessage("JSON imported successfully");
    } catch {
      setMessage("Import failed. Please use a valid JSON file");
    }
  }

  return (
    <div className="border-border bg-card/95 flex flex-wrap items-center justify-between gap-3 rounded-3xl border p-4 shadow-sm backdrop-blur">
      <ToolbarHeader message={message} onBack={() => router.push("/")} />

      <div className="flex items-center gap-2">
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
          onDownloadMarkdown={onDownloadMarkdown}
          onDownloadHtml={onDownloadHtml}
          onDownloadText={onDownloadText}
          onDownloadJson={onDownloadJson}
          activeDownload={activeDownload}
        />

        <ToolbarActionsMenu
          onDelete={onOpenDelete}
          onImport={() => fileInputRef.current?.click()}
          onExport={onDownloadJson}
          onShare={onOpenShare}
          onReset={() => {
            resetResume();
            setMessage("Resume reset to defaults");
          }}
        />
      </div>
    </div>
  );
};

export default Toolbar;
