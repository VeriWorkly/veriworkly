"use client";

import { toast } from "sonner";
import { Files, Code2, FileText, Download, FileDown, FileCode2, ChevronDown } from "lucide-react";
import { useState } from "react";

import { Button, Menu, MenuItem } from "@veriworkly/ui";

import type { ResumeData } from "@/types/resume";

interface DownloadActionsProps {
  resume: ResumeData;
  sharePreviewId: string;
}

/**
 * The formats a recruiter reads. The editable JSON source is the owner's, not the reader's.
 *
 * Exporters are `import()`ed at click time, not at module scope. This is a public
 * share page — the PDF/DOCX engines (~2.2MB) must not be in its first paint.
 */
export const DownloadActions = ({ resume, sharePreviewId }: DownloadActionsProps) => {
  const [activeDownload, setActiveDownload] = useState<"pdf" | "docx" | null>(null);

  async function downloadPdf() {
    setActiveDownload("pdf");

    try {
      const { exportResumeAsPdf } = await import("@/features/documents/export/export-pdf");
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
      const { exportResumeAsDocx } = await import("@/features/documents/export/export-docx");
      await exportResumeAsDocx(resume);
      toast.success("DOCX downloaded successfully");
    } catch {
      toast.error("Could not generate DOCX. Try again.");
    } finally {
      setActiveDownload(null);
    }
  }

  /**
   * A page left open across a deploy can no longer fetch its old exporter chunks, so the
   * import itself can fail; that and an exporter error both reach the reader as a toast.
   */
  async function runExport(label: string, run: () => Promise<void>) {
    try {
      await run();
      toast.success(`${label} downloaded successfully`);
    } catch (error) {
      console.error(`${label} export failed`, error);
      toast.error(`Could not download ${label}. Reload the page and try again.`);
    }
  }

  const downloadMarkdown = () =>
    runExport("Markdown", async () => {
      const { exportResumeAsMarkdown } =
        await import("@/features/documents/export/export-markdown");
      exportResumeAsMarkdown(resume);
    });

  const downloadHtml = () =>
    runExport("HTML", async () => {
      const { exportResumeAsHtml } = await import("@/features/documents/export/export-html");
      await exportResumeAsHtml(resume, sharePreviewId);
    });

  const downloadText = () =>
    runExport("Plain text", async () => {
      const { exportResumeAsText } = await import("@/features/documents/export/export-text");
      exportResumeAsText(resume);
    });

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
            onClick={async () => {
              close();
              await downloadMarkdown();
            }}
          >
            <FileCode2 className="h-4 w-4" />
            Markdown
          </MenuItem>

          <MenuItem
            disabled={Boolean(activeDownload)}
            onClick={async () => {
              close();
              await downloadHtml();
            }}
          >
            <Code2 className="h-4 w-4" />
            HTML
          </MenuItem>

          <MenuItem
            disabled={Boolean(activeDownload)}
            onClick={async () => {
              close();
              await downloadText();
            }}
          >
            <FileText className="h-4 w-4" />
            Plain Text
          </MenuItem>
        </>
      )}
    </Menu>
  );
};
