import { getPageGeometry } from "./page-geometry";

/**
 * The print mechanics every exported HTML document shares: the resume's WYSIWYG and
 * generated exports and each cover letter template's standalone file.
 *
 * A template decides how its page looks. How that page meets paper is decided here, once:
 *
 * - `@page` is the document's own paper size (`getPageGeometry`), never the printer's
 *   default, so the HTML prints on the sheet the PDF is drawn on;
 * - backgrounds and colours print as they are (`print-color-adjust: exact`), as they do in
 *   the PDF — a browser drops them by default;
 * - paragraphs keep two lines either side of a break, react-pdf's `orphans`/`widows`;
 * - the blocks a template keeps whole in the PDF stay whole on paper, and a heading is never
 *   the last thing on a sheet;
 * - the screen-only chrome around the sheet (the grey surround, the sheet's shadow and its
 *   gap to the next one) is dropped.
 *
 * `tests/contracts/print-styles.contract.test.ts` pins that every export reaches its print
 * CSS through this function.
 */
export interface DocumentPrintOptions {
  /** The document's stored paper size; anything unknown is A4, as everywhere else. */
  paperSize: unknown;
  /**
   * The `@page` margin above and below the content, in CSS px. Zero for a document whose
   * sheets already carry their own margins (pre-cut pages, a full-bleed rail).
   */
  pageMarginY?: number;
  /** What shows around the sheet on paper: the page colour, or nothing. */
  background?: string;
  /** The element(s) that draw a sheet on screen. */
  sheet: string;
  /** Extra print declarations for the sheet, beyond dropping its shadow and margins. */
  sheetPrint?: string;
  /** Blocks that must not be split across two sheets. */
  keepTogether?: readonly string[];
  /** Blocks that must not end a sheet: a heading stays with what it heads. */
  keepWithNext?: readonly string[];
  /**
   * A flex column holding the document's flow (a letter's paragraphs), printed as a
   * one-column grid. Printing the flex column, Chrome moved the entire letter body to the
   * second sheet — Professional's dense US Letter came out three sheets where the PDF has
   * two. A grid fragments between its items like a block but,
   * like the flex column, never collapses a paragraph's margin into the next one's.
   */
  flow?: string;
  /** Further print-only rules a template needs (a rail repeated on every sheet). */
  print?: string;
}

export function documentPrintCss({
  paperSize,
  pageMarginY = 0,
  background = "none",
  sheet,
  sheetPrint = "",
  keepTogether = [],
  keepWithNext = [],
  flow,
  print = "",
}: DocumentPrintOptions): string {
  const page = getPageGeometry(paperSize);
  const margin = pageMarginY > 0 ? `${pageMarginY}px 0` : "0";
  const keep = keepTogether.length > 0 ? `${keepTogether.join(",")}{break-inside:avoid}` : "";
  const withNext = keepWithNext.length > 0 ? `${keepWithNext.join(",")}{break-after:avoid}` : "";

  return [
    `@page{size:${page.widthPx}px ${page.heightPx}px;margin:${margin}}`,
    "html{-webkit-print-color-adjust:exact;print-color-adjust:exact}",
    "p,li{orphans:2;widows:2}",
    keep,
    withNext,
    "@media print{",
    `body{margin:0;padding:0;background:${background};display:block}`,
    `${sheet}{box-shadow:none!important;margin:0!important;min-height:0!important;${sheetPrint}}`,
    flow ? `${flow}{display:grid;grid-template-columns:minmax(0,1fr)}` : "",
    print,
    "}",
  ].join("");
}
