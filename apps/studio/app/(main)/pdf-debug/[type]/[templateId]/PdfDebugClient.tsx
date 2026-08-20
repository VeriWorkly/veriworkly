"use client";

import dynamic from "next/dynamic";
import { createElement, useEffect, useMemo, useState } from "react";

import type { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";

const PDFViewer = dynamic(() => import("@react-pdf/renderer").then((mod) => mod.PDFViewer), {
  ssr: false,
});

import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { registerPdfFont, registerPdfFontById } from "@/templates/pdf/fonts";

import { createCoverLetterPdfElement } from "@/templates/cover-letter/pdf";
import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";

import { readResumeById } from "@/features/resume/services/resume-service";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { loadTemplatePdfComponentById } from "@/templates/resume/pdf";

import { loadDocumentById } from "@/features/documents/services/document-workspace-service";

type DebugType = "resume" | "cover-letter";

interface PdfDebugClientProps {
  documentId?: string;
  templateId: string;
  type: DebugType;
}

function createDebugResume(templateId: string): ResumeData {
  return {
    ...structuredClone(defaultResume),
    id: "pdf-debug-resume",
    templateId,
    updatedAt: new Date().toISOString(),
  };
}

function createDebugCoverLetter(templateId: string) {
  const doc = createDefaultCoverLetter("pdf-debug-cover-letter");

  return {
    ...doc,
    templateId,
    updatedAt: new Date().toISOString(),
  };
}

export function PdfDebugClient({ documentId, templateId, type }: PdfDebugClientProps) {
  const [documentElement, setDocumentElement] = useState<ReactElement<DocumentProps> | null>(null);

  const resume = useMemo(() => {
    if (type !== "resume") return null;

    // `readResumeById`, not `loadResumeById`: this runs during render, and opening a debug
    // view must not repoint the workspace's active document.
    const saved = documentId ? readResumeById(documentId) : null;
    return { ...(saved ?? createDebugResume(templateId)), templateId };
  }, [documentId, templateId, type]);

  const coverLetter = useMemo(() => {
    if (type !== "cover-letter") return null;

    const saved = documentId ? loadDocumentById("COVER_LETTER", documentId) : null;
    return { ...(saved ?? createDebugCoverLetter(templateId)), templateId };
  }, [documentId, templateId, type]);

  // PDF templates are fetched on demand, so the element is built in an effect. Fonts are
  // registered here too, immediately before the element is created — react-pdf reads its
  // global font registry at render time, so registering in a separate effect could let a
  // first render happen against the fallback font.
  useEffect(() => {
    let cancelled = false;

    const build = async () => {
      if (resume) {
        registerPdfFont(resume);
        const TemplatePdf = await loadTemplatePdfComponentById(templateId);

        if (!cancelled) {
          setDocumentElement(
            createElement(TemplatePdf, { resume }) as unknown as ReactElement<DocumentProps>,
          );
        }
        return;
      }

      if (coverLetter) {
        const content = coverLetter.content as CoverLetterContent;
        registerPdfFontById(content.appearance?.fontFamily);

        const element = await createCoverLetterPdfElement({ content, templateId });

        if (!cancelled) setDocumentElement(element);
        return;
      }

      if (!cancelled) setDocumentElement(null);
    };

    void build();

    return () => {
      cancelled = true;
    };
  }, [coverLetter, resume, templateId]);

  const title =
    resume?.basics.fullName ??
    coverLetter?.title ??
    (type === "resume" ? "Resume" : "Cover Letter");

  if (!resume && !coverLetter) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-foreground text-base font-semibold">No PDF document found</h1>
          <p className="text-muted mt-2 text-sm">
            Check type, template id, and optional document id.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background flex min-h-screen flex-col">
      <div className="border-border bg-card flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="text-muted text-[11px] font-semibold tracking-[0.22em] uppercase">
            PDF Debug
          </p>

          <h1 className="text-foreground text-sm font-semibold">{title}</h1>
        </div>

        <div className="text-muted flex flex-wrap gap-3 text-xs">
          <span>type: {type}</span>
          <span>template: {templateId}</span>
          {documentId ? <span>id: {documentId}</span> : <span>sample data</span>}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {documentElement ? (
          <PDFViewer className="h-[calc(100vh-65px)] w-full" showToolbar>
            {documentElement}
          </PDFViewer>
        ) : (
          <p className="text-muted p-6 text-sm">Loading template…</p>
        )}
      </div>
    </main>
  );
}
