import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Browser } from "playwright";

import type { ParityServer } from "./server";
import type { LayoutNode } from "./pdf-layout";

import { PARITY_FIXTURE_IDS, PARITY_FIXTURES, type ParityFixtureId } from "./fixtures";
import { launchParityBrowser } from "./browser";
import { layoutPages } from "./pdf-layout";
import { recordReport } from "./report";
import { startParityServer } from "./server";
import { ptToPx } from "./geometry";

import type { CoverLetterContent } from "@/features/cover-letter/types";

import { PAPER_SIZES, getPageGeometry, type PaperSize } from "@/templates/shared/page-geometry";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";

/**
 * The PDF flows the letter and the preview replays react-pdf's page breaks, so the
 * thing that must agree is the page split. These tests compare
 * the preview's pages with the exported ones and fail when either the count or
 * the page box differs — and when the export drops content off the bottom.
 */

const TEMPLATES = coverLetterTemplateRegistry.ids;

/** CJK cannot be set in the PDF at all; see `tests/contracts/font-coverage.contract.test.ts`. */
// `overflow` is a resume fixture; its cover letter is the default one.
const MEASURABLE_FIXTURES = PARITY_FIXTURE_IDS.filter((id) => id !== "cjk" && id !== "overflow");

/**
 * Splits the two renderers are known to disagree on, and why. Asserted in reverse, so an
 * entry cannot outlive its cause.
 *
 * The page split itself agrees by construction: the PDF is one flowing page that
 * react-pdf breaks, and the preview replays react-pdf's breaking rules against measured
 * boxes (`templates/cover-letter/measure.ts`). What still differs is how the two engines
 * break a paragraph into *lines*, and on the long fixture that moves the P.S. across the
 * page foot:
 *
 * - textkit breaks lines with Knuth–Plass and may shrink spaces by a third, so the sample
 *   bullet "Built React and TypeScript document workflows…" (659px of text in a 650px
 *   column) stays on one line in the PDF and wraps in the browser (+22.5px);
 * - Professional only: the 87-character website. Both engines may now break it anywhere
 *   (S-298), but the browser still prefers its hyphens and takes 4 lines in the 230px
 *   column, where the PDF fills each line to the last character and takes 3 (+21px).
 *
 * ATS Essential differs by the bullet alone. Neither cause is the "-" textkit prints at a
 * forced break (S-104/S-297, see `templates/pdf/fonts.ts`); that one is visible, not
 * vertical.
 */
const KNOWN_PAGINATION_DIFFERENCES: Record<string, string> = {
  "professional/long/a4": "textkit shrinks spaces and fills URL lines; preview wraps 2 more lines",
  "ats-essential/long/a4": "textkit shrinks spaces; the browser wraps one bullet the PDF does not",
};

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

    return page.evaluate(() => {
      // The measurement probe is `aria-hidden`; the rendered pages carry the
      // preview's ring/shadow classes.
      const articles = Array.from(document.querySelectorAll("article.shadow-sm")) as HTMLElement[];

      return {
        pages: articles.length,
        boxes: articles.map((article) => {
          const rect = article.getBoundingClientRect();
          return { width: Number(rect.width.toFixed(3)), height: Number(rect.height.toFixed(3)) };
        }),
        overflowing: articles.flatMap((article, index) =>
          article.scrollHeight > article.clientHeight + 1 ? [index] : [],
        ),
      };
    });
  } finally {
    await page.close();
  }
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

            const known = KNOWN_PAGINATION_DIFFERENCES[name];

            recordReport(
              `cover letter pagination ${name}`,
              preview.pages === pdfPages.length
                ? ""
                : `preview ${preview.pages} page(s) vs pdf ${pdfPages.length}`,
              { preview: preview.pages, pdf: pdfPages.length, known: Boolean(known) },
            );

            if (known) {
              // Asserted in reverse, so the entry cannot outlive the problem.
              expect(preview.pages, `${name} now agrees — drop this entry (${known})`).not.toBe(
                pdfPages.length,
              );
            } else {
              expect(
                preview.pages,
                `${name}: preview shows ${preview.pages} page(s), ` +
                  `the PDF exports ${pdfPages.length}`,
              ).toBe(pdfPages.length);
            }

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
