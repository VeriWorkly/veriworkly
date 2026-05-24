"use client";

import { toast } from "sonner";
import {
  Files,
  Code2,
  FileText,
  FileJson,
  Download,
  FileDown,
  FileCode2,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

import { Button, Menu, MenuItem } from "@veriworkly/ui";

import type { ResumeData } from "@/types/resume";

import {
  exportResumeAsPdf,
  exportResumeAsHtml,
  exportResumeAsJson,
  exportResumeAsDocx,
  exportResumeAsText,
  exportResumeAsMarkdown,
} from "@/features/resume/services/resume-service";

interface DownloadActionsProps {
  resume: ResumeData;
  sharePreviewId: string;
}

export const DownloadActions = ({ resume, sharePreviewId }: DownloadActionsProps) => {
  const [activeDownload, setActiveDownload] = useState<"pdf" | "docx" | null>(null);

  async function downloadPdf() {
    setActiveDownload("pdf");

    try {
      await exportResumeAsPdf(resume);
      toast.success("PDF downloaded successfully");
    } catch {
      toast.error("Could not generate PDF. Try again.");
    } finally {
      setActiveDownload(null);
    }
  }

  async function downloadDocx() {
    setActiveDownload("docx");

    try {
      await exportResumeAsDocx(resume);
      toast.success("DOCX downloaded successfully");
    } catch {
      toast.error("Could not generate DOCX. Try again.");
    } finally {
      setActiveDownload(null);
    }
  }

  function downloadMarkdown() {
    exportResumeAsMarkdown(resume);
    toast.success("Markdown downloaded successfully");
  }

  function downloadHtml() {
    exportResumeAsHtml(resume, sharePreviewId);
    toast.success("HTML downloaded successfully");
  }

  function downloadText() {
    exportResumeAsText(resume);
    toast.success("Plain text downloaded successfully");
  }

  function downloadJson() {
    exportResumeAsJson(resume);
    toast.success("JSON downloaded successfully");
  }

  return (
    <Menu
      align="right"
      panelClassName="min-w-56"
      trigger={({ menuId, open, toggle }) => (
        <Button
          aria-controls={open ? menuId : undefined}
          aria-expanded={open}
          aria-haspopup="menu"
          className="h-10 gap-2 rounded-full px-5 text-[12px] font-bold tracking-wide"
          disabled={Boolean(activeDownload)}
          onClick={toggle}
          size="sm"
          variant="secondary"
        >
          <Download className="h-4 w-4" />
          {activeDownload ? "Generating..." : "Download"}
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
    >
      {({ close }) => (
        <>
          <MenuItem
            disabled={Boolean(activeDownload)}
            onClick={async () => {
              close();
              await downloadPdf();
            }}
          >
            <FileDown className="h-4 w-4" />
            {activeDownload === "pdf" ? "Generating PDF..." : "PDF"}
          </MenuItem>

          <MenuItem
            disabled={Boolean(activeDownload)}
            onClick={async () => {
              close();
              await downloadDocx();
            }}
          >
            <Files className="h-4 w-4" />
            {activeDownload === "docx" ? "Generating DOCX..." : "DOCX"}
          </MenuItem>

          <MenuItem
            disabled={Boolean(activeDownload)}
            onClick={() => {
              close();
              downloadMarkdown();
            }}
          >
            <FileCode2 className="h-4 w-4" />
            Markdown
          </MenuItem>

          <MenuItem
            disabled={Boolean(activeDownload)}
            onClick={() => {
              close();
              downloadHtml();
            }}
          >
            <Code2 className="h-4 w-4" />
            HTML
          </MenuItem>

          <MenuItem
            disabled={Boolean(activeDownload)}
            onClick={() => {
              close();
              downloadText();
            }}
          >
            <FileText className="h-4 w-4" />
            Plain Text
          </MenuItem>

          <MenuItem
            disabled={Boolean(activeDownload)}
            onClick={() => {
              close();
              downloadJson();
            }}
          >
            <FileJson className="h-4 w-4" />
            JSON
          </MenuItem>
        </>
      )}
    </Menu>
  );
};
