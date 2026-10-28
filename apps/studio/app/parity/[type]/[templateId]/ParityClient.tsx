"use client";

import { createElement, useEffect, useState } from "react";

import type { ResumeData } from "@/types/resume";
import type { PaperSize } from "@/templates/shared/page-geometry";

import { loadTemplateComponentById } from "@/templates";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";
import { CoverLetterPreview } from "@/templates/cover-letter/web";
import { useTemplateComponent } from "@/templates/shared/use-template-component";
import { ResumePagedPreview } from "@/features/resume/editor/ResumePagedPreview";
import { DownloadActions } from "@/app/share/components/DownloadActions";
import { ResumeCanvas } from "@/app/share/components/ResumeCanvas";

import { PARITY_FIXTURES, type ParityFixtureId } from "@/tests/parity/fixtures";

type ParityType = "resume" | "cover-letter";

/**
 * Renders exactly what the editor renders, with nothing else on the page, so a
 * headless browser can read `getBoundingClientRect()` off the same nodes the
 * react-pdf layout tree exposes.
 *
 * `mode=raw` renders the unpaginated document, which isolates box geometry from
 * the pagination algorithm. `mode=paged` renders through `ResumePagedPreview`,
 * which is what the user actually sees, with a button that runs the editor's HTML export on
 * it. `mode=share` renders the public share page's canvas and downloads. `paper` sets the
 * document's paper size.
 */
export function ParityClient({
  fixture,
  mode,
  paperSize,
  templateId,
  type,
}: {
  fixture: ParityFixtureId;
  mode: "raw" | "paged" | "share";
  paperSize: PaperSize;
  templateId: string;
  type: ParityType;
}) {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // The harness must never measure against fallback metrics.
    void document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Template renderers are fetched on demand, so readiness has to include them —
  // otherwise the harness can latch `data-parity-ready` while the page is still empty
  // and measure nothing. Only this type's registry loads (`null` skips the other); the
  // registry memoizes, so resolving the cover letter component here costs no extra fetch
  // beyond what CoverLetterPreview does.
  const ResumeTemplate = useTemplateComponent(
    loadTemplateComponentById,
    type === "resume" ? templateId : null,
  );
  const coverLetterTemplate = useTemplateComponent(
    coverLetterTemplateRegistry.loadWeb,
    type === "cover-letter" ? templateId : null,
  );

  const templateReady = type === "resume" ? Boolean(ResumeTemplate) : Boolean(coverLetterTemplate);
  const ready = fontsReady && templateReady;

  let body: React.ReactNode = null;

  if (type === "resume") {
    if (ResumeTemplate) {
      const fixtureResume = PARITY_FIXTURES[fixture].resume();
      const resume: ResumeData = {
        ...fixtureResume,
        templateId,
        customization: { ...fixtureResume.customization, paperSize },
      };
      const element = createElement(ResumeTemplate, { resume });

      if (mode === "share") {
        body = (
          <>
            <DownloadActions resume={resume} sharePreviewId="share-preview" />
            <ResumeCanvas resume={resume} sharePreviewId="share-preview" template={element} />
          </>
        );
      } else if (mode === "paged") {
        // The editor's "Export → HTML" captures the element its preview stage carries the id
        // of; this button runs that same export against this preview.
        body = (
          <>
            <button
              data-parity-export-html=""
              onClick={() => {
                void import("@/features/documents/export/export-html").then(
                  ({ exportResumeAsHtml }) => exportResumeAsHtml(resume, "parity-preview"),
                );
              }}
              type="button"
            >
              Export HTML
            </button>
            <div id="parity-preview">
              <ResumePagedPreview paperSize={paperSize}>{element}</ResumePagedPreview>
            </div>
          </>
        );
      } else {
        body = element;
      }
    }
  } else {
    const content = PARITY_FIXTURES[fixture].coverLetter();

    body = (
      <CoverLetterPreview
        content={{ ...content, appearance: { ...content.appearance, paperSize } }}
        templateId={templateId}
      />
    );
  }

  return (
    <main data-parity-mode={mode} data-parity-ready={ready ? "1" : "0"} style={{ padding: 0 }}>
      {body}
    </main>
  );
}
