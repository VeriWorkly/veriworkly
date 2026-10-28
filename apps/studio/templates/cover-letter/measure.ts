import type { CSSProperties } from "react";

import { useEffect, useState } from "react";

import { screenScale } from "@/templates/shared/pagination";

/**
 * Cover-letter pagination, mirroring react-pdf.
 *
 * The PDF is one flowing `<Page>`: `@react-pdf/layout` places the letter and breaks it
 * wherever the page runs out. The preview cannot ask react-pdf where that was, so it
 * replays the same rules against real boxes in a hidden probe (`paginateCoverLetterFlow`):
 *
 * - an item whose box fits stays, unless its bottom margin crosses the page foot and
 *   something precedes it on the page — then it moves down whole (`shouldBreak`);
 * - a "whole" item (`wrap={false}` in the PDF) that does not fit moves to the next page;
 * - a "text" item is cut between lines, keeping at least two lines on either side
 *   (react-pdf's default `orphans`/`widows`), and the part on the next page loses its top
 *   margin, padding and border, the part left behind its bottom ones (`splitText`);
 * - a "rows" item (a list of `wrap={false}` rows) is cut between rows, with the same box
 *   treatment (`splitView`).
 *
 * So the preview and the PDF agree on every page break by construction, and a paragraph
 * longer than the space left continues on the next page instead of being clipped.
 */

export type FlowSplitKind = "text" | "rows" | "whole";

export interface FlowFragment<T> {
  item: T;
  /** The words (text items) or rows (lists) on this page; the whole item when absent. */
  range?: [number, number];
  /** Carried over from the previous page: top margin, padding and border dropped. */
  continued?: boolean;
  /** Carries on to the next page: bottom margin, padding and border dropped. */
  continues?: boolean;
}

/** Marks a list row (`data-flow-row` in the templates), the unit a "rows" item is cut between. */
const FLOW_ROW_ATTRIBUTE = "data-flow-row";

/**
 * Float noise between two box measurements, in CSS pixels — not slack. react-pdf keeps a
 * line or a box only when it ends at or above the page foot (`lineBottom > height` ends the
 * page, `height < top + height` moves a box), so a pixel of slack here kept a paragraph
 * line, or a whole paragraph, on a page the PDF had already turned.
 */
const TOLERANCE = 0.01;

/** react-pdf's default `orphans` and `widows`. */
const MIN_LINES = 2;

export function getFragmentWords(text: string, range: [number, number] | undefined) {
  if (!range) return text;

  return text.split(/\s+/).filter(Boolean).slice(range[0], range[1]).join(" ");
}

export function getFragmentRows<R>(rows: R[], range: [number, number] | undefined) {
  const [start, end] = range ?? [0, rows.length];

  return rows.slice(start, end).map((row, offset) => ({ row, index: start + offset }));
}

/** Style overrides for a fragment's box; spread last over the item's own style. */
export function getFragmentBoxStyle(fragment: FlowFragment<unknown>): CSSProperties {
  return {
    ...(fragment.continued ? { borderTop: "none", marginTop: 0, paddingTop: 0 } : {}),
    ...(fragment.continues ? { borderBottom: "none", marginBottom: 0, paddingBottom: 0 } : {}),
  };
}

export interface CoverLetterFlowConfig<T> {
  /** The page box; its bottom padding is the page foot. */
  measureRoot: HTMLElement;
  /** Element that receives the per-page prefix and the body container. */
  contentRoot: HTMLElement;
  /**
   * A fresh body container for a page. `continued` is true once an earlier page holds
   * part of the body: react-pdf then drops the body's top margin, as for any split box.
   */
  createBody: (continued: boolean) => HTMLElement;
  /** Letterhead for a given page index, or null for none. */
  getPrefix: (pageIndex: number) => HTMLElement | null;
  /** The already-rendered wrapper for an item; its first element child is the item's box. */
  getItemNode: (item: T) => HTMLElement | null;
  getSplitKind: (item: T) => FlowSplitKind;
}

function px(value: string) {
  return Number.parseFloat(value) || 0;
}

function getBox(node: HTMLElement) {
  return (node.firstElementChild as HTMLElement | null) ?? node;
}

function applyFragment(box: HTMLElement, fragment: FlowFragment<unknown>, kind: FlowSplitKind) {
  Object.assign(box.style, getFragmentBoxStyle(fragment));

  if (!fragment.range) return;

  if (kind === "text") {
    box.textContent = getFragmentWords(box.textContent ?? "", fragment.range);
    return;
  }

  const [start, end] = fragment.range;

  box.querySelectorAll(`[${FLOW_ROW_ATTRIBUTE}]`).forEach((row, index) => {
    if (index < start || index >= end) row.remove();
  });
}

/** react-pdf's `getLineBreak`: how many lines stay on this page. */
function getLineBreak(lines: number, linesThatFit: number) {
  if (linesThatFit === 0) return 0;
  if (lines < MIN_LINES) return lines;
  if (linesThatFit < MIN_LINES || lines < MIN_LINES * 2) return 0;
  if (lines === MIN_LINES * 2) return MIN_LINES;
  if (lines - linesThatFit < MIN_LINES) return lines - MIN_LINES;

  return linesThatFit;
}

/**
 * The word a text box's next page starts at, or null when every line stays.
 *
 * Lines are found from where each word lands; text tokens pin an absolute line height,
 * so line `n` starts `n` line boxes below the content top in both engines.
 */
function findTextBreak(box: HTMLElement, limit: number, scale: number): number | null {
  const style = window.getComputedStyle(box);
  const lineHeight = px(style.lineHeight) * scale;
  const rect = box.getBoundingClientRect();

  if (!lineHeight) return null;

  const contentTop = rect.top + (px(style.borderTopWidth) + px(style.paddingTop)) * scale;
  const lineStarts: number[] = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
  let wordIndex = 0;

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (const match of (node.textContent ?? "").matchAll(/\S+/g)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);

      const wordRect = range.getClientRects()[0];

      if (wordRect) {
        const line = Math.floor((wordRect.top + wordRect.height / 2 - contentTop) / lineHeight);

        if (lineStarts[line] === undefined) lineStarts[line] = wordIndex;
      }

      wordIndex += 1;
    }
  }

  const lines = lineStarts.length;
  // react-pdf measures from the box top and ignores the box's own top padding here.
  const linesThatFit = Math.min(
    lines,
    Math.max(0, Math.floor((limit - rect.top + TOLERANCE * scale) / lineHeight)),
  );
  const kept = getLineBreak(lines, linesThatFit);

  if (kept >= lines) return null;

  return kept === 0 ? 0 : (lineStarts[kept] ?? null);
}

/** Index of the first row that does not fit, or null when every row does. */
function findRowBreak(box: HTMLElement, limit: number, tolerance: number): number | null {
  const rows = Array.from(box.querySelectorAll(`[${FLOW_ROW_ATTRIBUTE}]`));
  const index = rows.findIndex((row) => row.getBoundingClientRect().bottom > limit + tolerance);

  return index === -1 ? rows.length : index;
}

function countUnits(box: HTMLElement, kind: FlowSplitKind) {
  return kind === "text"
    ? (box.textContent ?? "").split(/\s+/).filter(Boolean).length
    : box.querySelectorAll(`[${FLOW_ROW_ATTRIBUTE}]`).length;
}

export function paginateCoverLetterFlow<T>(
  items: T[],
  config: CoverLetterFlowConfig<T>,
): FlowFragment<T>[][] {
  const pages: FlowFragment<T>[][] = [];
  let page: FlowFragment<T>[] = [];
  let body = config.contentRoot;

  // Rects are in screen pixels and the probe may sit under the editor's zoom or Full
  // Preview's fit-to-width transform, so CSS lengths are scaled to match (`screenScale`).
  const scale = screenScale(config.measureRoot);
  const tolerance = TOLERANCE * scale;
  const rootStyle = window.getComputedStyle(config.measureRoot);
  const rootRect = config.measureRoot.getBoundingClientRect();
  const limit = rootRect.bottom - px(rootStyle.paddingBottom) * scale;
  const contentArea =
    rootRect.height - (px(rootStyle.paddingTop) + px(rootStyle.paddingBottom)) * scale;

  function startPage() {
    config.contentRoot.innerHTML = "";

    const prefix = config.getPrefix(pages.length);
    if (prefix) config.contentRoot.appendChild(prefix.cloneNode(true));

    body = config.createBody(pages.some((previous) => previous.length > 0));
    config.contentRoot.appendChild(body);
  }

  function closePage() {
    pages.push(page);
    page = [];
    startPage();
  }

  startPage();

  let pending: FlowFragment<T> | null = null;
  let next = 0;

  while (pending || next < items.length) {
    const fragment: FlowFragment<T> = pending ?? { item: items[next++] };
    pending = null;

    const source = config.getItemNode(fragment.item);
    if (!source) continue;

    const kind = config.getSplitKind(fragment.item);
    const node = source.cloneNode(true) as HTMLElement;
    const box = getBox(node);

    applyFragment(box, fragment, kind);
    body.appendChild(node);

    const rect = box.getBoundingClientRect();
    const hasPrevious = page.length > 0;
    // Moving to a fresh page cannot help an item that already starts one.
    const canMove = hasPrevious || pages.length === 0;

    if (rect.bottom <= limit + tolerance) {
      const marginBottom = px(window.getComputedStyle(box).marginBottom) * scale;

      if (hasPrevious && rect.bottom + marginBottom > limit + tolerance) {
        node.remove();
        closePage();
        pending = fragment;
        continue;
      }

      page.push(fragment);
      continue;
    }

    if (kind === "whole") {
      if (rect.height > contentArea + tolerance || !canMove) {
        page.push(fragment);
        closePage();
        continue;
      }

      node.remove();
      closePage();
      pending = fragment;
      continue;
    }

    const at =
      kind === "text" ? findTextBreak(box, limit, scale) : findRowBreak(box, limit, tolerance);

    // A text item that cannot start on a page holding nothing else is kept there, as it
    // would be on any other page.
    if (at === null || (kind === "text" && at === 0 && !canMove)) {
      page.push(fragment);
      continue;
    }

    // react-pdf moves a list whose first row does not fit whole, or keeps it when
    // nothing precedes it on the page.
    if (kind === "rows" && at === 0) {
      if (!hasPrevious) {
        page.push(fragment);
        closePage();
        continue;
      }

      node.remove();
      closePage();
      pending = fragment;
      continue;
    }

    const start = fragment.range?.[0] ?? 0;
    const end = start + countUnits(box, kind);

    node.remove();
    page.push({ ...fragment, range: [start, start + at], continues: true });
    closePage();
    pending = { ...fragment, range: [start + at, end], continued: true, continues: false };
  }

  // A page closed after an oversized item may have nothing left to hold.
  if (page.length > 0 || pages.length === 0) pages.push(page);

  return pages;
}

/**
 * Whether the document font is loaded, per family.
 *
 * Measuring before the font arrives fills the probe with fallback metrics and page
 * breaks the PDF will not reproduce, so pagination re-runs once it lands — and again
 * whenever the user picks another family.
 */
export function useCoverLetterFontReady(fontFamily: string): boolean {
  const [readyFamily, setReadyFamily] = useState<string | null>(() =>
    typeof document === "undefined" ? fontFamily : null,
  );
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);

  if (failure) throw failure.error;

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      document.fonts.load(`15px ${fontFamily}`),
      document.fonts.load(`700 15px ${fontFamily}`),
    ]).then(
      () => {
        if (!cancelled) setReadyFamily(fontFamily);
      },
      (error: unknown) => {
        if (!cancelled) setFailure({ error });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [fontFamily]);

  return readyFamily === fontFamily;
}
