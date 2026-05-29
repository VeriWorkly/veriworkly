"use client";

import type { CSSProperties, ReactNode } from "react";

import { useLayoutEffect, useRef, useState } from "react";

import {
  RESUME_PAGE_HEIGHT_PX,
  RESUME_PAGE_WIDTH_PX,
} from "@/features/resume/constants/resume-layout";

interface ResumePreviewPage {
  content: string;
}

export function ResumePagedPreview({ children }: { children: ReactNode }) {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<ResumePreviewPage[]>([]);
  const [pageStyle, setPageStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const container = measureRef.current?.querySelector(
        "#resume-container",
      ) as HTMLElement | null;

      if (!container) {
        setPages([]);
        return;
      }

      const computed = window.getComputedStyle(container);
      const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
      const usableHeight = RESUME_PAGE_HEIGHT_PX - paddingTop - paddingBottom;
      const nextPages: ResumePreviewPage[] = [];
      let current: string[] = [];
      let usedHeight = 0;

      Array.from(container.children).forEach((child) => {
        const element = child as HTMLElement;
        const childStyle = window.getComputedStyle(element);
        const blockHeight =
          element.getBoundingClientRect().height +
          (Number.parseFloat(childStyle.marginTop) || 0) +
          (Number.parseFloat(childStyle.marginBottom) || 0);

        if (current.length > 0 && usedHeight + blockHeight > usableHeight) {
          nextPages.push({ content: current.join("") });
          current = [];
          usedHeight = 0;
        }

        current.push(element.outerHTML);
        usedHeight += blockHeight;
      });

      if (current.length > 0) {
        nextPages.push({ content: current.join("") });
      }

      const nextPageStyle = {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight,
        padding: computed.padding,
      } satisfies CSSProperties;
      const resolvedPages = nextPages.length > 0 ? nextPages : [{ content: container.innerHTML }];
      const pageKey = resolvedPages.map((page) => page.content).join("");
      const styleKey = JSON.stringify(nextPageStyle);

      setPageStyle((currentStyle) =>
        JSON.stringify(currentStyle) === styleKey ? currentStyle : nextPageStyle,
      );
      setPages((currentPages) =>
        currentPages.map((page) => page.content).join("") === pageKey
          ? currentPages
          : resolvedPages,
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [children]);

  return (
    <div className="relative">
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none absolute opacity-0"
        style={{ left: -10000, top: 0, width: RESUME_PAGE_WIDTH_PX }}
      >
        {children}
      </div>

      <div className="grid gap-6">
        {pages.map((page, index) => (
          <article
            className="resume-page-preview mx-auto overflow-hidden bg-white"
            key={index}
            style={{
              ...pageStyle,
              width: RESUME_PAGE_WIDTH_PX,
              minHeight: RESUME_PAGE_HEIGHT_PX,
              height: RESUME_PAGE_HEIGHT_PX,
            }}
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        ))}
      </div>
    </div>
  );
}
