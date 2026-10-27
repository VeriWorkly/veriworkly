import type { CSSProperties } from "react";

import { useLayoutEffect, useRef, useState } from "react";

import type { ProfessionalFlowItem, VeriworklyFlowItem } from "./shared";

import { paginateCoverLetterFlow, useCoverLetterFontReady, type FlowFragment } from "./measure";
import { getFlowPageKey, getFlowSplitKind } from "./shared";
import type { PageGeometry } from "@/templates/shared/page-geometry";

const px = (value: number) => `${value}px`;

interface FlowPagesOptions {
  /** The letter's page box (`getCoverLetterState(...).page`), the size the PDF page is. */
  page: PageGeometry;
  fontFamily: string;
  pageColor: string;
  textColor: string;
  pageMargin: number;
  /** The body container's style; `continued` once an earlier page holds part of the body. */
  bodyStyle: (continued: boolean) => CSSProperties;
  /**
   * Width of a rail beside the letter. With a rail the page is a row of the rail and a
   * padded `main`, and the body is a `section` inside `main`; without one the page itself
   * is padded and the body is its `main`.
   */
  railWidth?: number;
}

/**
 * The preview's page breaks: renders nothing itself, but measures the letter in a hidden
 * probe the size of the PDF page and splits the flow where react-pdf would.
 *
 * The caller renders, inside `measureRef`, one off-screen page holding the first page's
 * letterhead (in `firstPrefixRef`) and every flow item wrapped in `itemRef(item.id)`; the
 * returned `pages` are what it then renders visibly.
 */
export function useFlowPages<T extends ProfessionalFlowItem | VeriworklyFlowItem>(
  flowItems: T[],
  { page, fontFamily, pageColor, textColor, pageMargin, bodyStyle, railWidth }: FlowPagesOptions,
) {
  // No pages until the first measure, one frame later: guessing "everything on page one"
  // showed a long letter clipped at the page foot first.
  const [pages, setPages] = useState<FlowFragment<T>[][]>([]);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const firstPrefixRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const fontsReady = useCoverLetterFontReady(fontFamily);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const probe = document.createElement("article");

      probe.className = "mx-auto max-w-full overflow-hidden";
      probe.style.height = px(page.heightPx);
      probe.style.width = px(page.widthPx);
      // Inherited by every item measured in it, as on the page the template renders.
      probe.style.overflowWrap = "anywhere";

      let root: HTMLElement = probe;

      if (railWidth === undefined) {
        Object.assign(probe.style, {
          backgroundColor: pageColor,
          color: textColor,
          fontFamily,
          padding: px(pageMargin),
        });
      } else {
        Object.assign(probe.style, { display: "flex", fontFamily });

        const aside = document.createElement("aside");
        aside.style.width = px(railWidth);
        aside.style.flexShrink = "0";
        probe.appendChild(aside);

        // The rail is a sibling of `main`, so the page foot is measured on `main`.
        root = document.createElement("main");
        Object.assign(root.style, {
          backgroundColor: pageColor,
          color: textColor,
          flexGrow: "1",
          minWidth: "0",
          padding: px(pageMargin),
        });
        probe.appendChild(root);
      }

      measureRef.current?.appendChild(probe);

      const nextPages = paginateCoverLetterFlow(flowItems, {
        measureRoot: root,
        contentRoot: root,
        // Only the first page carries the letterhead; later pages are body only.
        getPrefix: (pageIndex) => (pageIndex === 0 ? firstPrefixRef.current : null),
        getItemNode: (item) => itemRefs.current.get(item.id) ?? null,
        getSplitKind: getFlowSplitKind,
        createBody: (continued) => {
          const body = document.createElement(railWidth === undefined ? "main" : "section");
          Object.assign(body.style, bodyStyle(continued));
          return body;
        },
      });
      probe.remove();
      const nextKey = getFlowPageKey(nextPages);

      setPages((current) => {
        const currentKey = getFlowPageKey(current);
        return currentKey === nextKey ? current : nextPages;
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    bodyStyle,
    flowItems,
    fontFamily,
    fontsReady,
    page,
    pageColor,
    pageMargin,
    railWidth,
    textColor,
  ]);

  const itemRef = (id: string) => (node: HTMLDivElement | null) => {
    if (node) itemRefs.current.set(id, node);
    else itemRefs.current.delete(id);
  };

  return { pages, measureRef, firstPrefixRef, itemRef };
}
