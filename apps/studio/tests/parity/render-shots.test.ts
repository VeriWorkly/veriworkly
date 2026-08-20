import { mkdirSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { pdf } from "@react-pdf/renderer";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Browser } from "playwright";
import type { ParityServer } from "./server";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { PARITY_FIXTURES } from "./fixtures";
import { launchParityBrowser } from "./browser";
import { registerParityFonts } from "./pdf-layout";
import { startParityServer } from "./server";
import { loadTemplatePdfComponentById, pdfTemplateIds } from "@/templates/resume/pdf";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";

const OUT = path.join(process.cwd(), "tests", "parity", "shots");

let server: ParityServer;
let browser: Browser;

beforeAll(async () => {
  mkdirSync(OUT, { recursive: true });
  server = await startParityServer();
  browser = await launchParityBrowser();
}, 300_000);

afterAll(async () => {
  await browser?.close();
  await server?.stop();
});

async function writePdf(name: string, element: React.ReactElement) {
  registerParityFonts();

  const stream = await pdf(element as never).toBuffer();
  const chunks: Buffer[] = [];
  for await (const chunk of stream as unknown as AsyncIterable<Buffer>) chunks.push(chunk);

  const file = path.join(OUT, `${name}.pdf`);
  writeFileSync(file, Buffer.concat(chunks));
  return file;
}

async function shootPdf(name: string, file: string, pages: number) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1320 } });

  // Chrome's built-in viewer, scrolled a page at a time.
  await page.goto(`${pathToFileURL(file).href}#zoom=page-fit`);
  await page.waitForTimeout(6000);

  for (let i = 0; i < pages; i += 1) {
    if (i > 0) {
      await page.keyboard.press("PageDown");
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: path.join(OUT, `${name}-pdf-p${i + 1}.png`) });
  }

  await page.close();
}

async function shootWeb(name: string, url: string, selector: string) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1320 } });

  await page.goto(`${server.origin}${url}`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-parity-ready="1"]', { state: "attached", timeout: 60_000 });
  await page.waitForSelector(selector, { timeout: 60_000 });
  await page.waitForTimeout(800);

  const nodes = await page.locator(selector).all();

  for (const [i, node] of nodes.entries()) {
    await node.screenshot({ path: path.join(OUT, `${name}-web-p${i + 1}.png`) });
  }

  await page.close();
  return nodes.length;
}

const FIXTURE = (process.env.SHOT_FIXTURE ?? "default") as "default";

// Opt-in: `SHOT=1 npm run test:parity` writes preview and export images to
// `tests/parity/shots/` so a human can compare them. It asserts nothing —
// looking at the pages is the point.
describe.skipIf(!process.env.SHOT)("shots", () => {
  for (const templateId of pdfTemplateIds) {
    it(`resume ${templateId}`, async () => {
      const resume = { ...PARITY_FIXTURES[FIXTURE].resume(), templateId };
      const name = `resume-${templateId}`;
      const TemplatePdf = await loadTemplatePdfComponentById(templateId);
      const file = await writePdf(name, createElement(TemplatePdf, { resume }));

      const pages = await shootWeb(
        name,
        `/parity/resume/${templateId}?mode=paged&fixture=${FIXTURE}`,
        "article.resume-page-preview",
      );
      await shootPdf(name, file, pages);

      expect(pages).toBeGreaterThan(0);
    }, 180_000);
  }

  for (const templateId of [
    "professional",
    "veriworkly-special",
    "minimalist",
    "executive",
    "ats-essential",
  ]) {
    it(`cover letter ${templateId}`, async () => {
      const content = PARITY_FIXTURES[FIXTURE].coverLetter() as CoverLetterContent;
      const name = `cl-${templateId}`;
      const CoverLetterPdf = await coverLetterTemplateRegistry.loadPdf(templateId);
      const file = await writePdf(name, createElement(CoverLetterPdf, { content }));

      const pages = await shootWeb(
        name,
        `/parity/cover-letter/${templateId}?fixture=${FIXTURE}`,
        "article.shadow-sm",
      );
      await shootPdf(name, file, pages);

      expect(pages).toBeGreaterThan(0);
    }, 180_000);
  }
});
