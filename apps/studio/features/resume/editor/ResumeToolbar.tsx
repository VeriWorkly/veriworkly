"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { FileSearch } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@veriworkly/ui";

import { useUserStore } from "@/store/useUserStore";

import {
  saveResume,
  importResumeFromFile,
  importResumeFromMarkdownFile,
} from "@/features/resume/services/resume-service";
import { syncDocumentNow } from "@/features/documents/services/document-sync";

import ToolbarHeader from "@/features/documents/editor/toolbar/ToolbarHeader";
import ToolbarActionsMenu from "@/features/documents/editor/toolbar/ToolbarActionsMenu";
import ToolbarDownloadMenu from "@/features/documents/editor/toolbar/ToolbarDownloadMenu";
import { useToolbarDownloads } from "@/features/resume/editor/toolbar/useToolbarDownloads";
import ToolbarSecondaryActions from "@/features/resume/editor/toolbar/ToolbarSecondaryActions";

import { useResumeStore } from "@/features/resume/store/resume-store";

import { getDocumentEditorPath } from "@/features/documents/core/routes";

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
  const emptyResume = useResumeStore((state) => state.emptyResume);
  const setResume = useResumeStore((state) => state.setResume);

  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const [message, setMessage] = useState("Autosave ready");

  async function handleSync() {
    if (!isLoggedIn) {
      toast.error("Please log in to sync documents.");
      return;
    }

    setMessage("Syncing with cloud...");

    try {
      await syncDocumentNow("RESUME", resumeId);
      setMessage("Synced successfully");
      toast.success("Synced successfully");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Sync failed";
      setMessage(`Sync failed: ${errMsg}`);
      toast.error(errMsg);
    }
  }

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
    if (reason === "quota-exceeded")
      return "Storage is full. Remove older resumes or exports and try again.";

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
      <ToolbarHeader
        message={message}
        title="Resume Editor"
        onBack={() => router.push("/documents")}
      />

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
          onEmptyFields={() => {
            emptyResume();
            setMessage("All fields cleared");
          }}
          onSync={handleSync}
        />
      </div>
    </div>
  );
};

export default ResumeToolbar;
