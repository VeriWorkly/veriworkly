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

function getSectionItemsContainer(section: HTMLElement): HTMLElement | null {
  let itemsContainer =
    section.tagName.toLowerCase() === "section" && section.children.length >= 2
      ? (section.children[1] as HTMLElement)
      : null;

  while (
    itemsContainer &&
    itemsContainer.children.length === 1 &&
    itemsContainer.children[0] instanceof HTMLElement &&
    itemsContainer.children[0].tagName.toLowerCase() === "div"
  ) {
    itemsContainer = itemsContainer.children[0] as HTMLElement;
  }

  return itemsContainer;
}

function createSectionFragment(
  section: HTMLElement,
  items: HTMLElement[],
  includeHeader: boolean,
): HTMLElement {
  const sectionClone = section.cloneNode(true) as HTMLElement;
  const clonedItemsContainer = getSectionItemsContainer(sectionClone);

  if (clonedItemsContainer) {
    clonedItemsContainer.innerHTML = "";

    items.forEach((item) => {
      clonedItemsContainer.appendChild(item.cloneNode(true));
    });
  }

  if (!includeHeader && sectionClone.children.length > 0) {
    sectionClone.removeChild(sectionClone.children[0]);
  }

  return sectionClone;
}

export function ResumePagedPreview({ children }: { children: ReactNode }) {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<ResumePreviewPage[]>([]);
  const [pageStyle, setPageStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const measureRoot = measureRef.current;
      const container = measureRoot?.querySelector("#resume-container") as HTMLElement | null;

      if (!measureRoot || !container) {
        setPages([]);
        return;
      }

      const computed = window.getComputedStyle(container);
      const nextPageStyle = {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight,
        padding: computed.padding,
      } satisfies CSSProperties;
      const probe = document.createElement("article");

      probe.className = "resume-page-preview mx-auto overflow-hidden bg-white";
      Object.assign(probe.style, {
        ...nextPageStyle,
        boxShadow: "none",
        height: `${RESUME_PAGE_HEIGHT_PX}px`,
        minHeight: `${RESUME_PAGE_HEIGHT_PX}px`,
        position: "absolute",
        width: `${RESUME_PAGE_WIDTH_PX}px`,
      });

      measureRoot.appendChild(probe);

      const fitsPage = (elements: HTMLElement[]) => {
        probe.innerHTML = elements.map((element) => element.outerHTML).join("");

        return probe.scrollHeight <= RESUME_PAGE_HEIGHT_PX + 1;
      };

      const nextPages: ResumePreviewPage[] = [];
      let current: HTMLElement[] = [];

      const commitCurrentPage = () => {
        if (current.length === 0) {
          return;
        }

        nextPages.push({
          content: current.map((element) => element.outerHTML).join(""),
        });
        current = [];
      };

      const appendBlock = (block: HTMLElement) => {
        const candidate = [...current, block];

        if (candidate.length === 1 || fitsPage(candidate)) {
          current = candidate;
          return;
        }

        commitCurrentPage();
        current = [block];
      };

      Array.from(container.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) {
          return;
        }

        const isSection = child.tagName.toLowerCase() === "section";
        const itemsContainer = getSectionItemsContainer(child);
        const items = itemsContainer
          ? (Array.from(itemsContainer.children).filter(
              (item): item is HTMLElement => item instanceof HTMLElement,
            ) as HTMLElement[])
          : [];

        if (!isSection || items.length <= 1) {
          appendBlock(child);
          return;
        }

        let itemIndex = 0;
        let includeHeader = true;

        while (itemIndex < items.length) {
          let acceptedCount = 0;

          for (let count = 1; itemIndex + count <= items.length; count += 1) {
            const fragment = createSectionFragment(
              child,
              items.slice(itemIndex, itemIndex + count),
              includeHeader,
            );
            const candidate = [...current, fragment];

            if (fitsPage(candidate) || (current.length === 0 && count === 1)) {
              acceptedCount = count;
            } else {
              break;
            }
          }

          if (acceptedCount === 0) {
            commitCurrentPage();
            continue;
          }

          const acceptedFragment = createSectionFragment(
            child,
            items.slice(itemIndex, itemIndex + acceptedCount),
            includeHeader,
          );
          current = [...current, acceptedFragment];
          itemIndex += acceptedCount;
          includeHeader = false;
        }
      });

      if (current.length > 0) {
        commitCurrentPage();
      }

      probe.remove();

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
