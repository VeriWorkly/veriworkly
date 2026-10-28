import { expect } from "vitest";

import type { Browser, Page } from "playwright";

import { ptToPx } from "./geometry";

import { getPageGeometry, type PaperSize } from "@/templates/shared/page-geometry";

export interface PrintedPages {
  pages: number;
  /** The first sheet's size, in CSS pixels. */
  width: number;
  height: number;
}

/**
 * Prints an exported HTML file the way a reader's Chrome prints it — `@page` decides the
 * sheet, backgrounds print — and reads back how many sheets came out and how big they are.
 *
 * Chrome writes every page object uncompressed (`/Type /Page` with its `/MediaBox`), so the
 * PDF is read with two regular expressions rather than a parser dependency.
 */
export async function printHtml(browser: Browser, html: string): Promise<PrintedPages> {
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));

    const pdf = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString(
      "latin1",
    );
    const box = pdf.match(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/);

    return {
      pages: pdf.match(/\/Type\s*\/Page(?![s\w])/g)?.length ?? 0,
      width: ptToPx(Number(box?.[1] ?? 0)),
      height: ptToPx(Number(box?.[2] ?? 0)),
    };
  } finally {
    await page.close();
  }
}

/**
 * The printed sheets match the PDF's pages in number and size. Chrome rounds a CSS `@page`
 * size to its own print units on the way into the PDF (794 x 1122 px comes out as
 * 794.56 x 1122.56), so the size is compared to the nearest pixel; the count is exact.
 */
export function expectPrintedSheets(
  printed: PrintedPages,
  pages: number,
  paperSize: PaperSize,
  label: string,
) {
  const { widthPx, heightPx } = getPageGeometry(paperSize);

  expect(printed.pages, `${label}: sheets`).toBe(pages);
  expect(Math.abs(printed.width - widthPx), `${label}: width ${printed.width}`).toBeLessThan(1);
  expect(Math.abs(printed.height - heightPx), `${label}: height ${printed.height}`).toBeLessThan(1);
}

/** Clicks whatever starts a download and returns the downloaded file's text. */
export async function downloadText(page: Page, start: () => Promise<void>): Promise<string> {
  const [download] = await Promise.all([page.waitForEvent("download"), start()]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];

  for await (const chunk of stream) chunks.push(chunk as Buffer);

  return Buffer.concat(chunks).toString("utf8");
}
