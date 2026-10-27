import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Browser, BrowserContext, Page } from "playwright";

import type { ParityServer } from "../parity/server";

import { launchParityBrowser } from "../parity/browser";
import { startParityServer } from "../parity/server";

/**
 * A new user's first minutes, mostly on a phone: the editor shows the document its URL names
 * (never the previous one), the page fits the screen, and creating a document makes one.
 *
 * Guest mode throughout, so every document lives in this browser's local storage.
 */

const PHONE = { width: 375, height: 812 };
const DESKTOP = { width: 1440, height: 900 };

let server: ParityServer;
let browser: Browser;
let context: BrowserContext;
let page: Page;

beforeAll(async () => {
  server = await startParityServer();
  browser = await launchParityBrowser();

  context = await browser.newContext({ viewport: DESKTOP });
  await context.addCookies([{ name: "veriworkly-guest-mode", value: "true", url: server.origin }]);

  page = await context.newPage();
});

afterAll(async () => {
  await browser?.close();
  await server?.stop();
});

async function clearStorage() {
  await page.goto(`${server.origin}/documents`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
}

async function createThroughApp(type: "resume" | "cover-letter"): Promise<string> {
  await page.goto(`${server.origin}/editor/${type}/new`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !location.pathname.endsWith("/new"));
  await page.waitForTimeout(1_000);

  return page.url().split("/").pop()!.split("?")[0];
}

/**
 * A guest may hold one letter, so the second is written into storage as a copy of the first
 * under a new id: the shape stays the app's own.
 */
async function storeLetterCopy(sourceId: string, id: string, title: string) {
  await page.evaluate(
    ({ sourceId, id, title }) => {
      const key = (docId: string) => `veriworkly:docs:v3:doc:cover_letter:${docId}`;
      const source = JSON.parse(localStorage.getItem(key(sourceId))!);

      localStorage.setItem(key(id), JSON.stringify({ ...source, id, title }));
    },
    { sourceId, id, title },
  );
}

async function retitleLetter(id: string, title: string) {
  await page.evaluate(
    ({ id, title }) => {
      const key = `veriworkly:docs:v3:doc:cover_letter:${id}`;
      const stored = JSON.parse(localStorage.getItem(key)!);

      localStorage.setItem(key, JSON.stringify({ ...stored, title }));
    },
    { id, title },
  );
}

/** Client-side navigation, the way a link inside the app moves between editors. */
async function clientNavigate(path: string) {
  await page.evaluate((target) => {
    (window as unknown as { next: { router: { push: (href: string) => void } } }).next.router.push(
      target,
    );
  }, path);
}

function countStored(type: "resume" | "cover_letter"): Promise<number> {
  return page.evaluate(
    (prefix) => Object.keys(localStorage).filter((key) => key.startsWith(prefix)).length,
    `veriworkly:docs:v3:doc:${type}:`,
  );
}

describe("editors show the document the URL names (S-061, S-163)", () => {
  let alpha = "";
  const bravo = "cover-letter-bravo-fixture";

  beforeAll(async () => {
    await page.setViewportSize(DESKTOP);
    await clearStorage();

    alpha = await createThroughApp("cover-letter");

    await retitleLetter(alpha, "Letter Alpha");
    await storeLetterCopy(alpha, bravo, "Letter Bravo");
  });

  it("client-side navigation to a missing letter shows not-found, not the previous letter", async () => {
    await page.goto(`${server.origin}/editor/cover-letter/${alpha}`, { waitUntil: "networkidle" });
    await page.getByText("Letter Alpha").first().waitFor();

    await clientNavigate("/editor/cover-letter/does-not-exist-xyz");
    await page.waitForURL(/does-not-exist-xyz/);
    await page.waitForTimeout(1_500);

    expect(await page.getByText(/cover letter not found/i).isVisible()).toBe(true);
    expect(await page.getByText("Letter Alpha").count()).toBe(0);
  });

  it("never shows the first letter under the second one's URL", async () => {
    await page.goto(`${server.origin}/editor/cover-letter/${alpha}`, { waitUntil: "networkidle" });
    await page.getByText("Letter Alpha").first().waitFor();

    // Sampled every frame: one painted frame of the old letter under the new URL is the bug.
    await page.evaluate((bravoId) => {
      const state = window as unknown as { __staleFrames: number; __watching: boolean };

      state.__staleFrames = 0;
      state.__watching = true;

      const check = () => {
        if (
          location.pathname.endsWith(bravoId) &&
          document.body.innerText.includes("Letter Alpha")
        ) {
          state.__staleFrames += 1;
        }

        if (state.__watching) requestAnimationFrame(check);
      };

      requestAnimationFrame(check);
    }, bravo);

    await clientNavigate(`/editor/cover-letter/${bravo}`);
    await page.waitForURL(new RegExp(bravo));
    await page.getByText("Letter Bravo").first().waitFor();
    await page.waitForTimeout(1_000);

    const staleFrames = await page.evaluate(() => {
      const state = window as unknown as { __staleFrames: number; __watching: boolean };

      state.__watching = false;
      return state.__staleFrames;
    });

    expect(staleFrames).toBe(0);
    // S-215: the tab names the document, not the route.
    expect(await page.title()).toBe("Letter Bravo – VeriWorkly Studio");
  });
});

describe("mobile preview fits the screen (S-213)", () => {
  beforeAll(async () => {
    await page.setViewportSize(PHONE);
    await clearStorage();
    await page.goto(`${server.origin}/editor/resume/${await createThroughApp("resume")}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(800);
    await page.getByRole("tab", { name: /^Preview$/ }).click();
    await page.waitForTimeout(800);
  });

  function pageWidth(): Promise<number> {
    return page.evaluate(
      () => document.querySelector("[id^='resume-preview-']")!.getBoundingClientRect().width,
    );
  }

  it("shows the whole page width on a 375px phone", async () => {
    const width = await pageWidth();

    expect(width).toBeLessThanOrEqual(PHONE.width);
    // Fitted, not shrunk to a thumbnail.
    expect(width).toBeGreaterThan(PHONE.width * 0.8);
  });

  it("Fit recalculates from the container after zooming in", async () => {
    for (let step = 0; step < 4; step += 1) {
      await page.getByRole("button", { name: "Zoom in" }).click();
    }

    await page.waitForTimeout(300);
    expect(await pageWidth()).toBeGreaterThan(PHONE.width);

    await page.getByRole("button", { name: "Fit canvas" }).click();
    await page.waitForTimeout(300);

    expect(await pageWidth()).toBeLessThanOrEqual(PHONE.width);
  });

  it("leaves pinch-zoom to the browser", async () => {
    const touchAction = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector("[aria-label^='Document preview canvas']")!)
          .touchAction,
    );

    expect(touchAction).toContain("pinch-zoom");
  });
});

describe("new document flow (S-069, S-211)", () => {
  beforeAll(async () => {
    await page.setViewportSize(DESKTOP);
    await clearStorage();
    await page.goto(`${server.origin}/documents`, { waitUntil: "networkidle" });
  });

  it("offers a guest Blank and Sample, and no Master Profile they do not have", async () => {
    await page.getByRole("button", { name: "New Document" }).first().click();
    await page.getByRole("radio", { name: /^Blank/ }).waitFor();

    expect(await page.getByRole("radio", { name: /^Sample/ }).count()).toBe(1);
    expect(await page.getByRole("radio", { name: /Master Profile/ }).count()).toBe(0);
    expect(await page.locator("body").innerText()).not.toContain("Template comes next");
  });

  it("a double click on Resume creates one blank resume and opens it", async () => {
    await page.getByRole("radio", { name: /^Blank/ }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^Resume/ })
      .dblclick();

    await page.waitForURL(/\/editor\/resume\/(?!new)/);
    await page.waitForTimeout(1_500);

    expect(await countStored("resume")).toBe(1);
    expect(
      await page
        .getByLabel(/full name/i)
        .first()
        .inputValue(),
    ).toBe("");
  });

  it("a second resume on the free plan is refused with a way to upgrade", async () => {
    await page.goto(`${server.origin}/documents`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "New Document" }).first().click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^Resume/ })
      .click();

    const toast = page.locator("[data-sonner-toast]").first();

    await toast.waitFor();
    expect(await toast.innerText()).toContain("Creator Pro");
    expect(await toast.getByRole("button", { name: "Upgrade" }).count()).toBe(1);
    expect(await countStored("resume")).toBe(1);
  });
});
