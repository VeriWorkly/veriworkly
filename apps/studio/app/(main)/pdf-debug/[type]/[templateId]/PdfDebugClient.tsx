"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";

const PDFViewer = dynamic(() => import("@react-pdf/renderer").then((mod) => mod.PDFViewer), {
  ssr: false,
});

import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { registerPdfFont, registerPdfFontById } from "@/templates/pdf/fonts";

import { CoverLetterPdf } from "@/templates/cover-letter/pdf";
import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";

import { CompactAtsPdf } from "@/templates/resume/precision-ats/pdf";
import { loadResumeById } from "@/features/resume/services/resume-service";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { CleanProfessionalPdf } from "@/templates/resume/executive-clarity/pdf";

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

function ResumePdfDebugDocument({
  resume,
  templateId,
}: {
  resume: ResumeData;
  templateId: string;
}) {
  if (templateId === "precision-ats") {
    return <CompactAtsPdf resume={resume} />;
  }

  return <CleanProfessionalPdf resume={resume} />;
}

export function PdfDebugClient({ documentId, templateId, type }: PdfDebugClientProps) {
  const resume = useMemo(() => {
    if (type !== "resume") return null;

    const saved = documentId ? loadResumeById(documentId) : null;
    return { ...(saved ?? createDebugResume(templateId)), templateId };
  }, [documentId, templateId, type]);

  const coverLetter = useMemo(() => {
    if (type !== "cover-letter") return null;

    const saved = documentId ? loadDocumentById("COVER_LETTER", documentId) : null;
    return { ...(saved ?? createDebugCoverLetter(templateId)), templateId };
  }, [documentId, templateId, type]);

  useEffect(() => {
    if (resume) registerPdfFont(resume);
    if (coverLetter) {
      registerPdfFontById((coverLetter.content as CoverLetterContent).appearance?.fontFamily);
    }
  }, [coverLetter, resume]);

  const title =
    resume?.basics.fullName ??
    coverLetter?.title ??
    (type === "resume" ? "Resume" : "Cover Letter");

  if (coverLetter) {
    registerPdfFontById((coverLetter.content as CoverLetterContent).appearance?.fontFamily);
  }

  const documentElement = resume ? (
    <ResumePdfDebugDocument resume={resume} templateId={templateId} />
  ) : coverLetter ? (
    <CoverLetterPdf content={coverLetter.content as CoverLetterContent} templateId={templateId} />
  ) : null;

  if (!documentElement) {
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
        <PDFViewer className="h-[calc(100vh-65px)] w-full" showToolbar>
          {documentElement}
        </PDFViewer>
      </div>
    </main>
  );
}
