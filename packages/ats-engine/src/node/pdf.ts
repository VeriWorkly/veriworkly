import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import type { AtsLayoutSignals } from "../types.js";
import { measureVisibility, seeThroughImages } from "./hidden.js";
import type { Box } from "./surroundings.js";
import { measureColumns, type PositionedRun } from "./layout.js";
import { pageText, type PdfTextItem } from "./lines.js";
import { optional } from "./peer.js";

/** Pages beyond this are not measured; a resume's layout is established long before then. */
const MAX_PAGES_MEASURED = 6;
/** Fewer text characters than this on a page with an image, and the page is a picture. */
const MIN_PAGE_TEXT = 20;
/** Points a side (about 0.7in) an image must reach to count as a photo. */
const PHOTO_MIN = 50;

/**
 * Where pdf.js finds the standard 14 fonts' data. On Node it reads this with `fs.readFile`, so it
 * is a file-system path, not a `file:` URL — which `readFile` takes as a relative path, failing
 * (and warning) once per font of every such PDF. pdf.js insists on a trailing "/", which `fs`
 * accepts on Windows as well.
 */
function standardFontsDirectory() {
  const packageJson = createRequire(import.meta.url).resolve("pdfjs-dist/package.json");
  return `${join(dirname(packageJson), "standard_fonts")}/`;
}

type PdfGeometry = Omit<AtsLayoutSignals, "tableCount">;

/**
 * A PDF's text and page geometry, in one pdf.js pass.
 *
 * The text is assembled here (`pageText`) rather than by pdf-parse, which merged a job title and
 * its employer whenever pdf.js reported the gap between them as a wide space. Reading stops once
 * the text passes `maxChars`, so a thousand-page upload costs what a resume does.
 * Geometry is measured on the first pages only; when it cannot be read it is null — the column
 * rule is then dropped from the report rather than guessed at — and the text still stands.
 */
async function readPdf(
  data: Uint8Array,
  maxChars: number,
): Promise<{ text: string; geometry: PdfGeometry }> {
  const pdfjs = await optional(() => import("pdfjs-dist/legacy/build/pdf.mjs"), "pdfjs-dist");
  const document = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
    standardFontDataUrl: standardFontsDirectory(),
  }).promise;

  try {
    let text = "";
    let geometry: PdfGeometry | null = null;
    try {
      geometry = await measureGeometry(document, pdfjs.OPS as unknown as Record<string, number>);
    } catch {
      geometry = null;
    }
    for (let page = 1; page <= document.numPages && text.length < maxChars; page += 1) {
      const loaded = await document.getPage(page);
      const viewport = loaded.getViewport({ scale: 1 });
      const { items } = await loaded.getTextContent();
      const textItems: PdfTextItem[] = items.flatMap((item) => ("str" in item ? [item] : []));
      text += `${pageText(textItems, (x, y) => viewport.convertToViewportPoint(x, y))}\n\n`;
      loaded.cleanup();
    }
    return { text, geometry: geometry ?? { columnRatio: null, pageCount: document.numPages } };
  } finally {
    await document.destroy();
  }
}

type PdfDocument = Awaited<
  ReturnType<typeof import("pdfjs-dist/legacy/build/pdf.mjs").getDocument>["promise"]
>;

/** Columns, hidden text, pictures and metadata, from the first pages of a loaded document. */
async function measureGeometry(document: PdfDocument, ops: Record<string, number>) {
  const pages = Math.min(document.numPages, MAX_PAGES_MEASURED);
  let strongest: number | null = null;
  const hidden: string[] = [];
  let imageOnlyPages = 0;
  let imageCount = 0;
  let visibilityRead = true;

  for (let page = 1; page <= pages; page += 1) {
    const loaded = await document.getPage(page);
    const width = loaded.getViewport({ scale: 1 }).width;
    const content = await loaded.getTextContent();

    // What a reader sees of the page's text. Its own try: a page whose drawing operators
    // cannot be replayed still has columns worth measuring, and the hidden-text and
    // image-only signals are then left out rather than reported as clean.
    try {
      const list = (await loaded.getOperatorList()) as unknown as Parameters<
        typeof measureVisibility
      >[1];
      // A masked image covers what is under it unless its pixels actually let it show through.
      const page = measureVisibility(
        ops,
        list,
        loaded.view as [number, number, number, number],
        await seeThroughImages(
          ops,
          list,
          loaded as unknown as Parameters<typeof seeThroughImages>[2],
        ),
      );
      // A loop, not `push(...)`: a spread of a few hundred thousand runs overflows the stack,
      // and this catch would then report the page's hidden text as unmeasured.
      for (const text of page.hidden) hidden.push(text);
      // An image and next to no text: a scan with no OCR layer, or a page saved as a picture.
      if (page.images.length && page.textChars < MIN_PAGE_TEXT) imageOnlyPages += 1;
      // A photo: an image printed at least PHOTO_MIN points a side (icons and logo marks are
      // smaller) but not across most of the page, which is a scan or a background.
      const [, , pageWidth, pageHeight] = loaded.view as Box;
      imageCount += page.images.filter(([x0, y0, x1, y1]) => {
        const [w, h] = [x1 - x0, y1 - y0];
        return w >= PHOTO_MIN && h >= PHOTO_MIN && w * h < pageWidth * pageHeight * 0.5;
      }).length;
    } catch {
      visibilityRead = false;
    }

    const runs: PositionedRun[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const left = item.transform[4] as number;
      runs.push({ left, right: left + item.width, mass: item.str.trim().length });
    }

    const measured = measureColumns(runs, width);
    // The worst page wins: one two-column page is a two-column resume, and averaging it
    // against clean pages would hide exactly the problem worth reporting.
    if (measured !== null) strongest = Math.max(strongest ?? 0, measured);
  }

  const hiddenText = hidden.join(" ").replace(/\s+/g, " ").trim();

  // The document's own description fields, which no reader sees and an instruction to an AI
  // can hide in. Read for that alone: an ATS does not index them.
  let metadataText: string | undefined;
  try {
    const info = (await document.getMetadata()).info as Record<string, unknown> | undefined;
    metadataText = ["Title", "Subject", "Keywords", "Author"]
      .map((field) => info?.[field])
      .filter((value): value is string => typeof value === "string" && value.trim() !== "")
      .join("\n")
      .slice(0, 2_000);
  } catch {
    // No metadata to read is no finding.
  }

  return {
    ...(metadataText && { metadataText }),
    columnRatio: strongest,
    pageCount: document.numPages,
    ...(visibilityRead && {
      hiddenTextChars: hiddenText.replace(/\s/g, "").length,
      hiddenTextSample: hiddenText.slice(0, 80),
      imageOnlyPages,
      imageCount,
    }),
  };
}

/** A PDF's text, its geometry and its ruled tables. Needs `pdf-parse` and `pdfjs-dist`. */
export async function extractPdf(
  data: Uint8Array,
  maxChars: number,
): Promise<{ text: string; layout: AtsLayoutSignals }> {
  const { PDFParse } = await optional(() => import("pdf-parse"), "pdf-parse and pdfjs-dist");
  // pdf.js can take ownership of (detach) the bytes it is handed, so each of the two passes gets
  // its own copy. `new Uint8Array(…)` always copies; `.slice()` would not on a Node `Buffer`,
  // where it returns a view of the same memory.
  const { text, geometry } = await readPdf(new Uint8Array(data), maxChars);
  // pdf-parse is kept for what pdf.js does not do itself: finding ruled tables.
  const parser = new PDFParse({ data: new Uint8Array(data) });

  try {
    let tableCount = 0;
    try {
      // The pages the geometry is measured on, no more: every page cost a 1 500-page upload
      // minutes, and a table count no resume would have.
      const tables = await parser.getTable({ first: MAX_PAGES_MEASURED });
      tableCount = tables.pages.reduce((sum, page) => sum + page.tables.length, 0);
    } catch {
      // Table detection walks vector drawing operators and is the more fragile of the two
      // passes. A document it cannot analyse still has perfectly good text, so extraction
      // succeeds with the table signal simply absent rather than failing the upload.
    }

    return { text, layout: { ...geometry, tableCount } };
  } finally {
    await parser.destroy();
  }
}
