"use client";

import { createElement, useEffect, useState } from "react";

import type { ResumeData } from "@/types/resume";

import { loadTemplateComponentById } from "@/templates";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";
import { CoverLetterPreview } from "@/templates/cover-letter/web";
import { useTemplateComponent } from "@/templates/shared/use-template-component";
import { ResumePagedPreview } from "@/features/resume/editor/ResumePagedPreview";

import { PARITY_FIXTURES, type ParityFixtureId } from "@/tests/parity/fixtures";

type ParityType = "resume" | "cover-letter";

/**
 * Renders exactly what the editor renders, with nothing else on the page, so a
 * headless browser can read `getBoundingClientRect()` off the same nodes the
 * react-pdf layout tree exposes.
 *
 * `mode=raw` renders the unpaginated document, which isolates box geometry from
 * the pagination algorithm. `mode=paged` renders through `ResumePagedPreview`,
 * which is what the user actually sees.
 */
export function ParityClient({
  fixture,
  mode,
  templateId,
  type,
}: {
  fixture: ParityFixtureId;
  mode: "raw" | "paged";
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
      const resume: ResumeData = { ...PARITY_FIXTURES[fixture].resume(), templateId };
      const element = createElement(ResumeTemplate, { resume });

      body = mode === "paged" ? <ResumePagedPreview>{element}</ResumePagedPreview> : element;
    }
  } else {
    body = (
      <CoverLetterPreview
        content={PARITY_FIXTURES[fixture].coverLetter()}
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
