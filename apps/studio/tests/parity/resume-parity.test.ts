import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Browser } from "playwright";

import type { ParityServer } from "./server";

import { PARITY_FIXTURE_IDS, PARITY_FIXTURES, type ParityFixtureId } from "./fixtures";
import { diffGeometry, formatDiffs } from "./geometry";
import { launchParityBrowser } from "./browser";
import {
  describeResumePdf,
  layoutPages,
  readResumeDocument,
  splitSectionIndexes,
} from "./pdf-layout";
import { measurePagination, measureResume } from "./web-measure";
import { recordReport } from "./report";
import { startParityServer } from "./server";

import { loadTemplatePdfComponentById } from "@/templates/resume/pdf";

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

/**
 * Cases where the two engines break a line in different places, for reasons no
 * template can reach.
 *
 * `@react-pdf/textkit` runs its line breaker with
 * `shrinkWhitespaceFactor: { before: -0.5, after: -0.5 }`: it may compress the
 * spaces on a line by up to half their width to avoid a break. CSS has no such
 * behaviour. A paragraph whose natural width lands within (spaces x half a
 * space) of its column therefore fits on one line in the PDF and wraps in the
 * preview — 595.79px of text in a 590px column, 712.42px in a 710px column.
 *
 * These are recorded rather than tolerated silently: anything that is not on
 * this list still fails, and each entry names what makes it unreachable.
 */
const KNOWN_ENGINE_DIFFERENCES: Record<string, string> = {
  "timeline-focus/default":
    "experience bullet 4 measures 595.79px in a 590px column; textkit shrinks its 13 spaces to fit",
  "timeline-focus/spill": "the same bullet as timeline-focus/default, in the same 590px column",
  "executive-clarity/dense":
    "project bullets measure 712.42px in a 710px column; textkit shrinks their spaces to fit",
};

/**
 * CJK is checked by `tests/contracts/font-coverage.contract.test.ts` instead.
 * No embedded family has a single CJK glyph, so the PDF cannot set that text at
 * all — the characters draw as zero-width blanks, the document comes out
 * shorter, and both a box comparison and a page count here would do nothing but
 * restate that one fact.
 */
const MEASURABLE_FIXTURES = PARITY_FIXTURE_IDS.filter((id) => id !== "cjk");

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
  for (const [templateId, layout] of Object.entries(TEMPLATES)) {
    for (const fixture of MEASURABLE_FIXTURES) {
      it(`${templateId} / ${fixture}`, async () => {
        const resume = { ...PARITY_FIXTURES[fixture as ParityFixtureId].resume(), templateId };
        const shape = readResumeDocument(
          await layoutPages(await loadTemplatePdfComponentById(templateId), { resume }),
        );
        const pdfNodes = describeResumePdf(shape, layout);

        const webNodes = await measure(
          `/parity/resume/${templateId}?mode=raw&fixture=${fixture}`,
          async (page) => {
            await page.waitForSelector("#resume-container");

            return page.evaluate(measureResume, {
              layout,
              splitSections: splitSectionIndexes(shape),
            });
          },
        );

        const result = diffGeometry(webNodes, pdfNodes, TOLERANCE_PX);
        const report = formatDiffs(`${templateId}/${fixture}`, result);

        // Recorded before any assertion: console output is truncated long
        // before 24 reports fit in it, and a report written only on the happy
        // path tells you nothing about the run that failed.
        recordReport(`geometry ${templateId}/${fixture}`, report, {
          webNodes: webNodes.length,
          pdfNodes: pdfNodes.length,
          pdfPages: shape.pageCount,
          splitSections: splitSectionIndexes(shape).join("|") || "none",
        });

        expect(webNodes.length, "the preview rendered nothing").toBeGreaterThan(0);

        const known = KNOWN_ENGINE_DIFFERENCES[`${templateId}/${fixture}`];

        if (known) {
          // Still asserted, just the other way round: if this ever comes out
          // clean the entry is stale and should be deleted.
          expect(report, `${templateId}/${fixture} no longer differs — ${known}`).not.toBe("");
          return;
        }

        expect(report, report).toBe("");
      }, 180_000);
    }
  }
});

describe("resume preview and PDF break pages at the same place", () => {
  for (const templateId of Object.keys(TEMPLATES)) {
    for (const fixture of MEASURABLE_FIXTURES) {
      it(`${templateId} / ${fixture}`, async () => {
        const resume = { ...PARITY_FIXTURES[fixture as ParityFixtureId].resume(), templateId };
        const shape = readResumeDocument(
          await layoutPages(await loadTemplatePdfComponentById(templateId), { resume }),
        );

        const preview = await measure(
          `/parity/resume/${templateId}?mode=paged&fixture=${fixture}`,
          async (page) => {
            await page.waitForSelector("article.resume-page-preview");
            return page.evaluate(measurePagination);
          },
        );

        const message =
          `preview ${preview.pages} page(s) [${preview.blocksPerPage.join("/")}] vs ` +
          `pdf ${shape.pageCount} [${shape.blocksPerPage.join("/")}]`;

        recordReport(
          `pagination ${templateId}/${fixture}`,
          preview.pages === shape.pageCount ? "" : message,
          { preview: preview.pages, pdf: shape.pageCount },
        );

        expect(preview.pages, `${templateId}/${fixture}: ${message}`).toBe(shape.pageCount);
      }, 180_000);
    }
  }
});

describe("no section heading is stranded by a page break", () => {
  for (const templateId of Object.keys(TEMPLATES)) {
    for (const fixture of MEASURABLE_FIXTURES) {
      it(`${templateId} / ${fixture}`, async () => {
        const resume = { ...PARITY_FIXTURES[fixture as ParityFixtureId].resume(), templateId };
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
});
