"use client";

import type { ReactNode } from "react";
import type { BaseDocument } from "@/features/documents/core/types";

import Link from "next/link";
import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { FileSearch } from "lucide-react";

import { Card } from "@veriworkly/ui";

import { loadTemplateComponentById } from "@/templates";
import { useTemplateComponent } from "@/templates/shared/use-template-component";
import { DOCUMENT_PAGE_WIDTH_PX } from "@/templates/shared/page-geometry";

import type { ResumeData } from "@/types/resume";
import { readResumeById, toResumeDocument } from "@/features/resume/services/resume-service";
import { ResumePagedPreview } from "@/features/resume/editor/ResumePagedPreview";
import { loadDocumentById } from "@/features/documents/services/document-workspace-service";
import { hydrateCloudDocumentByIdToLocalStorage } from "@/features/documents/services/document-sync";
import type { DocumentType } from "@/features/documents/core/document-types";
import type { CoverLetterContent } from "@/features/cover-letter/types";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { getDocumentDefinition } from "@/features/documents/core/registry";
import { DocumentLoadStateCard } from "@/features/documents/editor/DocumentStateCard";
import {
  cloudLoadFailureState,
  useDocumentTabTitle,
  type EditorLoadState,
} from "@/features/documents/editor/editor-load-status";
import { CoverLetterPreview } from "@/templates/cover-letter/web";

interface PreviewClientProps {
  documentId: string;
  type: DocumentType;
}

/** The editor's load states, plus the document once it is ready. Keyed by the id it is for. */
type PreviewLoad = { id: string } & (
  Exclude<EditorLoadState, { status: "ready" }> | { status: "ready"; doc: BaseDocument }
);

/** Reads the stored copy without writing anything: opening a preview must not touch storage. */
function readStored(type: DocumentType, id: string): BaseDocument | null {
  if (type !== "RESUME") return loadDocumentById(type, id);

  const resume = readResumeById(id);
  return resume ? toResumeDocument(resume) : null;
}

/**
 * Scales a fixed-width page down to the width there is (never up) and reserves the scaled
 * height, so a phone sees the whole page and scrolls through it instead of a clipped corner.
 */
function FitToWidth({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, offset: 0, height: 0 });

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;

    if (!outer || !inner) return;

    // Both: the page grows once its template has loaded and paginated.
    const observer = new ResizeObserver(() => {
      const scale = Math.min(1, outer.clientWidth / DOCUMENT_PAGE_WIDTH_PX);

      setFit({
        scale,
        offset: Math.max(0, (outer.clientWidth - DOCUMENT_PAGE_WIDTH_PX * scale) / 2),
        height: inner.offsetHeight * scale,
      });
    });

    observer.observe(outer);
    observer.observe(inner);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="w-full overflow-hidden"
      ref={outerRef}
      style={{ height: fit.height || undefined }}
    >
      <div
        ref={innerRef}
        style={{
          width: DOCUMENT_PAGE_WIDTH_PX,
          marginLeft: fit.offset,
          transform: `scale(${fit.scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function PreviewClient({ documentId, type }: PreviewClientProps) {
  const [loaded, setLoaded] = useState<PreviewLoad>({ id: documentId, status: "loading" });
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Local first, then the cloud, exactly as the editor resolves its URL: a document that
  // exists only in the cloud previews instead of reading "not found".
  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const stored = readStored(type, documentId);

      if (stored) {
        setLoaded({ id: documentId, status: "ready", doc: stored });
        return;
      }

      const cloudResult = await hydrateCloudDocumentByIdToLocalStorage(type, documentId);

      if (cancelled) return;

      const fetched = cloudResult.ok ? readStored(type, documentId) : null;

      setLoaded(
        fetched
          ? { id: documentId, status: "ready", doc: fetched }
          : { id: documentId, ...cloudLoadFailureState(cloudResult) },
      );
    };

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [type, documentId, loadAttempt]);

  const retryLoad = useCallback(() => {
    setLoaded({ id: documentId, status: "loading" });
    setLoadAttempt((attempt) => attempt + 1);
  }, [documentId]);

  // A new URL id is loading on the very render it appears, never showing the previous one.
  const load: PreviewLoad =
    loaded.id === documentId ? loaded : { id: documentId, status: "loading" };
  const doc = load.status === "ready" ? load.doc : null;
  const resume = type === "RESUME" && doc ? (doc.content as ResumeData) : null;

  const TemplateComponent = useTemplateComponent(
    loadTemplateComponentById,
    resume?.templateId ?? null,
  );

  const title = resume
    ? resume.title || resume.basics.fullName || "Untitled resume"
    : doc?.title || "Untitled document";

  useDocumentTabTitle(`${title} preview`, doc !== null);

  const editorPath = getDocumentEditorPath(type, documentId);
  const debugType = type === "COVER_LETTER" ? "cover-letter" : type.toLowerCase();
  const canDebugPdf = type === "RESUME" || type === "COVER_LETTER";

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="border-border bg-card/95 sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm backdrop-blur">
        <div className="min-w-0">
          <p className="text-muted text-[11px] font-semibold tracking-[0.22em] uppercase">
            Document Preview
          </p>
          <p className="text-foreground truncate text-sm font-medium">
            {doc ? title : "Untitled document"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {process.env.NODE_ENV === "development" && canDebugPdf && doc ? (
            <Link
              href={`/pdf-debug/${debugType}/${doc.templateId}?id=${documentId}`}
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
            Documents
          </Link>
        </div>
      </div>

      {load.status !== "ready" ? (
        <DocumentLoadStateCard
          noun={getDocumentDefinition(type).label.toLowerCase()}
          load={load}
          isReady={false}
          onRetry={retryLoad}
          notFoundMessage="This document may have been deleted. Return to your documents to pick another one."
        />
      ) : (
        <Card className="p-2 sm:p-4">
          <div className="bg-background rounded-3xl p-2 sm:p-4 md:p-6">
            {resume && TemplateComponent ? (
              <FitToWidth>
                <ResumePagedPreview>
                  {createElement(TemplateComponent, { resume })}
                </ResumePagedPreview>
              </FitToWidth>
            ) : type === "COVER_LETTER" && doc ? (
              <FitToWidth>
                <CoverLetterPreview
                  content={doc.content as CoverLetterContent}
                  templateId={doc.templateId}
                />
              </FitToWidth>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
}
