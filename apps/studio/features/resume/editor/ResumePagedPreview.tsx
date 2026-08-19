"use client";

import type { CSSProperties, ReactNode } from "react";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  RESUME_PAGE_HEIGHT_PX,
  RESUME_PAGE_WIDTH_PX,
} from "@/features/resume/constants/resume-layout";
import {
  EXPORT_EXCLUDE_ATTRIBUTE,
  EXPORT_ROOT_ATTRIBUTE,
} from "@/features/documents/export/export-dom-markers";
import { paginateIncremental, type IncrementalPageProbe } from "@/templates/shared/pagination";

interface ResumePreviewPage {
  content: string;
}

/**
 * One atomic unit of the paginated flow.
 *
 * `block` is an element that never splits (the header, a single-item section).
 * `item` is one row of a multi-item section, which is what lets a long Experience
 * list continue onto the next page under a repeated (header-less) section wrapper.
 */
type ResumeFlowUnit =
  | { kind: "block"; element: HTMLElement }
  | { kind: "item"; sectionIndex: number; section: HTMLElement; item: HTMLElement };

/** Re-measure at most this often while the user types. */
const MEASURE_DEBOUNCE_MS = 120;

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

/** An empty clone of `section`, optionally without its heading (continuation pages). */
function createEmptySectionShell(section: HTMLElement, includeHeader: boolean): HTMLElement {
  const shell = section.cloneNode(true) as HTMLElement;
  const itemsContainer = getSectionItemsContainer(shell);

  if (itemsContainer) itemsContainer.innerHTML = "";
  if (!includeHeader && shell.children.length > 0) shell.removeChild(shell.children[0]);

  return shell;
}

/** Flattens the rendered resume into units that can be placed one at a time. */
function buildFlowUnits(container: HTMLElement): ResumeFlowUnit[] {
  const units: ResumeFlowUnit[] = [];

  Array.from(container.children).forEach((child, childIndex) => {
    if (!(child instanceof HTMLElement)) return;

    const isSection = child.tagName.toLowerCase() === "section";
    const itemsContainer = getSectionItemsContainer(child);
    const items = itemsContainer
      ? Array.from(itemsContainer.children).filter(
          (item): item is HTMLElement => item instanceof HTMLElement,
        )
      : [];

    if (!isSection || items.length <= 1) {
      units.push({ kind: "block", element: child });
      return;
    }

    for (const item of items) {
      units.push({ kind: "item", sectionIndex: childIndex, section: child, item });
    }
  });

  return units;
}

/** Serializes one page's units back to HTML, regrouping items under their section. */
function renderUnitsToHtml(units: ResumeFlowUnit[], sectionsWithHeader: Set<number>): string {
  let html = "";
  let openSectionIndex: number | null = null;
  let openShell: HTMLElement | null = null;
  let openItems: HTMLElement | null = null;

  const closeSection = () => {
    if (openShell) html += openShell.outerHTML;
    openSectionIndex = null;
    openShell = null;
    openItems = null;
  };

  for (const unit of units) {
    if (unit.kind === "block") {
      closeSection();
      html += unit.element.outerHTML;
      continue;
    }

    if (openSectionIndex !== unit.sectionIndex) {
      closeSection();
      openSectionIndex = unit.sectionIndex;
      openShell = createEmptySectionShell(unit.section, sectionsWithHeader.has(unit.sectionIndex));
      openItems = getSectionItemsContainer(openShell);
    }

    if (openItems) openItems.appendChild(unit.item.cloneNode(true));
  }

  closeSection();

  return html;
}

/**
 * Append-only measuring probe over a real off-screen page-sized element.
 *
 * Each `append` adds one node and each `fits` reads `scrollHeight` once, so the
 * pagination pass costs a single forced reflow per unit. Rebuilding `innerHTML` from
 * the whole candidate page (the previous approach) made that quadratic.
 */
function createDomPageProbe(
  probe: HTMLElement,
  sectionsWithHeader: Set<number>,
): IncrementalPageProbe<ResumeFlowUnit> {
  let openSectionIndex: number | null = null;
  let openShell: HTMLElement | null = null;
  let openItems: HTMLElement | null = null;

  /**
   * One entry per append, so `undo()` can be called repeatedly — see the
   * `IncrementalPageProbe.undo` contract. Each entry records enough to reverse
   * exactly that append, including whether it opened a new section wrapper.
   */
  type AppendRecord =
    | { type: "block" }
    | {
        type: "item";
        createdSection: boolean;
        shell: HTMLElement | null;
        items: HTMLElement | null;
        previousSectionIndex: number | null;
        previousShell: HTMLElement | null;
        previousItems: HTMLElement | null;
      };

  const appends: AppendRecord[] = [];

  return {
    append(unit) {
      if (unit.kind === "block") {
        probe.appendChild(unit.element.cloneNode(true));
        openSectionIndex = null;
        openShell = null;
        openItems = null;
        appends.push({ type: "block" });
        return;
      }

      const previousSectionIndex = openSectionIndex;
      const previousShell = openShell;
      const previousItems = openItems;

      let createdSection = false;

      if (openSectionIndex !== unit.sectionIndex) {
        openSectionIndex = unit.sectionIndex;
        openShell = createEmptySectionShell(
          unit.section,
          sectionsWithHeader.has(unit.sectionIndex),
        );
        openItems = getSectionItemsContainer(openShell);
        probe.appendChild(openShell);
        createdSection = true;
      }

      if (openItems) openItems.appendChild(unit.item.cloneNode(true));

      appends.push({
        type: "item",
        createdSection,
        shell: openShell,
        items: openItems,
        previousSectionIndex,
        previousShell,
        previousItems,
      });
    },

    fits() {
      return probe.scrollHeight <= RESUME_PAGE_HEIGHT_PX + 1;
    },

    undo() {
      const record = appends.pop();
      if (!record) return;

      if (record.type === "block") {
        if (probe.lastElementChild) probe.removeChild(probe.lastElementChild);
        return;
      }

      if (record.items?.lastElementChild) {
        record.items.removeChild(record.items.lastElementChild);
      }

      if (record.createdSection) {
        if (record.shell && record.shell.parentNode === probe) probe.removeChild(record.shell);

        openSectionIndex = record.previousSectionIndex;
        openShell = record.previousShell;
        openItems = record.previousItems;
      }
    },

    reset() {
      probe.innerHTML = "";
      openSectionIndex = null;
      openShell = null;
      openItems = null;
      appends.length = 0;
    },
  };
}

export function ResumePagedPreview({ children }: { children: ReactNode }) {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<ResumePreviewPage[]>([]);
  const [pageStyle, setPageStyle] = useState<CSSProperties>({});
  const [fontsReady, setFontsReady] = useState(() => typeof document === "undefined");

  // Measuring before the document font has loaded fills the probe with fallback
  // metrics, which produces page breaks the PDF export will not reproduce.
  useEffect(() => {
    if (fontsReady) return;

    let cancelled = false;

    document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [fontsReady]);

  useLayoutEffect(() => {
    // `children` is a fresh element on every editor render, so without this the
    // whole measuring pass ran on every keystroke.
    const timer = window.setTimeout(() => {
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

      const units = buildFlowUnits(container);

      // A section shows its heading on the first page it appears on and not on
      // continuation pages. Measuring and rendering must agree on that, so the set is
      // built once, before either pass, and shared by both.
      const sectionsWithHeader = new Set<number>();
      for (const unit of units) {
        if (unit.kind === "item") sectionsWithHeader.add(unit.sectionIndex);
      }

      const measuredPages = paginateIncremental(
        units,
        createDomPageProbe(probe, sectionsWithHeader),
      );

      probe.remove();

      const seenSections = new Set<number>();
      const resolvedPages: ResumePreviewPage[] = measuredPages.map((pageUnits) => {
        const headerSections = new Set<number>();

        for (const unit of pageUnits) {
          if (unit.kind !== "item") continue;
          if (!seenSections.has(unit.sectionIndex)) {
            headerSections.add(unit.sectionIndex);
            seenSections.add(unit.sectionIndex);
          }
        }

        return { content: renderUnitsToHtml(pageUnits, headerSections) };
      });

      const nextPages =
        resolvedPages.length > 0 ? resolvedPages : [{ content: container.innerHTML }];
      const pageKey = nextPages.map((page) => page.content).join("");
      const styleKey = JSON.stringify(nextPageStyle);

      setPageStyle((currentStyle) =>
        JSON.stringify(currentStyle) === styleKey ? currentStyle : nextPageStyle,
      );
      setPages((currentPages) =>
        currentPages.map((page) => page.content).join("") === pageKey ? currentPages : nextPages,
      );
    }, MEASURE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [children, fontsReady]);

  return (
    <div className="relative">
      {/*
        A complete second copy of the resume, off-screen, so page breaks can be measured
        against real layout. `EXPORT_EXCLUDE_ATTRIBUTE` is what keeps it out of the
        WYSIWYG HTML export, which clones this subtree — see `export-html.ts`.
      */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none absolute opacity-0"
        style={{ left: -10000, top: 0, width: RESUME_PAGE_WIDTH_PX }}
        {...{ [EXPORT_EXCLUDE_ATTRIBUTE]: "true" }}
      >
        {children}
      </div>

      <div className="grid gap-6" {...{ [EXPORT_ROOT_ATTRIBUTE]: "true" }}>
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
