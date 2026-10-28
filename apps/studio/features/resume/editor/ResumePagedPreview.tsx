"use client";

import type { CSSProperties, ReactNode } from "react";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { getPageGeometry, type PaperSize } from "@/templates/shared/page-geometry";
import {
  EXPORT_EXCLUDE_ATTRIBUTE,
  EXPORT_ROOT_ATTRIBUTE,
} from "@/features/documents/export/export-dom-markers";
import {
  HEADING_PRESENCE_LINES,
  screenScale,
  SPLIT_ATTRIBUTE,
  TEXT_ITEM_ATTRIBUTE,
  paginateIncremental,
  type IncrementalPageProbe,
} from "@/templates/shared/pagination";

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

/** Float noise between two box measurements, far below anything a reader could see. */
const FIT_EPSILON_PX = 0.01;

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

/**
 * An empty clone of `section`, optionally without its heading (continuation pages), and the
 * container its items go back into.
 *
 * The container is found before the heading is removed: without the heading the shell has a
 * single child, which `getSectionItemsContainer` no longer recognises as a section, and a
 * continuation page that looked it up afterwards dropped every item it should have carried.
 */
function createEmptySectionShell(
  section: HTMLElement,
  includeHeader: boolean,
  startsFlush: boolean,
): { shell: HTMLElement; items: HTMLElement | null } {
  const shell = section.cloneNode(true) as HTMLElement;
  const items = getSectionItemsContainer(shell);

  if (items) items.innerHTML = "";

  if (!includeHeader) {
    if (shell.children.length > 0) shell.removeChild(shell.children[0]);

    // A continuation is where react-pdf broke the section, and it drops the edges that fall
    // inside a break: the section's top margin goes. The first item keeps the gap above it
    // when react-pdf moved it over whole, and starts flush when react-pdf split it — see
    // {@link startsFlush}.
    shell.style.marginTop = "0px";

    const source = getSectionItemsContainer(section);

    if (items && source && !startsFlush) {
      const gap = Number.parseFloat(window.getComputedStyle(source).rowGap) || 0;
      items.style.paddingTop = `${gap}px`;
    }
  }

  return { shell, items };
}

/**
 * Whether `item`, opening a continuation page, starts flush with the top rather than one gap
 * down. react-pdf keeps the top margin of a node it moves to the next page whole and drops
 * it from a node it splits there. It splits the rest of an item broken at the page foot (a
 * detached copy here), and a `Text` item — a skill line — that started above the foot even
 * though none of its lines fit (`splitTexts`); a `Text` starting at or below the foot is
 * moved whole, like a view.
 */
function startsFlush(item: HTMLElement, splitTexts: WeakSet<HTMLElement>): boolean {
  return !item.isConnected || splitTexts.has(item);
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
function renderUnitsToHtml(
  units: ResumeFlowUnit[],
  sectionsWithHeader: Set<number>,
  splitTexts: WeakSet<HTMLElement>,
): string {
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
      ({ shell: openShell, items: openItems } = createEmptySectionShell(
        unit.section,
        sectionsWithHeader.has(unit.sectionIndex),
        startsFlush(unit.item, splitTexts),
      ));
    }

    if (openItems) openItems.appendChild(unit.item.cloneNode(true));
  }

  closeSection();

  return html;
}

/** Whether the template marked this unit (or the item inside it) as allowed to flow. */
function isSplittable(unit: ResumeFlowUnit): boolean {
  const element = unit.kind === "block" ? unit.element : unit.item;

  return (
    element.hasAttribute(SPLIT_ATTRIBUTE) || Boolean(element.querySelector(`[${SPLIT_ATTRIBUTE}]`))
  );
}

/**
 * The offset in `node` of the first character whose line ends below `limit`, or -1 if none
 * does.
 *
 * A line ends at the bottom of its line box, not of its glyphs: react-pdf keeps a line only
 * when `top + lineHeight` is at or above the page foot. A character's rect is the font's
 * content area, centred in the line box, so the line box reaches half the leading further
 * down. Comparing the glyph bottom kept one more line of a 21px-high, 14px paragraph on the
 * page whenever its line box crossed the foot by less than 1.5px — 38 lines where the PDF
 * set 37.
 */
function textCutOffset(node: Text, limit: number, scale: number): number {
  const range = document.createRange();
  const lineHeight = Number.parseFloat(
    node.parentElement ? window.getComputedStyle(node.parentElement).lineHeight : "",
  );
  const bottomAt = (offset: number) => {
    range.setStart(node, offset);
    range.setEnd(node, offset + 1);
    const rect = range.getBoundingClientRect();
    const halfLeading = Number.isFinite(lineHeight) ? (lineHeight * scale - rect.height) / 2 : 0;
    return rect.bottom + Math.max(0, halfLeading);
  };

  const length = node.data.length;
  if (length === 0 || bottomAt(length - 1) <= limit) return -1;

  // Line bottoms only grow along the text, so the first overflowing character is found
  // by bisection rather than by measuring each one.
  let low = 0;
  let high = length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (bottomAt(middle) > limit) high = middle;
    else low = middle + 1;
  }

  // react-pdf then moves the cut so no page holds fewer than two of the paragraph's lines.
  const lineStarts = textLineStarts(node);
  const fitting = lineStarts.filter((start) => start < low).length;
  const kept = keptLineCount(fitting, lineStarts.length);

  if (kept === 0) return 0;
  return kept >= lineStarts.length ? -1 : lineStarts[kept];
}

/** react-pdf's default `orphans` and `widows`. */
const MIN_LINES = 2;

/**
 * How many of a paragraph's `total` lines react-pdf leaves on the page when `fitting` of
 * them fit (`getLineBreak` in `@react-pdf/layout`): none if fewer than two would stay or
 * the paragraph is too short to split, and never fewer than two carried over.
 */
function keptLineCount(fitting: number, total: number): number {
  if (fitting === 0) return 0;
  if (total < MIN_LINES) return total;
  if (fitting < MIN_LINES || total < MIN_LINES * 2) return 0;
  if (total === MIN_LINES * 2) return MIN_LINES;
  if (total - fitting < MIN_LINES) return total - MIN_LINES;
  return fitting;
}

/** The offset each rendered line of `node` starts at. */
function textLineStarts(node: Text): number[] {
  const range = document.createRange();
  const starts: number[] = [];
  let lastTop = Number.NEGATIVE_INFINITY;

  for (let offset = 0; offset < node.data.length; offset += 1) {
    range.setStart(node, offset);
    range.setEnd(node, offset + 1);
    const rect = range.getBoundingClientRect();

    // Collapsed whitespace draws nothing and belongs to no line.
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.top > lastTop + rect.height / 2) {
      starts.push(offset);
      lastTop = rect.top;
    }
  }

  return starts;
}

/**
 * Breaks a rendered element at `limit` (a viewport y), the way react-pdf breaks a view that
 * runs off a page: what is drawn above the line stays in `element`, and everything below
 * moves, inside shallow copies of its ancestors, into the element returned. Null when
 * nothing had to move.
 *
 * Children stacked in a column move in order — once one moves, every later one does. In a
 * row (an item's date gutter beside its body) each column breaks on its own, and a column
 * with nothing left over keeps an empty copy so the continuation keeps its geometry.
 */
function splitElementAt(element: HTMLElement, limit: number, scale: number): HTMLElement | null {
  const rest = element.cloneNode(false) as HTMLElement;
  const computed = window.getComputedStyle(element);
  const isRow = computed.display.includes("flex") && computed.flexDirection.startsWith("row");
  let moving = false;
  let moved = false;

  for (const child of Array.from(element.childNodes)) {
    if (moving && !isRow) {
      rest.appendChild(child);
      continue;
    }

    if (child instanceof Text) {
      const offset = textCutOffset(child, limit, scale);

      if (offset === -1) continue;

      rest.appendChild(offset === 0 ? child : child.splitText(offset));
      moving = moved = true;
      continue;
    }

    if (!(child instanceof HTMLElement)) continue;

    const box = child.getBoundingClientRect();

    if (box.bottom <= limit + 0.5) {
      if (isRow) rest.appendChild(child.cloneNode(false));
      continue;
    }

    if (box.top >= limit - 0.5) {
      rest.appendChild(child);
    } else {
      const childRest = splitElementAt(child, limit, scale);

      if (!childRest) {
        if (isRow) rest.appendChild(child.cloneNode(false));
        continue;
      }

      rest.appendChild(childRest);
    }

    moving = moved = true;
  }

  if (!moved) return null;

  // A continuation starts flush with the top of its page, as react-pdf's does.
  rest.style.marginTop = "0px";
  rest.style.paddingTop = "0px";

  return rest;
}

/** `unit` carrying `element` in place of the node it was built from. */
function withElement(unit: ResumeFlowUnit, element: HTMLElement): ResumeFlowUnit {
  return unit.kind === "block" ? { ...unit, element } : { ...unit, item: element };
}

/**
 * Append-only measuring probe over a real off-screen page-sized element.
 *
 * Each `append` adds one node and each `fits` reads `scrollHeight` once, so the
 * pagination pass costs a single forced reflow per unit. Rebuilding `innerHTML` from
 * the whole candidate page (the previous approach) made that quadratic.
 */
function createDomPageProbe(
  pageHeight: number,
  probe: HTMLElement,
  splitTexts: WeakSet<HTMLElement>,
): IncrementalPageProbe<ResumeFlowUnit> {
  /**
   * Sections an earlier page already opened. Their continuation is measured without the
   * heading, as it is drawn — and as the PDF draws it: react-pdf repeats no heading.
   */
  const startedSections = new Set<number>();
  let openSectionIndex: number | null = null;
  let openShell: HTMLElement | null = null;
  let openItems: HTMLElement | null = null;

  /**
   * One entry per append, so `undo()` can be called repeatedly — see the
   * `IncrementalPageProbe.undo` contract. Each entry records enough to reverse
   * exactly that append, including whether it opened a new section wrapper.
   */
  type AppendRecord =
    | { type: "block"; unit: ResumeFlowUnit }
    | {
        type: "item";
        unit: ResumeFlowUnit;
        createdSection: boolean;
        shell: HTMLElement | null;
        items: HTMLElement | null;
        previousSectionIndex: number | null;
        previousShell: HTMLElement | null;
        previousItems: HTMLElement | null;
      };

  const appends: AppendRecord[] = [];

  /** The heading drawn above `target` when `target` opens its section on this page. */
  const sectionHeadingOf = (
    unit: ResumeFlowUnit,
    target: HTMLElement,
    record: AppendRecord,
  ): Element | null => {
    // Continuations are detached copies; only the original unit carries the opening.
    if (unit.kind === "block") {
      return unit.element.isConnected && target.tagName === "SECTION"
        ? target.firstElementChild
        : null;
    }

    const opensSection =
      unit.item.isConnected && unit.item.parentElement?.firstElementChild === unit.item;

    return opensSection && record.type === "item" && (record.shell?.children.length ?? 0) > 1
      ? (record.shell?.firstElementChild ?? null)
      : null;
  };

  return {
    append(unit) {
      if (unit.kind === "block") {
        probe.appendChild(unit.element.cloneNode(true));
        openSectionIndex = null;
        openShell = null;
        openItems = null;
        appends.push({ type: "block", unit });
        return;
      }

      const previousSectionIndex = openSectionIndex;
      const previousShell = openShell;
      const previousItems = openItems;

      let createdSection = false;

      if (openSectionIndex !== unit.sectionIndex) {
        openSectionIndex = unit.sectionIndex;
        ({ shell: openShell, items: openItems } = createEmptySectionShell(
          unit.section,
          !startedSections.has(unit.sectionIndex),
          startsFlush(unit.item, splitTexts),
        ));
        probe.appendChild(openShell);
        createdSection = true;
      }

      if (openItems) openItems.appendChild(unit.item.cloneNode(true));

      appends.push({
        type: "item",
        unit,
        createdSection,
        shell: openShell,
        items: openItems,
        previousSectionIndex,
        previousShell,
        previousItems,
      });
    },

    /**
     * Whether the content ends inside the page's text area, measured to the fraction of a
     * pixel — react-pdf moves an unbreakable block that ends even 0.75px past it
     * (`height < top + height`, no slack). `scrollHeight` is rounded to whole pixels and was
     * read with a pixel of slack on top, so an item ending up to ~1.5px past the margin
     * stayed on the page in the preview and moved to the next one in the PDF.
     */
    fits() {
      const last = probe.lastElementChild;

      if (!last) return true;

      const scale = screenScale(probe);
      const bottom =
        (last.getBoundingClientRect().bottom - probe.getBoundingClientRect().top) / scale;
      const textAreaBottom =
        pageHeight - Number.parseFloat(window.getComputedStyle(probe).paddingBottom || "0");
      const fits = bottom <= textAreaBottom + FIT_EPSILON_PX;

      // A text item that starts above the foot is split by react-pdf, not moved: remember
      // it, so the next page starts it flush (see `startsFlush`).
      const record = appends[appends.length - 1];
      const placed = record?.type === "item" ? record.items?.lastElementChild : null;

      if (
        !fits &&
        record?.unit.kind === "item" &&
        record.unit.item.hasAttribute(TEXT_ITEM_ATTRIBUTE) &&
        placed
      ) {
        const top =
          (placed.getBoundingClientRect().top - probe.getBoundingClientRect().top) / scale;

        if (top < textAreaBottom - FIT_EPSILON_PX) splitTexts.add(record.unit.item);
      }

      return fits;
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

    split() {
      const record = appends[appends.length - 1];
      const target =
        record?.type === "block" ? probe.lastElementChild : record?.items?.lastElementChild;

      if (!record || !(target instanceof HTMLElement)) return null;

      // The page foot in screen pixels, like every rect it is compared with.
      const scale = screenScale(probe);
      const limit =
        probe.getBoundingClientRect().top +
        (pageHeight - Number.parseFloat(window.getComputedStyle(probe).paddingBottom || "0")) *
          scale;

      // A section's opening keeps a few lines under its heading, or moves with it — the
      // `minPresenceAhead` the PDF puts on the heading.
      const heading = sectionHeadingOf(record.unit, target, record);
      const presence =
        HEADING_PRESENCE_LINES *
        Number.parseFloat(window.getComputedStyle(probe).lineHeight) *
        scale;

      if (heading && limit - heading.getBoundingClientRect().bottom < presence) return null;

      const whole = target.cloneNode(true) as HTMLElement;
      const rest = splitElementAt(target, limit, scale);

      // Nothing of it fits here: it moves to the next page whole, as react-pdf moves it.
      if (!rest || !target.textContent?.trim()) {
        target.replaceWith(whole);
        return null;
      }

      return [
        withElement(record.unit, target.cloneNode(true) as HTMLElement),
        withElement(record.unit, rest),
      ];
    },

    reset() {
      // Everything still on the probe is the page just finished.
      for (const record of appends) {
        if (record.unit.kind === "item") startedSections.add(record.unit.sectionIndex);
      }

      probe.innerHTML = "";
      openSectionIndex = null;
      openShell = null;
      openItems = null;
      appends.length = 0;
    },
  };
}

/**
 * `paperSize` is the resume's own (`customization.paperSize`): the template draws its page at
 * that size, and the pages here are cut to the same box.
 */
/**
 * The attributes of the container the resume is rendered into whole, whose layout the
 * pages are measured against.
 *
 * Until there are pages it *is* the document: in the page flow, visible, read by screen
 * readers and exported. The pages exist only once a measuring pass has run in the browser,
 * so without this the server's HTML, a page with no script and the first moments of every
 * visit showed nothing at all. Once the pages are drawn it moves off-screen, out of the
 * accessibility tree, the tab order (S-311: its links are copies the user cannot see) and
 * the export, which then takes the pages. The same element throughout, so the swap
 * remounts nothing.
 */
export function flowContainerProps(visible: boolean, widthPx: number) {
  if (visible) {
    return {
      // Centred, as the pages that replace it are.
      className: "mx-auto",
      style: { width: widthPx } satisfies CSSProperties,
      [EXPORT_ROOT_ATTRIBUTE]: "true",
    };
  }

  return {
    "aria-hidden": "true" as const,
    inert: true,
    className: "pointer-events-none absolute opacity-0",
    style: { left: -10000, top: 0, width: widthPx } satisfies CSSProperties,
    [EXPORT_EXCLUDE_ATTRIBUTE]: "true",
  };
}

export function ResumePagedPreview({
  children,
  paperSize,
  fallbackOnMeasureError = false,
}: {
  children: ReactNode;
  paperSize: PaperSize | undefined;
  /**
   * Show the resume unpaginated when measuring fails, instead of rethrowing to the nearest
   * error boundary. For the public share page, where a recruiter is better served by the
   * whole resume on one long sheet than by an error; the editor keeps its boundary.
   */
  fallbackOnMeasureError?: boolean;
}) {
  const geometry = getPageGeometry(paperSize);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<ResumePreviewPage[]>([]);
  const [pageStyle, setPageStyle] = useState<CSSProperties>({});
  const [fontsReady, setFontsReady] = useState(() => typeof document === "undefined");
  // Bumped whenever a font finishes loading after the first measure.
  const [fontLoads, setFontLoads] = useState(0);
  // A measuring pass that threw. It runs in a timer, where an exception reaches no error
  // boundary and leaves the last pages on screen as if nothing were wrong; rethrown below.
  const [measureError, setMeasureError] = useState<unknown>(null);

  // Measuring before the document font has loaded fills the probe with fallback
  // metrics, which produces page breaks the PDF export will not reproduce.
  useEffect(() => {
    if (fontsReady) return;

    let cancelled = false;

    document.fonts.ready
      .catch((error: unknown) => {
        // A font that failed to load still leaves a page to show; measure with the fallback.
        console.error("Resume preview fonts failed to load", error);
      })
      .then(() => {
        if (!cancelled) setFontsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [fontsReady]);

  // Only the default font is preloaded. Switching to another loads it after the first
  // measure, so the breaks are measured again once it has arrived.
  useEffect(() => {
    const remeasure = () => setFontLoads((count) => count + 1);

    document.fonts.addEventListener("loadingdone", remeasure);
    return () => document.fonts.removeEventListener("loadingdone", remeasure);
  }, []);

  useLayoutEffect(() => {
    // `children` is a fresh element on every editor render, so without this the
    // whole measuring pass ran on every keystroke.
    const timer = window.setTimeout(() => {
      try {
        measure();
      } catch (error) {
        // Rethrown below, to a boundary that reports it, unless the caller takes the fallback.
        if (fallbackOnMeasureError) console.error("Resume preview could not be paginated", error);
        setMeasureError(error);
      }
    }, MEASURE_DEBOUNCE_MS);

    function measure() {
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
        height: `${geometry.heightPx}px`,
        minHeight: `${geometry.heightPx}px`,
        position: "absolute",
        width: `${geometry.widthPx}px`,
      });

      measureRoot.appendChild(probe);

      const units = buildFlowUnits(container);
      // Text items react-pdf will split across the break; filled by the probe, read by both.
      const splitTexts = new WeakSet<HTMLElement>();

      let measuredPages: ResumeFlowUnit[][];

      try {
        measuredPages = paginateIncremental(
          units,
          createDomPageProbe(geometry.heightPx, probe, splitTexts),
          undefined,
          isSplittable,
        );
      } finally {
        probe.remove();
      }

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

        return { content: renderUnitsToHtml(pageUnits, headerSections, splitTexts) };
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
      // A later pass that works brings the pages back after a fallback.
      setMeasureError(null);
    }

    return () => window.clearTimeout(timer);
  }, [children, fontsReady, fontLoads, geometry, fallbackOnMeasureError]);

  if (measureError && !fallbackOnMeasureError) throw measureError;

  // Until the first pass has drawn pages, or when measuring failed and the caller asked for
  // the fallback, the measuring copy is what the reader sees — see `flowContainerProps`.
  const showFlow = pages.length === 0 || (Boolean(measureError) && fallbackOnMeasureError);

  return (
    <div className="relative">
      {/*
        The resume rendered whole, so page breaks can be measured against real layout. Once
        the pages are drawn it is a second copy, off-screen; `EXPORT_EXCLUDE_ATTRIBUTE` is
        what then keeps it out of the WYSIWYG HTML export, which clones this subtree — see
        `export-html.ts`.
      */}
      <div ref={measureRef} {...flowContainerProps(showFlow, geometry.widthPx)}>
        {children}
      </div>

      <div className="grid gap-6" {...(showFlow ? {} : { [EXPORT_ROOT_ATTRIBUTE]: "true" })}>
        {showFlow
          ? null
          : pages.map((page, index) => (
              <article
                className="resume-page-preview mx-auto overflow-hidden bg-white"
                key={index}
                style={{
                  ...pageStyle,
                  width: geometry.widthPx,
                  minHeight: geometry.heightPx,
                  height: geometry.heightPx,
                }}
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            ))}
      </div>
    </div>
  );
}
