/**
 * The printed page box, shared by every document type and every output: the preview, its
 * page breaks, the PDF, the DOCX section and the HTML export's `@page` all read it from
 * {@link getPageGeometry}, keyed on the document's paper size.
 *
 * A4 at 96dpi is 793.71 x 1122.52 CSS px (595.28 x 841.89 pt). The height is floored, so
 * the preview box can never be taller than the PDF page it represents (a preview that is
 * 1px too tall hides a sliver of content; one that is 1px too short only breaks marginally
 * early). The width is rounded up: the page is 595.5 x 841.5 pt, 0.22 pt wider and 0.39 pt
 * shorter than A4. US Letter (8.5 x 11 in) is a whole number of pixels: 816 x 1056 px,
 * 612 x 792 pt.
 *
 * PDF templates state the size in points via {@link pxToPt} rather than `size="A4"`, so
 * both sides derive from these same numbers. Word counts in twips (1/1440 in), and takes
 * the exact ISO and ANSI sizes.
 */
export const PAPER_SIZES = ["a4", "letter"] as const;

export type PaperSize = (typeof PAPER_SIZES)[number];

export const DEFAULT_PAPER_SIZE: PaperSize = "a4";

/** The settings label for each size. */
export const PAPER_SIZE_LABELS: Record<PaperSize, string> = {
  a4: "A4 (210 × 297 mm)",
  letter: "US Letter (8.5 × 11 in)",
};

/** Any stored value reads as a paper size: a missing or unknown one is A4. */
export function toPaperSize(value: unknown): PaperSize {
  return PAPER_SIZES.find((size) => size === value) ?? DEFAULT_PAPER_SIZE;
}

/** CSS px -> PDF points. */
const DOCUMENT_PDF_SCALE = 72 / 96;

export function pxToPt(value: number): number {
  return value * DOCUMENT_PDF_SCALE;
}

export interface PageGeometry {
  paperSize: PaperSize;
  widthPx: number;
  heightPx: number;
  widthPt: number;
  heightPt: number;
  /** The DOCX section's `w:pgSz`. */
  widthTwip: number;
  heightTwip: number;
}

function pageGeometry(
  paperSize: PaperSize,
  [widthPx, heightPx]: [number, number],
  [widthTwip, heightTwip]: [number, number],
): PageGeometry {
  return {
    paperSize,
    widthPx,
    heightPx,
    widthPt: pxToPt(widthPx),
    heightPt: pxToPt(heightPx),
    widthTwip,
    heightTwip,
  };
}

const PAGE_GEOMETRY: Record<PaperSize, PageGeometry> = {
  a4: pageGeometry("a4", [794, 1122], [11906, 16838]),
  letter: pageGeometry("letter", [816, 1056], [12240, 15840]),
};

export function getPageGeometry(paperSize: unknown): PageGeometry {
  return PAGE_GEOMETRY[toPaperSize(paperSize)];
}
