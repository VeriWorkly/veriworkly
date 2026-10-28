import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Browser, BrowserContext, Page } from "playwright";

import type { ParityServer } from "../parity/server";

import { PARITY_FIXTURES } from "../parity/fixtures";
import { launchParityBrowser } from "../parity/browser";
import { startParityServer } from "../parity/server";

import { screenshotFailures } from "./failure-screenshots";

/**
 * The public share page as a recruiter opens it, on the dev-only `/parity/share-page` harness:
 * the real route reads the link from the API, the harness builds the same payload from a
 * parity fixture and renders it the same way.
 */

const DESKTOP = { width: 1440, height: 900 };
const NAME = PARITY_FIXTURES.long.resume().basics.fullName;
const PATH = "/parity/share-page?fixture=long";

let server: ParityServer;
let browser: Browser;
let context: BrowserContext;
let page: Page;

screenshotFailures(() => page);

beforeAll(async () => {
  server = await startParityServer();
  browser = await launchParityBrowser();
  context = await browser.newContext({ viewport: DESKTOP });
});

afterAll(async () => {
  await browser?.close();
  await server?.stop();
});

/**
 * Where `NAME` is drawn in what the reader is shown (the export root: the pages, or the whole
 * resume until they exist), and whether anything around it hides it.
 */
async function nameOnScreen(target: Page) {
  const name = target.locator("[data-resume-pages]").getByText(NAME, { exact: true }).first();

  await name.waitFor({ state: "visible" });

  const box = await name.boundingBox();
  const hidden = await name.evaluate((element) =>
    Boolean(element.closest('[aria-hidden="true"], [inert]')),
  );

  return { box, hidden };
}

describe("the public share page", () => {
  it("shows the resume from the server's HTML, with none of the app's script loaded", async () => {
    // No bundle: nothing hydrates, no template is fetched, nothing is measured. What shows is
    // the server's HTML alone (and React's inline script that reveals a streamed page).
    const noBundle = await browser.newContext({ viewport: DESKTOP });
    await noBundle.route("**/_next/static/**/*.js", (route) => route.abort());
    const bare = await noBundle.newPage();

    try {
      await bare.goto(`${server.origin}${PATH}`, { waitUntil: "load" });

      expect(await bare.getByText("Loading resume").count()).toBe(0);
      expect(await bare.locator("article.resume-page-preview").count()).toBe(0);

      const { box, hidden } = await nameOnScreen(bare);

      expect(hidden).toBe(false);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(DESKTOP.width);
    } finally {
      await noBundle.close();
    }
  });

  it("then cuts it into pages, and the measuring copy leaves the screen", async () => {
    page = await context.newPage();
    await page.goto(`${server.origin}${PATH}`, { waitUntil: "networkidle" });

    const pages = page.locator("[data-resume-pages] > article.resume-page-preview");

    await expect.poll(() => pages.count()).toBeGreaterThan(1);

    const { hidden } = await nameOnScreen(page);

    expect(hidden).toBe(false);
    // The whole copy is still there to measure against, out of sight and out of reach.
    expect(
      await page.evaluate(() => {
        const copy = document.querySelector("[data-export-exclude]");
        return copy?.getAttribute("aria-hidden") === "true" && copy.hasAttribute("inert");
      }),
    ).toBe(true);
  });

  it("printed, puts each preview page on one sheet of its paper, with no page chrome", async () => {
    const sheets = await page.locator("[data-resume-pages] > article").count();
    const pdf = (await page.pdf({ preferCSSPageSize: true })).toString("latin1");

    expect(pdf.match(/\/Type\s*\/Page[^s]/g)?.length).toBe(sheets);
    // A4 is 794 x 1122 CSS px: 595.5 x 841.5 pt.
    expect(pdf).toMatch(/\/MediaBox\s*\[\s*0 0 595\.\d+ 841\.\d+\s*\]/);

    await page.emulateMedia({ media: "print" });

    try {
      expect(await page.locator("header[data-share-chrome]").isVisible()).toBe(false);
      expect(
        await page.evaluate(
          () => getComputedStyle(document.querySelector("[data-resume-pages]")!).rowGap,
        ),
      ).toBe("0px");
    } finally {
      await page.emulateMedia({ media: "screen" });
    }
  });

  it("falls back to the whole resume when measuring fails, instead of an error page", async () => {
    const failing = await context.newPage();
    const errors: string[] = [];

    failing.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    // The measuring pass finds the template's container first: make that lookup throw.
    await failing.addInitScript(() => {
      const querySelector = Element.prototype.querySelector;

      Element.prototype.querySelector = function (this: Element, selectors: string) {
        if (selectors === "#resume-container") throw new Error("measuring failed (test)");
        return querySelector.call(this, selectors);
      } as typeof Element.prototype.querySelector;
    });

    try {
      await failing.goto(`${server.origin}${PATH}`, { waitUntil: "networkidle" });

      await expect
        .poll(() => errors.some((text) => text.includes("could not be paginated")))
        .toBe(true);

      expect(await failing.locator("article.resume-page-preview").count()).toBe(0);
      expect(await failing.getByText(/could not be displayed|something went wrong/i).count()).toBe(
        0,
      );

      const { hidden } = await nameOnScreen(failing);

      expect(hidden).toBe(false);
      // What a download or a print takes is that same whole resume.
      expect(
        await failing.evaluate(
          (name) => document.querySelector("[data-resume-pages]")?.textContent?.includes(name),
          NAME,
        ),
      ).toBe(true);
    } finally {
      await failing.close();
    }
  });
});
