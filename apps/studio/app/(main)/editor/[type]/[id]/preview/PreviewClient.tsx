"use client";

import type { TemplateComponent } from "@/types/template";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileSearch } from "lucide-react";

import { Card } from "@veriworkly/ui";

import { loadTemplateComponentById } from "@/templates";

import { useResume } from "@/features/resume/hooks/use-resume";
import { loadResumeById } from "@/features/resume/services/resume-service";
import { loadDocumentById } from "@/features/documents/services/document-workspace-service";
import type { DocumentType } from "@/features/documents/core/document-types";
import type { CoverLetterContent } from "@/features/cover-letter/types";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { CoverLetterPreview } from "@/templates/cover-letter/web";

interface PreviewClientProps {
  documentId: string;
  type: DocumentType;
}

export function PreviewClient({ documentId, type }: PreviewClientProps) {
  const { resume, setResume } = useResume();
  const [templateComponent, setTemplateComponent] = useState<TemplateComponent | null>(null);

  const routeResume = useMemo(
    () => (type === "RESUME" ? loadResumeById(documentId) : null),
    [documentId, type],
  );
  const routeDocument = useMemo(
    () => (type === "RESUME" ? null : loadDocumentById(type, documentId)),
    [documentId, type],
  );

  useEffect(() => {
    if (!routeResume) return;
    setResume(routeResume);
  }, [routeResume, setResume]);

  useEffect(() => {
    if (type !== "RESUME") return;
    let cancelled = false;
    const nextTemplate = loadTemplateComponentById(resume.templateId);

    queueMicrotask(() => {
      if (!cancelled) setTemplateComponent(() => nextTemplate);
    });

    return () => {
      cancelled = true;
    };
  }, [resume.templateId, type]);

  const TemplateComponent = templateComponent;
  const found = type === "RESUME" ? Boolean(routeResume) : Boolean(routeDocument);
  const title =
    type === "RESUME" ? resume.basics.fullName || "Untitled Resume" : routeDocument?.title;
  const editorPath = getDocumentEditorPath(type, documentId);
  const debugType = type === "COVER_LETTER" ? "cover-letter" : type.toLowerCase();
  const debugTemplateId = type === "RESUME" ? resume.templateId : routeDocument?.templateId;
  const canDebugPdf = type === "RESUME" || type === "COVER_LETTER";

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="border-border bg-card/95 sticky top-4 z-20 flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm backdrop-blur">
        <div>
          <p className="text-muted text-[11px] font-semibold tracking-[0.22em] uppercase">
            Document Preview
          </p>
          <p className="text-foreground text-sm font-medium">{title || "Untitled document"}</p>
        </div>

        <div className="flex items-center gap-2">
          {process.env.NODE_ENV === "development" && canDebugPdf && debugTemplateId ? (
            <Link
              href={`/pdf-debug/${debugType}/${debugTemplateId}?id=${documentId}`}
              target="_blank"
              rel="noreferrer"
              className="bg-card text-foreground ring-border hover:bg-background inline-flex h-9 items-center justify-center rounded-full px-3 text-sm font-medium ring-1 transition ring-inset"
            >
              <FileSearch className="mr-2 h-4 w-4" />
              PDF Debug
            </Link>
          ) : null}

          <Link
            href={editorPath}
            className="text-foreground hover:bg-card inline-flex h-9 items-center justify-center rounded-full bg-transparent px-3 text-sm font-medium transition"
          >
            Back to editor
          </Link>
          <Link
            href="/documents"
            className="bg-card text-foreground ring-border hover:bg-background inline-flex h-9 items-center justify-center rounded-full px-3 text-sm font-medium ring-1 transition ring-inset"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {!found ? (
        <Card className="space-y-3 text-center">
          <h1 className="text-foreground text-xl font-semibold">Document not found</h1>
          <p className="text-muted text-sm">
            This document may have been deleted. Return to dashboard to pick another one.
          </p>
          <div>
            <Link
              className="bg-card text-foreground ring-border hover:bg-background inline-flex h-9 items-center justify-center rounded-full px-3 text-sm font-medium ring-1 transition ring-inset"
              href="/documents"
            >
              Go to dashboard
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-4">
          <div className="bg-background rounded-3xl p-4 md:p-6">
            <div className="mx-auto w-full max-w-212.5">
              {type === "RESUME" && TemplateComponent ? (
                <TemplateComponent resume={resume} />
              ) : type === "COVER_LETTER" && routeDocument ? (
                <CoverLetterPreview
                  content={routeDocument.content as CoverLetterContent}
                  templateId={routeDocument.templateId}
                />
              ) : null}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
