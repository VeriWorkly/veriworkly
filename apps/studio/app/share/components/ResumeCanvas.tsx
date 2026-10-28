"use client";

import type { ReactNode } from "react";

import { useLayoutEffect, useRef, useState } from "react";

import type { ResumeData } from "@/types/resume";

import { Card, cn } from "@veriworkly/ui";

import { ResumePagedPreview } from "@/features/resume/editor/ResumePagedPreview";
import {
  EXPORT_EXCLUDE_ATTRIBUTE,
  EXPORT_ROOT_ATTRIBUTE,
} from "@/features/documents/export/export-dom-markers";
import { documentPrintCss } from "@/templates/shared/print-styles";

interface ResumeCanvasProps {
  sharePreviewId: string;
  /** The resume rendered by its template: drawn on the server for a public link. */
  template: ReactNode;
  resume: ResumeData;
}

/** Marks what the share page draws around the resume, which a printout leaves out. */
export const SHARE_CHROME_ATTRIBUTE = "data-share-chrome";

/** Marks the boxes between the page and the resume sheets: a printout drops their spacing. */
const SHARE_FRAME_ATTRIBUTE = "data-share-frame";

/**
 * How the share page meets paper: one sheet per preview page, on the resume's own paper size,
 * as the HTML export prints (`features/documents/export/export-html.ts`). Without it the
 * browser printed the screen layout — the 24px gap between pages, the card's padding and
 * border — and every sheet after the first started part-way down a page.
 */
export function sharePrintCss(paperSize: unknown) {
  const pages = `[${EXPORT_ROOT_ATTRIBUTE}]`;
  const frame = `[${SHARE_FRAME_ATTRIBUTE}]`;

  return documentPrintCss({
    paperSize,
    sheet: `${pages} > *`,
    sheetPrint: "break-after:page",
    print: [
      `${pages}{row-gap:0!important}`,
      `${pages} > :last-child{break-after:auto}`,
      `[${SHARE_CHROME_ATTRIBUTE}],[${EXPORT_EXCLUDE_ATTRIBUTE}]{display:none!important}`,
      `main:has(${frame}){min-height:0!important;background:none!important}`,
      `${frame}{padding:0!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:none!important;max-width:none!important;backdrop-filter:none!important}`,
    ].join(""),
  });
}

/** The page's scale to fit `available` pixels: never enlarged, only shrunk on narrow screens. */
export function fitToWidthScale(available: number, pageWidth: number) {
  if (available <= 0 || pageWidth <= 0) return 1;

  return Math.min(1, available / pageWidth);
}

/**
 * The resume is laid out at its printed width and scaled down to the screen, so a recruiter on
 * a phone sees the whole page instead of a sideways scroller. A transform, not a narrower box:
 * the HTML download reads the page's own width from `sharePreviewId`.
 */
const ResumeCanvas = ({ sharePreviewId, template, resume }: ResumeCanvasProps) => {
  // The full-width outer box, whose width never depends on the scaled page inside it.
  const outerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const frame = frameRef.current;
    const page = pageRef.current;

    if (!outer || !frame || !page) return;

    const paddingX = (element: Element) => {
      const style = getComputedStyle(element);
      return parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    };

    const measure = () => {
      // Less the card's 1px border on each side.
      const available = outer.clientWidth - paddingX(outer) - paddingX(frame) - 2;
      const scale = fitToWidthScale(available, page.offsetWidth);

      setFit({ scale, width: page.offsetWidth * scale, height: page.offsetHeight * scale });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(page);

    return () => observer.disconnect();
  }, []);

  const frame = { [SHARE_FRAME_ATTRIBUTE]: "" };

  return (
    <div
      ref={outerRef}
      className="mx-auto w-full max-w-310 px-3 pt-4 pb-12 md:px-6 md:pt-6 md:pb-20"
      {...frame}
    >
      <style dangerouslySetInnerHTML={{ __html: sharePrintCss(resume.customization.paperSize) }} />

      <Card
        className="border-border relative mx-auto w-fit max-w-full overflow-hidden rounded-3xl bg-white p-0 shadow-2xl ring-1 ring-black/5 print:overflow-visible"
        {...frame}
      >
        <div ref={frameRef} className="bg-white/50 p-2 backdrop-blur md:p-6" {...frame}>
          {/* Until the scale is measured (before hydration, or with no script) the page keeps
              its printed width and scrolls sideways rather than being cut off. A print drops the
              scale and the fitted box, so it prints the real page. */}
          <div
            className={cn(
              "mx-auto print:h-auto! print:w-auto! print:overflow-visible",
              fit ? "overflow-hidden" : "overflow-x-auto",
            )}
            style={fit ? { width: fit.width, height: fit.height } : undefined}
          >
            <div
              ref={pageRef}
              id={sharePreviewId}
              className="border-border/50 w-max origin-top-left rounded-4xl border text-black shadow-sm ring-1 ring-black/5 dark:ring-white/10 print:transform-none!"
              style={fit && fit.scale < 1 ? { transform: `scale(${fit.scale})` } : undefined}
              {...frame}
            >
              {/* Cut into pages exactly as the editor and the PDF cut it: drawn whole, a
                  one-page resume read as one long sheet and a longer one had no breaks. Until
                  the pages are measured, and if measuring fails, the resume shows whole. */}
              <ResumePagedPreview paperSize={resume.customization.paperSize} fallbackOnMeasureError>
                {template}
              </ResumePagedPreview>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export { ResumeCanvas };
