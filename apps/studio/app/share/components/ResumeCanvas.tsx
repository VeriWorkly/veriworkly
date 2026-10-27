"use client";

import { useLayoutEffect, useRef, useState } from "react";

import type { ResumeData } from "@/types/resume";
import type { TemplateComponent } from "@/types/template";

import { Card, cn } from "@veriworkly/ui";

interface ResumeCanvasProps {
  sharePreviewId: string;
  templateComponent: TemplateComponent;
  resume: ResumeData;
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
const ResumeCanvas = ({
  sharePreviewId,
  templateComponent: Template,
  resume,
}: ResumeCanvasProps) => {
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

  return (
    <div
      ref={outerRef}
      className="mx-auto w-full max-w-310 px-3 pt-4 pb-12 md:px-6 md:pt-6 md:pb-20"
    >
      <Card className="border-border relative mx-auto w-fit max-w-full overflow-hidden rounded-3xl bg-white p-0 shadow-2xl ring-1 ring-black/5 print:overflow-visible">
        <div ref={frameRef} className="bg-white/50 p-2 backdrop-blur md:p-6">
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
            >
              <Template resume={resume} className="" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export { ResumeCanvas };
