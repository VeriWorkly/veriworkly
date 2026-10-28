import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Browser } from "playwright";

import type { ParityServer } from "./server";

import { PARITY_FIXTURE_IDS, PARITY_FIXTURES, type ParityFixtureId } from "./fixtures";
import { diffGeometry, formatDiffs } from "./geometry";
import { launchParityBrowser } from "./browser";
import {
  describeResumePdf,
  layoutPages,
  pageTextKey,
  pdfPageSignatures,
  readResumeDocument,
  splitSectionIndexes,
  type PageSignature,
} from "./pdf-layout";
import { downloadText, expectPrintedSheets, printHtml } from "./print-html";
import { measurePagination, measureResume } from "./web-measure";
import { recordReport } from "./report";
import { startParityServer } from "./server";

import type { ResumeData } from "@/types/resume";

import { loadTemplatePdfComponentById, pdfTemplateIds } from "@/templates/resume/pdf";
import { PAPER_SIZES, getPageGeometry, type PaperSize } from "@/templates/shared/page-geometry";

/**
 * The only test that measures both renderers.
 *
 * Everything else in `tests/contracts` asserts the PDF against the numbers the
 * shared scale declares. That proves the export is internally consistent; it
 * cannot prove the preview agrees, because nothing there ever runs a browser.
 * This file lays the same document out in Chromium and in react-pdf and diffs
 * the two box trees.
 */

const TEMPLATES: Record<string, "stacked" | "gutter"> = {
  "executive-clarity": "stacked",
  "precision-ats": "stacked",
  "modern-minimal": "stacked",
  "timeline-focus": "gutter",
  "corporate-brief": "stacked",
  "bold-impact": "stacked",
  "veriworkly-special": "stacked",
};

/**
 * Half a CSS pixel. Below that the two engines are rounding the same layout
 * differently; above it, a box genuinely moved.
 */
const TOLERANCE_PX = 0.5;

/*
 * No box is excused. Both engines shape text with the same font files, and the PDF breaks
 * lines by the browser's rules (`templates/pdf/line-breaks.ts`). Before that, textkit's
 * Knuth–Plass breaker shrank spaces to keep text up to a few pixels too wide on one line
 * (595.79px in Timeline Focus's 590px column, 712.42px in Executive Clarity's 710px), so
 * those boxes came out a line shorter in the PDF than in the preview.
 */

/**
 * CJK is checked by `tests/contracts/font-coverage.contract.test.ts` instead.
 * No embedded family has a single CJK glyph, so the PDF cannot set that text at
 * all — the characters draw as zero-width blanks, the document comes out
 * shorter, and both a box comparison and a page count here would do nothing but
 * restate that one fact.
 */
const MEASURABLE_FIXTURES = PARITY_FIXTURE_IDS.filter((id) => id !== "cjk");

/**
 * Box-by-box comparison stops at blocks taller than a page: the PDF's boxes are the parts
 * on each page, the preview measured here is one unbroken column, so the two cannot be
 * matched box for box. Pagination and clipping are still checked for them below.
 */
const GEOMETRY_FIXTURES = MEASURABLE_FIXTURES.filter((id) => id !== "overflow");

/** A fixture's resume, on the given paper. */
function fixtureResume(fixture: string, templateId: string, paperSize: PaperSize): ResumeData {
  const resume = PARITY_FIXTURES[fixture as ParityFixtureId].resume();

  return { ...resume, templateId, customization: { ...resume.customization, paperSize } };
}

let server: ParityServer;
let browser: Browser;

beforeAll(async () => {
  server = await startParityServer();
  browser = await launchParityBrowser();
}, 300_000);

afterAll(async () => {
  await browser?.close();
  await server?.stop();
});

async function measure<T>(
  path: string,
  fn: (page: import("playwright").Page) => Promise<T>,
): Promise<T> {
  const page = await browser.newPage({ viewport: { width: 1400, height: 2400 } });

  try {
    await page.goto(`${server.origin}${path}`, { waitUntil: "networkidle" });

    // The templates state their own metrics, but the harness must not measure a
    // fallback face while the local @font-face rules are still loading.
    //
    // `attached`, not the default `visible`: in paged mode the wrapper has no
    // box of its own until pagination has produced its first page, and waiting
    // for visibility there just times out.
    //
    // The flag only flips in an effect, so waiting for it is also the proof
    // that React hydrated. A server-rendered page looks entirely healthy to
    // every other check while no browser code has run on it at all.
    await page.waitForSelector('[data-parity-ready="1"]', {
      state: "attached",
      timeout: 30_000,
    });

    return await fn(page);
  } finally {
    await page.close();
  }
}

describe("resume preview and PDF lay out the same boxes", () => {
  it("S-035: measures every registered template", () => {
    expect(Object.keys(TEMPLATES).sort()).toEqual([...pdfTemplateIds].sort());
  });

  for (const paperSize of PAPER_SIZES) {
    for (const [templateId, layout] of Object.entries(TEMPLATES)) {
      for (const fixture of GEOMETRY_FIXTURES) {
        const name = `${templateId}/${fixture}/${paperSize}`;

        it(
          name,
          async () => {
            const resume = fixtureResume(fixture, templateId, paperSize);
            const shape = readResumeDocument(
              await layoutPages(await loadTemplatePdfComponentById(templateId), { resume }),
            );
            const pdfNodes = describeResumePdf(shape, layout);

            const webNodes = await measure(
              `/parity/resume/${templateId}?mode=raw&fixture=${fixture}&paper=${paperSize}`,
              async (page) => {
                await page.waitForSelector("#resume-container");

                return page.evaluate(measureResume, {
                  layout,
                  splitSections: splitSectionIndexes(shape),
                });
              },
            );

            const result = diffGeometry(webNodes, pdfNodes, TOLERANCE_PX);
            const report = formatDiffs(name, result);

            // Recorded before any assertion: console output is truncated long
            // before 24 reports fit in it, and a report written only on the happy
            // path tells you nothing about the run that failed.
            recordReport(`geometry ${name}`, report, {
              webNodes: webNodes.length,
              pdfNodes: pdfNodes.length,
              pdfPages: shape.pageCount,
              splitSections: splitSectionIndexes(shape).join("|") || "none",
            });

            expect(webNodes.length, "the preview rendered nothing").toBeGreaterThan(0);

            expect(report, report).toBe("");
          },
          180_000,
        );
      }
    }
  }
});

/** One page's signature as the browser drew it. */
function webSignatures(preview: {
  blocksPerPage: number[];
  texts: string[];
  firstTops: number[];
}): PageSignature[] {
  return preview.texts.map((text, index) => ({
    blocks: preview.blocksPerPage[index] ?? 0,
    ...pageTextKey(text),
    firstTop: preview.firstTops[index] ?? -1,
  }));
}

/**
 * Every page where the two disagree on what the page carries: how many blocks, and the
 * text it opens and closes with. Exact — a page that ends one line earlier in one engine
 * ends with different text, and that is the difference the owner sees.
 */
function diffSignatures(web: PageSignature[], pdf: PageSignature[]): string {
  const lines: string[] = [];

  if (web.length !== pdf.length) lines.push(`pages: web ${web.length} vs pdf ${pdf.length}`);

  for (let index = 0; index < Math.min(web.length, pdf.length); index += 1) {
    const a = web[index];
    const b = pdf[index];

    if (a.blocks !== b.blocks) {
      lines.push(`page ${index + 1} blocks: web ${a.blocks} vs pdf ${b.blocks}`);
    }
    if (a.first !== b.first) {
      lines.push(`page ${index + 1} opens: web "${a.first}" vs pdf "${b.first}"`);
    }
    if (a.last !== b.last) {
      lines.push(`page ${index + 1} closes: web "${a.last}" vs pdf "${b.last}"`);
    }
    // Half a pixel, the box comparison's tolerance: below it the engines are rounding.
    if (Math.abs(a.firstTop - b.firstTop) > 0.5) {
      lines.push(`page ${index + 1} text starts: web ${a.firstTop}px vs pdf ${b.firstTop}px`);
    }
  }

  return lines.join("\n");
}

/*
 * No page split is excused either. The overflow fixture (a 1,500-word paragraph) used to
 * set the same number of lines per page with different words on them — Knuth–Plass
 * balances a paragraph, the browser fills each line first — and the preview kept a line
 * on the page whenever its glyphs, not its line box, ended above the foot, and had no
 * widows/orphans rule (`features/resume/editor/ResumePagedPreview.tsx`).
 */

async function pdfPagesFor(templateId: string, fixture: string, paperSize: PaperSize) {
  const resume = fixtureResume(fixture, templateId, paperSize);
  const pages = await layoutPages(await loadTemplatePdfComponentById(templateId), { resume });

  return { pages, shape: readResumeDocument(pages), signatures: pdfPageSignatures(pages) };
}

describe("resume preview and PDF break pages at the same place", () => {
  for (const paperSize of PAPER_SIZES) {
    for (const templateId of Object.keys(TEMPLATES)) {
      for (const fixture of MEASURABLE_FIXTURES) {
        const name = `${templateId}/${fixture}/${paperSize}`;

        it(
          name,
          async () => {
            const { widthPx, heightPx } = getPageGeometry(paperSize);
            const { shape, signatures } = await pdfPagesFor(templateId, fixture, paperSize);

            const { preview, html } = await measure(
              `/parity/resume/${templateId}?mode=paged&fixture=${fixture}&paper=${paperSize}`,
              async (page) => {
                await page.waitForSelector("article.resume-page-preview");
                const measured = await page.evaluate(
                  measurePagination,
                  "#parity-preview article.resume-page-preview",
                );
                const exported = await downloadText(page, () =>
                  page.click("[data-parity-export-html]"),
                );

                return { preview: measured, html: exported };
              },
            );

            const report = diffSignatures(webSignatures(preview), signatures);
            const printed = await printHtml(browser, html);

            recordReport(`pagination ${name}`, report, {
              preview: preview.pages,
              pdf: shape.pageCount,
              html: printed.pages,
              blocks: `${preview.blocksPerPage.join("/")} vs ${shape.blocksPerPage.join("/")}`,
              tops: `${preview.firstTops.join("/")} vs ${signatures.map((s) => s.firstTop).join("/")}`,
            });

            expect(preview.pages, `${name}: ${report}`).toBe(shape.pageCount);
            expect(report, report).toBe("");

            // A block taller than a page flows on; the page must not cut it off.
            expect(preview.clippedPages, `${name}: clipped preview pages`).toEqual([]);
            // Both draw the paper the resume asks for.
            expect(preview.boxes, `${name}: preview page boxes`).toEqual(
              preview.boxes.map(() => ({ width: widthPx, height: heightPx })),
            );
            expect(shape.pageBox.width, `${name}: pdf page width`).toBeCloseTo(widthPx, 1);
            expect(shape.pageBox.height, `${name}: pdf page height`).toBeCloseTo(heightPx, 1);

            // The editor's "Export → HTML", printed, comes out as the same sheets.
            expectPrintedSheets(printed, preview.pages, paperSize, `${name}: printed HTML export`);
          },
          180_000,
        );
      }
    }
  }
});

describe("the public share page shows the PDF's pages", () => {
  for (const paperSize of PAPER_SIZES) {
    for (const templateId of Object.keys(TEMPLATES)) {
      for (const fixture of MEASURABLE_FIXTURES) {
        const name = `${templateId}/${fixture}/${paperSize}`;

        it(
          name,
          async () => {
            const { widthPx, heightPx } = getPageGeometry(paperSize);
            const { shape, signatures } = await pdfPagesFor(templateId, fixture, paperSize);

            const { preview, html } = await measure(
              `/parity/resume/${templateId}?mode=share&fixture=${fixture}&paper=${paperSize}`,
              async (page) => {
                const selector = "#share-preview article.resume-page-preview";

                await page.waitForSelector(selector);
                const measured = await page.evaluate(measurePagination, selector);
                const exported = await downloadText(page, async () => {
                  await page.getByRole("button", { name: /download/i }).click();
                  await page.getByRole("menuitem", { name: /html/i }).click();
                });

                return { preview: measured, html: exported };
              },
            );

            const report = diffSignatures(webSignatures(preview), signatures);
            const printed = await printHtml(browser, html);

            recordReport(`share ${name}`, report, {
              share: preview.pages,
              pdf: shape.pageCount,
              html: printed.pages,
            });

            expect(preview.pages, `${name}: ${report}`).toBe(shape.pageCount);
            expect(report, report).toBe("");

            expect(preview.boxes, `${name}: share page boxes`).toEqual(
              preview.boxes.map(() => ({ width: widthPx, height: heightPx })),
            );
            expect(preview.clippedPages, `${name}: clipped share pages`).toEqual([]);
            expectPrintedSheets(printed, preview.pages, paperSize, `${name}: printed share HTML`);
          },
          180_000,
        );
      }
    }
  }
});

describe("no section heading is stranded by a page break", () => {
  for (const paperSize of PAPER_SIZES) {
    for (const templateId of Object.keys(TEMPLATES)) {
      for (const fixture of MEASURABLE_FIXTURES) {
        it(`${templateId}/${fixture}/${paperSize}`, async () => {
          const resume = fixtureResume(fixture, templateId, paperSize);
          const shape = readResumeDocument(
            await layoutPages(await loadTemplatePdfComponentById(templateId), { resume }),
          );

          // A section that breaks immediately after its heading leaves the title
          // alone at the foot of a page, and react-pdf squeezes the heading box
          // into whatever space is left rather than moving it.
          const stranded = shape.sections
            .map((section, index) => ({ section, index }))
            .filter(({ section }) => section.partCount > 1 && section.strandedHeading)
            .map(({ index }) => `section[${index}]`);

          expect(stranded, `${templateId}/${fixture}: ${stranded.join(", ")}`).toEqual([]);
        }, 180_000);
      }
    }
  }
});
