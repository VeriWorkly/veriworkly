import type { GeomNode } from "./geometry";

export interface WebMeasureOptions {
  layout: "stacked" | "gutter";
  /**
   * Sections react-pdf had to break across a page. Their inner offsets restart
   * at the break, so the preview drops them too and only sizes are compared.
   */
  splitSections: number[];
}

/**
 * Runs inside the page. Walks `#resume-container` under the DOM contract that
 * `templates/resume/shared/web.tsx` documents — and that `ResumePagedPreview`
 * already relies on — emitting the records `describeResumePdf` produces.
 *
 * Offsets are taken against an explicit reference element rather than the DOM
 * parent, because the preview wraps items in a flex `Stack` that the PDF has no
 * equivalent for: there, an item's offset is measured from its section.
 *
 * Declared standalone so Playwright can serialize it; it must not close over
 * anything from this module.
 */
export function measureResume(options: WebMeasureOptions): GeomNode[] {
  const { layout, splitSections } = options;
  const split = new Set(splitSections);
  const out: GeomNode[] = [];

  const container = document.querySelector("#resume-container") as HTMLElement | null;
  if (!container) return out;

  const round = (value: number) => Number(value.toFixed(3));

  const emit = (path: string, kind: string, element: Element | undefined, reference?: Element) => {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const base = reference ? reference.getBoundingClientRect() : null;

    out.push({
      path,
      kind,
      top: base ? round(rect.top - base.top) : 0,
      left: base ? round(rect.left - base.left) : 0,
      width: round(rect.width),
      height: round(rect.height),
    });
  };

  const kids = (element: Element) =>
    Array.from(element.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );

  const blocks = kids(container);
  const header = blocks[0] && blocks[0].tagName === "HEADER" ? blocks[0] : undefined;
  const sections = blocks.filter((block) => block.tagName === "SECTION");

  emit("header", "header", header);

  sections.forEach((section, sectionIndex) => {
    const base = `section[${sectionIndex}]`;
    const sectionKids = kids(section);
    const heading = sectionKids[0];
    const itemsContainer = sectionKids[1];

    if (!heading || !itemsContainer) return;

    const anchor = split.has(sectionIndex) ? undefined : section;

    emit(`${base}.heading`, "heading", heading, anchor);

    kids(itemsContainer).forEach((item, itemIndex) => {
      const itemPath = `${base}.item[${itemIndex}]`;

      emit(itemPath, "item", item, anchor);

      // `WebItem` is the only item that sets `display: flex`; a skills line or a
      // summary paragraph is a plain block with no comparable inner structure.
      if (item.style.display !== "flex") return;

      const itemKids = kids(item);
      let rows = itemKids;
      let rowAnchor: Element = item;

      if (layout === "gutter") {
        if (itemKids.length !== 2) return;

        emit(`${itemPath}.gutter`, "gutter", itemKids[0], anchor && item);
        emit(`${itemPath}.body`, "body", itemKids[1], anchor && item);
        rows = kids(itemKids[1]);
        rowAnchor = itemKids[1];
      }

      rows.forEach((row, rowIndex) => {
        const rowPath = `${itemPath}.row[${rowIndex}]`;

        emit(rowPath, "row", row, anchor && rowAnchor);

        const rowKids = kids(row);

        const isBulletBlock =
          rowKids.length > 0 &&
          rowKids.every((child) => {
            const cells = kids(child);
            return cells.length === 2 && cells[0].tagName === "SPAN";
          });

        if (isBulletBlock) {
          rowKids.forEach((bullet, bulletIndex) => {
            const bulletPath = `${rowPath}.bullet[${bulletIndex}]`;

            emit(bulletPath, "bullet", bullet, anchor && row);

            const [marker, text] = kids(bullet);
            emit(`${bulletPath}.marker`, "marker", marker, anchor && bullet);
            emit(`${bulletPath}.text`, "text", text, anchor && bullet);
          });
          return;
        }

        if (rowKids.length > 0 && rowKids.length <= 2) {
          rowKids.forEach((cell, cellIndex) => {
            emit(
              `${rowPath}.cell[${cellIndex}]`,
              cellIndex === 0 ? "title" : "meta",
              cell,
              anchor && row,
            );
          });
        }
      });
    });
  });

  return out;
}

/**
 * Page count and per-page block count of the paginated preview, each page's box, and the pages
 * whose content runs past their bottom edge — which a page cuts off.
 */
export function measurePagination(selector: string): {
  pages: number;
  blocksPerPage: number[];
  /** Each page's `textContent`, normalized on the Node side by `pageTextKey`. */
  texts: string[];
  /** Where each page's first line of text starts, in CSS px from the page top; -1 for none. */
  firstTops: number[];
  clippedPages: number[];
  boxes: { width: number; height: number }[];
} {
  const pages = Array.from(document.querySelectorAll(selector)) as HTMLElement[];

  return {
    pages: pages.length,
    // Blocks that draw text, as `pdfPageSignatures` counts them on the PDF side.
    blocksPerPage: pages.map(
      (page) => Array.from(page.children).filter((child) => child.textContent?.trim()).length,
    ),
    texts: pages.map((page) => page.textContent ?? ""),
    // The first element that holds text itself: its box is the line box react-pdf reports
    // for a Text node (an inline run's box would be the glyphs' content area instead).
    firstTops: pages.map((page) => {
      const scale = page.getBoundingClientRect().height / page.offsetHeight || 1;
      const holder = Array.from(page.querySelectorAll("*")).find((element) =>
        Array.from(element.childNodes).some(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        ),
      );

      if (!holder) return -1;

      const block =
        window.getComputedStyle(holder).display === "inline"
          ? (holder.parentElement ?? holder)
          : holder;

      return Number(
        ((block.getBoundingClientRect().top - page.getBoundingClientRect().top) / scale).toFixed(2),
      );
    }),
    clippedPages: pages.flatMap((page, index) =>
      page.scrollHeight > page.clientHeight + 1 ? [index + 1] : [],
    ),
    // Layout size, not the on-screen rect: the share page scales its pages down to fit.
    boxes: pages.map((page) => ({ width: page.offsetWidth, height: page.offsetHeight })),
  };
}
