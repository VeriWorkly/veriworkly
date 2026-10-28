import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Browser } from "playwright";

import type { ParityServer } from "./server";
import type { LayoutNode } from "./pdf-layout";

import { PARITY_FIXTURE_IDS, PARITY_FIXTURES, type ParityFixtureId } from "./fixtures";
import { launchParityBrowser } from "./browser";
import { layoutPages, pageTextKey, pdfPageSignatures } from "./pdf-layout";
import { expectPrintedSheets, printHtml } from "./print-html";
import { recordReport } from "./report";
import { startParityServer } from "./server";
import { ptToPx } from "./geometry";

import type { CoverLetterContent } from "@/features/cover-letter/types";

import { PAPER_SIZES, getPageGeometry, type PaperSize } from "@/templates/shared/page-geometry";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";
import { buildCoverLetterHtml } from "@/templates/cover-letter/web";

/**
 * The PDF flows the letter and the preview replays react-pdf's page breaks, so the
 * thing that must agree is the page split. These tests compare
 * the preview's pages with the exported ones and fail when either the count or
 * the page box differs — and when the export drops content off the bottom.
 */

const TEMPLATES = coverLetterTemplateRegistry.ids;

/** CJK cannot be set in the PDF at all; see `tests/contracts/font-coverage.contract.test.ts`. */
// The date-format, renamed-heading, custom-section and overflow fixtures are resume-only;
// their cover letter is the default one.
const LETTER_FIXTURES: ParityFixtureId[] = ["default", "short", "long", "dense", "spill", "rtl"];
const MEASURABLE_FIXTURES = PARITY_FIXTURE_IDS.filter((id) => LETTER_FIXTURES.includes(id));

/*
 * No split is excused. The page split agrees by construction: the PDF is one flowing page
 * that react-pdf breaks, and the preview replays react-pdf's breaking rules against
 * measured boxes (`templates/cover-letter/measure.ts`). The lines inside each paragraph
 * agree because the PDF breaks them by the browser's rules (`templates/pdf/line-breaks.ts`).
 * Before that, textkit's Knuth–Plass breaker kept the 659px sample bullet on one line of a
 * 650px column by shrinking its spaces, and never broke after a hyphen, so the long letter
 * was one page in the PDF and two in the preview.
 */

/** A fixture's letter, on the given paper. */
function fixtureLetter(fixture: string, paperSize: PaperSize): CoverLetterContent {
  const content = PARITY_FIXTURES[fixture as ParityFixtureId].coverLetter();

  return { ...content, appearance: { ...content.appearance, paperSize } };
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

interface PreviewPages {
  pages: number;
  /** Each page's opening and closing text, normalized by `pageTextKey`. */
  texts: { first: string; last: string }[];
  boxes: { width: number; height: number }[];
  /** Pages whose content is taller than the page box, i.e. visibly clipped. */
  overflowing: number[];
}

async function readPreview(
  templateId: string,
  fixture: string,
  paperSize: PaperSize,
): Promise<PreviewPages> {
  const page = await browser.newPage({ viewport: { width: 1400, height: 2400 } });

  try {
    await page.goto(
      `${server.origin}/parity/cover-letter/${templateId}?fixture=${fixture}&paper=${paperSize}`,
      { waitUntil: "networkidle" },
    );
    await page.waitForSelector('[data-parity-ready="1"]', { timeout: 60_000 });
    await page.waitForSelector("article.shadow-sm", { timeout: 60_000 });

    const measured = await page.evaluate(() => {
      // The measurement probe is `aria-hidden`; the rendered pages carry the
      // preview's ring/shadow classes.
      const articles = Array.from(document.querySelectorAll("article.shadow-sm")) as HTMLElement[];

      return {
        pages: articles.length,
        texts: articles.map((article) => article.textContent ?? ""),
        boxes: articles.map((article) => {
          const rect = article.getBoundingClientRect();
          return { width: Number(rect.width.toFixed(3)), height: Number(rect.height.toFixed(3)) };
        }),
        overflowing: articles.flatMap((article, index) =>
          article.scrollHeight > article.clientHeight + 1 ? [index] : [],
        ),
      };
    });

    return { ...measured, texts: measured.texts.map(pageTextKey) };
  } finally {
    await page.close();
  }
}

/** Every page whose opening or closing text differs between the preview and the PDF. */
function diffPageTexts(preview: PreviewPages, pdf: { first: string; last: string }[]): string {
  const lines: string[] = [];

  if (preview.pages !== pdf.length) lines.push(`pages: web ${preview.pages} vs pdf ${pdf.length}`);

  preview.texts.slice(0, pdf.length).forEach((web, index) => {
    if (web.first !== pdf[index].first) {
      lines.push(`page ${index + 1} opens: web "${web.first}" vs pdf "${pdf[index].first}"`);
    }
    if (web.last !== pdf[index].last) {
      lines.push(`page ${index + 1} closes: web "${web.last}" vs pdf "${pdf[index].last}"`);
    }
  });

  return lines.join("\n");
}

/** Deepest content bottom on a page, in CSS pixels from the page top. */
function contentBottom(node: LayoutNode, offset = 0): number {
  const top = offset + ptToPx(node.box?.top);
  const bottom = top + ptToPx(node.box?.height);

  return (node.children ?? []).reduce(
    (deepest, child) => Math.max(deepest, contentBottom(child, top)),
    bottom,
  );
}

describe("cover letter preview and PDF produce the same pages", () => {
  for (const paperSize of PAPER_SIZES) {
    for (const templateId of TEMPLATES) {
      for (const fixture of MEASURABLE_FIXTURES) {
        const name = `${templateId}/${fixture}/${paperSize}`;

        it(
          name,
          async () => {
            const content = fixtureLetter(fixture, paperSize);
            const { widthPx, heightPx } = getPageGeometry(paperSize);
            const CoverLetterPdf = await coverLetterTemplateRegistry.loadPdf(templateId);
            const pdfPages = await layoutPages(CoverLetterPdf, { content });
            const preview = await readPreview(templateId, fixture, paperSize);

            const pdfTexts = pdfPageSignatures(pdfPages).map(({ first, last }) => ({
              first,
              last,
            }));
            const report = diffPageTexts(preview, pdfTexts);
            const printed = await printHtml(
              browser,
              await buildCoverLetterHtml(content, templateId),
            );

            recordReport(`cover letter pagination ${name}`, report, {
              preview: preview.pages,
              pdf: pdfPages.length,
              html: printed.pages,
            });

            expect(
              preview.pages,
              `${name}: preview shows ${preview.pages} page(s), ` +
                `the PDF exports ${pdfPages.length}`,
            ).toBe(pdfPages.length);
            // Each page opens and closes on the same words: the break is in the same place.
            expect(report, report).toBe("");
            // The letter's own HTML download, printed, comes out as the same sheets.
            expectPrintedSheets(printed, pdfPages.length, paperSize, `${name}: printed HTML`);

            for (const box of preview.boxes) {
              expect(box.width).toBeCloseTo(widthPx, 1);
              expect(box.height).toBeCloseTo(heightPx, 1);
            }

            for (const page of pdfPages) {
              expect(ptToPx(page.box?.width)).toBeCloseTo(widthPx, 1);
              expect(ptToPx(page.box?.height)).toBeCloseTo(heightPx, 1);
            }
          },
          180_000,
        );
      }
    }
  }
});

describe("neither renderer drops cover letter content off the page", () => {
  for (const paperSize of PAPER_SIZES) {
    for (const templateId of TEMPLATES) {
      for (const fixture of MEASURABLE_FIXTURES) {
        const name = `${templateId}/${fixture}/${paperSize}`;

        it(
          name,
          async () => {
            const content = fixtureLetter(fixture, paperSize);
            const CoverLetterPdf = await coverLetterTemplateRegistry.loadPdf(templateId);
            const pdfPages = await layoutPages(CoverLetterPdf, { content });

            // A page that does not wrap silently clips whatever the split put past
            // its bottom edge, so the content is not merely misplaced — it is gone.
            const clipped = pdfPages.flatMap((page, index) => {
              const limit = ptToPx(page.box?.height);
              const deepest = contentBottom(page);

              return deepest > limit + 1
                ? [`page ${index + 1}: content reaches ${deepest}px of ${limit}px`]
                : [];
            });

            expect(clipped, `${name}: ${clipped.join("; ")}`).toEqual([]);

            const preview = await readPreview(templateId, fixture, paperSize);

            expect(
              preview.overflowing,
              `${name}: preview page(s) ${preview.overflowing.join(", ")} overflow`,
            ).toEqual([]);
          },
          180_000,
        );
      }
    }
  }
});
