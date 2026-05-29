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

import { useResumeStore } from "@/features/resume/store/resume-store";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import {
  saveResume,
  importResumeFromFile,
  importResumeFromMarkdownFile,
} from "@/features/resume/services/resume-service";

interface ToolbarProps {
  resumeId: string;
  resumePreviewId: string;
  onOpenShare: () => void;
  onOpenDelete: () => void;
}

const ResumeToolbar = ({ resumeId, resumePreviewId, onOpenShare, onOpenDelete }: ToolbarProps) => {
  const router = useRouter();

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const markdownInputRef = useRef<HTMLInputElement>(null);

  const resume = useResumeStore((state) => state.resume);
  const resetResume = useResumeStore((state) => state.resetResume);
  const setResume = useResumeStore((state) => state.setResume);

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

  async function onImportMarkdown(file: File | undefined) {
    if (!file) return;

    try {
      const importedResume = await importResumeFromMarkdownFile(file, resume);
      const saveResult = saveResume(importedResume);

      if (!saveResult.ok) {
        setMessage(getSaveFailureMessage(saveResult.reason));
        return;
      }

      setResume(importedResume);
      router.push(getDocumentEditorPath("RESUME", importedResume.id));
      setMessage("Markdown imported successfully");
    } catch {
      setMessage("Import failed. Please use a valid Markdown file");
    }
  }

  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
      <ToolbarHeader title="Resume Editor" message={message} onBack={() => router.push("/")} />

      <div className="flex flex-wrap items-center justify-end gap-2">
        {process.env.NODE_ENV === "development" ? (
          <Button asChild size="sm" variant="ghost" className="rounded-xl">
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
          ref={jsonInputRef}
          accept="application/json"
          onChange={(event) => {
            void onImportResume(event.target.files?.[0]).finally(() => {
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
          onImportJson={() => jsonInputRef.current?.click()}
          onImportMarkdown={() => markdownInputRef.current?.click()}
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
