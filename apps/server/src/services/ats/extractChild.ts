import { createRequire } from "node:module";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

/**
 * Long-lived child process that performs the CPU-bound half of resume extraction.
 *
 * Runs as a separate OS process, not a worker thread. Worker threads share the parent's V8
 * process, and repeatedly spawning threads that load pdf.js segfaults Node (reproduced on
 * v24.18.0: a hard crash within 2-5 spawns, regardless of whether the thread was terminated or
 * allowed to exit on its own). A child process has its own heap, so both a crash and a forced
 * kill are contained.
 *
 * Deliberately imports nothing from `#lib/*` or `#config` — this process is spawned per server
 * worker and should not pull in dotenv/Redis/Prisma.
 *
 * Protocol: one `{ id, format, buffer }` request in, one `{ id, ok, ... }` response out. The `id`
 * lets the parent discard a late reply from a job it already timed out.
 */

export type AtsExtractFormat = "pdf" | "docx" | "text";

export type AtsExtractRequest = {
  id: number;
  format: AtsExtractFormat;
  buffer: string;
};

export type AtsExtractLayout = {
  columnRatio: number | null;
  tableCount: number;
  pageCount: number;
};

export type AtsExtractResponse =
  | { id: number; ok: true; text: string; layout?: AtsExtractLayout }
  | { id: number; ok: false; message: string };

/**
 * Below this many positioned text runs a page carries no usable layout signal. Set low on
 * purpose: a sparse page cannot produce a false column reading, because the balance term below
 * needs real text on both sides of the gutter before it reports anything.
 */
const MIN_ITEMS_FOR_COLUMN_SIGNAL = 12;

/** Pages beyond this are not measured; a resume's layout is established long before then. */
const MAX_PAGES_MEASURED = 6;

/** Candidate gutters are searched across the middle of the page, in 4pt steps. */
const GUTTER_SEARCH_START = 0.3;
const GUTTER_SEARCH_END = 0.7;
const GUTTER_STEP = 4;

type PositionedRun = { left: number; right: number; mass: number };

/**
 * Finds the most balanced vertical channel that no text crosses, and reports how much of the
 * page's text sits on the thinner side of it.
 *
 * This measures the layout itself rather than a side effect of it. The previous implementation
 * inferred columns from the extracted character stream, which meant it could only ever see a
 * two-column page whose columns happened to share text lines. A PDF that emits its left column
 * in full and then its right — equally unreadable to a parser that maps fields by position —
 * produced a perfectly linear stream and scored as a clean single column.
 *
 * Reported as a share rather than a boolean because the shape matters: a balanced two-column
 * resume lands near 0.5, a narrow sidebar near 0.2, and right-aligned dates in an otherwise
 * single-column layout near 0.1. Those are three different amounts of trouble, and the policy
 * bands grade them separately.
 *
 * The share is measured in characters rather than in text runs, which is what separates the
 * second and third cases. A resume with a date pinned to the right margin on every line has as
 * many runs on the right as on the left, and counting runs called that a balanced two-column
 * page — a false alarm on the commonest single-column layout there is. Weighing the text itself
 * puts a column of four-digit years at a tenth of the page, which is what it is.
 *
 * `min(left, right)` covers the other end: a page whose lines are simply shorter than the
 * candidate split has no text at all on the far side, so the share is zero and no gutter is
 * reported.
 */
function measureColumns(runs: PositionedRun[], pageWidth: number) {
  if (runs.length < MIN_ITEMS_FOR_COLUMN_SIGNAL || pageWidth <= 0) return null;

  // A rule, a full-width heading, or a page border may legitimately cross a real gutter.
  const straddleAllowance = Math.max(1, Math.round(runs.length * 0.02));
  let best = 0;

  for (
    let split = pageWidth * GUTTER_SEARCH_START;
    split <= pageWidth * GUTTER_SEARCH_END;
    split += GUTTER_STEP
  ) {
    let straddling = 0;
    let left = 0;
    let right = 0;

    for (const run of runs) {
      if (run.left < split && run.right > split) straddling += 1;
      else if (run.right <= split) left += run.mass;
      else right += run.mass;
    }

    if (straddling > straddleAllowance || left + right === 0) continue;
    best = Math.max(best, Math.min(left, right) / (left + right));
  }

  return best;
}

/**
 * Reads text-run positions straight from the page.
 *
 * pdf.js is loaded directly rather than through pdf-parse because pdf-parse's public surface
 * returns assembled strings and discards the geometry entirely. Both resolve to the same
 * pdfjs-dist build, so this is a second pass over the document but not a second copy of it.
 */
function standardFontsDirectory() {
  const packageJson = createRequire(import.meta.url).resolve("pdfjs-dist/package.json");
  return `${pathToFileURL(dirname(packageJson)).href}/standard_fonts/`;
}

async function measureGeometry(data: Uint8Array) {
  // Imported lazily so the module cost falls only on PDF uploads.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const document = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
    // Resolved from the installed package rather than left unset. Without it pdf.js cannot load
    // metrics for the standard 14 fonts, which it warns about and which can skew the run widths
    // this measurement depends on.
    standardFontDataUrl: standardFontsDirectory(),
  }).promise;

  try {
    const pages = Math.min(document.numPages, MAX_PAGES_MEASURED);
    let strongest: number | null = null;

    for (let page = 1; page <= pages; page += 1) {
      const loaded = await document.getPage(page);
      const width = loaded.getViewport({ scale: 1 }).width;
      const content = await loaded.getTextContent();

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

    return { columnRatio: strongest, pageCount: document.numPages };
  } finally {
    await document.destroy();
  }
}

async function extractPdf(data: Buffer) {
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText({ lineEnforce: true, pageJoiner: "" });

    let tableCount = 0;
    try {
      const tables = await parser.getTable();
      tableCount = tables.pages.reduce((sum, page) => sum + page.tables.length, 0);
    } catch {
      // Table detection walks vector drawing operators and is the more fragile of the two
      // passes. A document it cannot analyse still has perfectly good text, so extraction
      // succeeds with the table signal simply absent rather than failing the upload.
      tableCount = 0;
    }

    let geometry: { columnRatio: number | null; pageCount: number };
    try {
      geometry = await measureGeometry(new Uint8Array(data));
    } catch {
      // Same reasoning as tables: a document whose geometry cannot be read still has usable
      // text. The column rule is then dropped from the report rather than guessed at.
      geometry = { columnRatio: null, pageCount: result.total };
    }

    return {
      text: result.text,
      layout: {
        columnRatio: geometry.columnRatio,
        tableCount,
        pageCount: geometry.pageCount,
      },
    };
  } finally {
    await parser.destroy();
  }
}

async function extract(
  format: AtsExtractFormat,
  data: Buffer,
): Promise<{ text: string; layout?: AtsExtractLayout }> {
  if (format === "pdf") return extractPdf(data);
  if (format === "docx") return { text: (await mammoth.extractRawText({ buffer: data })).value };
  return { text: data.toString("utf8") };
}

process.on("message", (request: AtsExtractRequest) => {
  void (async () => {
    try {
      const { text, layout } = await extract(request.format, Buffer.from(request.buffer, "base64"));
      process.send?.({ id: request.id, ok: true, text, layout } satisfies AtsExtractResponse);
    } catch (error) {
      process.send?.({
        id: request.id,
        ok: false,
        message: error instanceof Error ? error.message : "Resume extraction failed",
      } satisfies AtsExtractResponse);
    }
  })();
});

// Exit rather than linger if the parent goes away without killing us.
process.on("disconnect", () => process.exit(0));
