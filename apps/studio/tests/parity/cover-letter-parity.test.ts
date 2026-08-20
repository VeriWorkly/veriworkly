import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Browser } from "playwright";

import type { ParityServer } from "./server";
import type { LayoutNode } from "./pdf-layout";

import { PARITY_FIXTURE_IDS, PARITY_FIXTURES, type ParityFixtureId } from "./fixtures";
import { launchParityBrowser } from "./browser";
import { layoutPages } from "./pdf-layout";
import { startParityServer } from "./server";
import { ptToPx } from "./geometry";

import { COVER_LETTER_SCALE } from "@/templates/cover-letter/tokens";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";

/**
 * Cover letters paginate themselves rather than letting one engine flow the
 * content, so the thing that must agree is the page split. These tests compare
 * the preview's pages with the exported ones and fail when either the count or
 * the page box differs — and when the export drops content off the bottom.
 */

const TEMPLATES = [
  "professional",
  "veriworkly-special",
  "minimalist",
  "executive",
  "ats-essential",
] as const;

/** CJK cannot be set in the PDF at all; see `tests/contracts/font-coverage.contract.test.ts`. */
const MEASURABLE_FIXTURES = PARITY_FIXTURE_IDS.filter((id) => id !== "cjk");

/**
 * Splits the two renderers are known to disagree on, and why.
 *
 * Unlike the resume — where both sides fill a page until the next block no
 * longer fits — the VeriWorkly cover letter paginates twice over, with two
 * different algorithms:
 *
 *   preview  templates/cover-letter/veriworkly/web.tsx  paginateIncremental
 *   PDF      templates/cover-letter/veriworkly/pdf.tsx  paginateWeightedItems
 *   HTML     the same file, different page limits again
 *
 * `paginateIncremental` reads real boxes out of a hidden probe.
 * `paginateWeightedItems` estimates from character counts
 * (`Math.ceil(text.length / 82)` and friends) against a flat budget of 24 units
 * a page. The estimate is deliberately conservative, so on dense copy it starts
 * a page early and the export runs longer than the preview.
 *
 * Closing this needs the export to use the measured split — it runs in the
 * browser, so it can — rather than tuning the estimate, which can only ever be
 * approximately right. Recorded here so the gap is tracked and any *new*
 * disagreement still fails.
 */
const KNOWN_PAGINATION_DIFFERENCES: Record<string, string> = {
  "veriworkly-special/dense":
    "preview measures 2 pages; the PDF's character-count estimate reserves 3",
};

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

async function readPreview(templateId: string, fixture: string): Promise<PreviewPages> {
  const page = await browser.newPage({ viewport: { width: 1400, height: 2400 } });

  try {
    await page.goto(`${server.origin}/parity/cover-letter/${templateId}?fixture=${fixture}`, {
      waitUntil: "networkidle",
    });
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
  for (const templateId of TEMPLATES) {
    for (const fixture of MEASURABLE_FIXTURES) {
      it(`${templateId} / ${fixture}`, async () => {
        const content = PARITY_FIXTURES[fixture as ParityFixtureId].coverLetter();
        const CoverLetterPdf = await coverLetterTemplateRegistry.loadPdf(templateId);
        const pdfPages = await layoutPages(CoverLetterPdf, { content });
        const preview = await readPreview(templateId, fixture);

        const known = KNOWN_PAGINATION_DIFFERENCES[`${templateId}/${fixture}`];

        if (known) {
          // Asserted in reverse, so the entry cannot outlive the problem.
          expect(
            preview.pages,
            `${templateId}/${fixture} now agrees — drop this entry (${known})`,
          ).not.toBe(pdfPages.length);
        } else {
          expect(
            preview.pages,
            `${templateId}/${fixture}: preview shows ${preview.pages} page(s), ` +
              `the PDF exports ${pdfPages.length}`,
          ).toBe(pdfPages.length);
        }

        for (const box of preview.boxes) {
          expect(box.width).toBeCloseTo(COVER_LETTER_SCALE.pageWidth, 1);
          expect(box.height).toBeCloseTo(COVER_LETTER_SCALE.pageHeight, 1);
        }

        for (const page of pdfPages) {
          expect(ptToPx(page.box?.width)).toBeCloseTo(COVER_LETTER_SCALE.pageWidth, 1);
          expect(ptToPx(page.box?.height)).toBeCloseTo(COVER_LETTER_SCALE.pageHeight, 1);
        }
      }, 180_000);
    }
  }
});

describe("neither renderer drops cover letter content off the page", () => {
  for (const templateId of TEMPLATES) {
    for (const fixture of MEASURABLE_FIXTURES) {
      it(`${templateId} / ${fixture}`, async () => {
        const content = PARITY_FIXTURES[fixture as ParityFixtureId].coverLetter();
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

        expect(clipped, `${templateId}/${fixture}: ${clipped.join("; ")}`).toEqual([]);

        const preview = await readPreview(templateId, fixture);

        expect(
          preview.overflowing,
          `${templateId}/${fixture}: preview page(s) ${preview.overflowing.join(", ")} overflow`,
        ).toEqual([]);
      }, 180_000);
    }
  }
});
