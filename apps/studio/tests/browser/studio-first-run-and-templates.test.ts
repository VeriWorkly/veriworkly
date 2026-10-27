import { readFile } from "node:fs/promises";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Browser, BrowserContext, Page } from "playwright";

import type { ParityServer } from "../parity/server";

import { launchParityBrowser } from "../parity/browser";
import { startParityServer } from "../parity/server";

/**
 * What a new guest meets outside the editor: the in-app template gallery, a create button
 * wherever the studio says "no documents yet" (phones have no sidebar), and the reminder that
 * a guest's work lives only in this browser.
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

  context = await browser.newContext({ viewport: DESKTOP, acceptDownloads: true });
  await context.addCookies([{ name: "veriworkly-guest-mode", value: "true", url: server.origin }]);

  page = await context.newPage();
});

afterAll(async () => {
  await browser?.close();
  await server?.stop();
});

async function clearStorage() {
  await page.goto(`${server.origin}/documents`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

function storedResume(id: string) {
  return page.evaluate(
    (docId) => JSON.parse(localStorage.getItem(`veriworkly:docs:v3:doc:resume:${docId}`) ?? "null"),
    id,
  ) as Promise<{ templateId: string } | null>;
}

describe("in-app template gallery (#131)", () => {
  beforeAll(async () => {
    await page.setViewportSize(DESKTOP);
    await clearStorage();
  });

  it("lists the 7 resume and 5 cover letter templates", async () => {
    await page.goto(`${server.origin}/templates`, { waitUntil: "networkidle" });

    const visiblePanel = page.locator('[role="tabpanel"]:not([hidden])');

    expect(await visiblePanel.locator("article").count()).toBe(7);

    await page.getByRole("tab", { name: /Cover letters/ }).click();

    expect(await visiblePanel.locator("article").count()).toBe(5);
    expect(
      await page.getByRole("tab", { name: /Cover letters/ }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("the sidebar's Templates link stays in the studio", async () => {
    await page.goto(`${server.origin}/`, { waitUntil: "networkidle" });

    const link = page.getByRole("link", { name: "Templates" }).first();

    expect(await link.getAttribute("href")).toBe("/templates");
    expect(await link.getAttribute("target")).toBeNull();
  });

  it('"Use this template" opens the editor on a new document wearing that template', async () => {
    await page.goto(`${server.origin}/templates`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "Use the Precision ATS template" }).click();

    await page.waitForURL(/\/editor\/resume\/(?!new)[^/?]+$/);
    await page.waitForTimeout(1_000);

    const id = page.url().split("/").pop()!;

    expect((await storedResume(id))?.templateId).toBe("precision-ats");
  });
});

describe("first-run create buttons on a phone (S-212)", () => {
  beforeAll(async () => {
    await page.setViewportSize(PHONE);
    await clearStorage();
  });

  it("the overview offers one first action, and it creates a resume", async () => {
    await page.goto(`${server.origin}/`, { waitUntil: "networkidle" });

    const create = page.getByRole("button", { name: "Create your first resume" });

    await create.waitFor();
    expect(await create.isVisible()).toBe(true);
    expect(await page.getByText("Use New Document in sidebar").count()).toBe(0);

    await create.click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /^Resume/ }).click();

    await page.waitForURL(/\/editor\/resume\/(?!new)[^/?]+$/);
  });

  it("the documents empty state has a working create button at 375px", async () => {
    await clearStorage();
    await page.goto(`${server.origin}/documents`, { waitUntil: "networkidle" });

    const emptyState = page.locator("div", { has: page.getByText("No documents yet") }).last();
    const create = emptyState.getByRole("button", { name: "New document" });

    await create.waitFor();

    const box = await create.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(PHONE.width);

    await create.click();
    await page.getByRole("dialog").getByRole("heading", { name: "New document" }).waitFor();
  });

  it("the mobile header's create button is labelled", async () => {
    const button = page.locator("header.sticky").getByRole("button", { name: "New document" });

    expect(await button.count()).toBe(1);
  });
});

describe("guest backup reminder (S-214)", () => {
  beforeAll(async () => {
    await page.setViewportSize(DESKTOP);
    await clearStorage();
  });

  it("is absent before the guest has a document", async () => {
    await page.goto(`${server.origin}/documents`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    expect(await page.getByRole("region", { name: "Backup reminder" }).count()).toBe(0);
  });

  it("appears on the dashboard once a document exists, not over the editor, and downloads one backup", async () => {
    await page.goto(`${server.origin}/editor/resume/new`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => !location.pathname.endsWith("/new"));

    const field = page.locator("input[type='text'], input:not([type]), textarea").first();
    await field.fill("Guest Writer");
    await page.waitForTimeout(800);

    // The editor fills the screen and scrolls inside itself, so the banner stays off it.
    expect(await page.getByRole("region", { name: "Backup reminder" }).count()).toBe(0);

    await page.goto(`${server.origin}/documents`, { waitUntil: "networkidle" });
    const banner = page.getByRole("region", { name: "Backup reminder" });
    await banner.waitFor();
    expect(await banner.textContent()).toContain("Your documents are saved only in this browser.");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      banner.getByRole("button", { name: "Download backup" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^veriworkly-backup-\d{4}-\d{2}-\d{2}\.json$/);

    const backup = JSON.parse(await readFile((await download.path())!, "utf8"));
    expect(backup.documents).toHaveLength(1);
    expect(backup.documents[0].type).toBe("RESUME");
  });

  it("stays dismissed for the rest of the session", async () => {
    await page.getByRole("button", { name: "Dismiss backup reminder" }).click();
    expect(await page.getByRole("region", { name: "Backup reminder" }).count()).toBe(0);

    await page.goto(`${server.origin}/documents`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    expect(await page.getByRole("region", { name: "Backup reminder" }).count()).toBe(0);
  });
});

describe("document library pages (Part H)", () => {
  beforeAll(async () => {
    await page.setViewportSize(DESKTOP);
    await clearStorage();
  });

  /** One resume made in the editor, copied in storage until the library holds `count`. */
  async function seedResumes(count: number) {
    await page.goto(`${server.origin}/editor/resume/new`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => !location.pathname.endsWith("/new"));
    await page.waitForTimeout(800);

    await page.evaluate((total) => {
      const indexKey = Object.keys(localStorage).find((key) => key.endsWith(":index"))!;
      const index = JSON.parse(localStorage.getItem(indexKey)!);
      const [itemKey, item] = Object.entries(index.items).find(([key]) =>
        key.startsWith("RESUME:"),
      )! as [string, Record<string, unknown>];
      const id = itemKey.slice("RESUME:".length);
      const documentKey = `veriworkly:docs:v3:doc:resume:${id}`;
      const stored = JSON.parse(localStorage.getItem(documentKey)!);

      for (let n = 1; n < total; n += 1) {
        const copyId = `${id}-copy-${n}`;
        const updatedAt = new Date(
          Date.parse("2026-01-01T00:00:00.000Z") + n * 60_000,
        ).toISOString();
        const title = `Paged resume ${String(n).padStart(2, "0")}`;
        localStorage.setItem(
          `veriworkly:docs:v3:doc:resume:${copyId}`,
          JSON.stringify({ ...stored, id: copyId, title, updatedAt }),
        );
        index.items[`RESUME:${copyId}`] = { ...item, id: copyId, title, updatedAt };
      }

      index.revision += 1;
      localStorage.setItem(indexKey, JSON.stringify(index));
    }, count);
  }

  it("renders 20 cards a page, and the filter and counts cover every document", async () => {
    await seedResumes(25);
    await page.goto(`${server.origin}/documents`, { waitUntil: "networkidle" });

    const cards = page.locator("section[aria-label='VeriWorkly dashboard'] article");
    const pages = page.getByRole("navigation", { name: "Document pages" });

    await pages.waitFor();
    expect(await cards.count()).toBe(20);
    expect(await pages.textContent()).toContain("1–20 of 25");
    expect(await page.getByText("25 saved documents").count()).toBe(1);

    await pages.getByRole("button", { name: "Next" }).click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("section[aria-label='VeriWorkly dashboard'] article").length ===
        5,
    );
    expect(await pages.textContent()).toContain("21–25 of 25");
    expect(await pages.getByRole("button", { name: "Next" }).isDisabled()).toBe(true);

    // A new filter starts from its first page and still sees all 25 resumes.
    await page.locator("#document-type-filter").selectOption("RESUME");
    await page.waitForFunction(
      () =>
        document.querySelectorAll("section[aria-label='VeriWorkly dashboard'] article").length ===
        20,
    );
    expect(await pages.textContent()).toContain("1–20 of 25");

    // The overview still shows only its few recent documents.
    await page.goto(`${server.origin}/`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Recently edited" }).waitFor();
    const overview = page.locator("section[aria-label='Studio overview']");
    await overview.getByText("Paged resume 24").first().waitFor();
    // Six cards: the resume made in the editor, then copies 24 to 20; never the older copies.
    expect(await overview.getByText(/^Paged resume \d+$/).count()).toBe(5);
    expect(await overview.getByText("Paged resume 19").count()).toBe(0);
    expect(await page.getByRole("navigation", { name: "Document pages" }).count()).toBe(0);
  });

  /** Card titles on the library page shown now, in order. */
  function shownTitles() {
    return page.locator("section[aria-label='VeriWorkly dashboard'] article h2").allTextContents();
  }

  /** Ids of the cards shown now, read from their editor links. */
  async function shownIds() {
    const hrefs = await page
      .locator("section[aria-label='VeriWorkly dashboard'] article a[href^='/editor/resume/']")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
    return [...new Set(hrefs.map((href) => href.split("/").pop()!))];
  }

  /** Changes storage the way another tab would, and tells this tab with a `storage` event. */
  async function editStorageElsewhere(change: { remove?: string[]; copyAs?: string }) {
    await page.evaluate(({ remove = [], copyAs }) => {
      const indexKey = Object.keys(localStorage).find((key) => key.endsWith(":index"))!;
      const index = JSON.parse(localStorage.getItem(indexKey)!);

      for (const id of remove) {
        localStorage.removeItem(`veriworkly:docs:v3:doc:resume:${id}`);
        delete index.items[`RESUME:${id}`];
      }

      if (copyAs) {
        const [itemKey, item] = Object.entries(index.items)[0] as [string, Record<string, unknown>];
        const id = itemKey.split(":")[1];
        const stored = JSON.parse(localStorage.getItem(`veriworkly:docs:v3:doc:resume:${id}`)!);
        localStorage.setItem(
          `veriworkly:docs:v3:doc:resume:${copyAs}`,
          JSON.stringify({ ...stored, id: copyAs, title: "Zz added later" }),
        );
        index.items[`RESUME:${copyAs}`] = { ...item, id: copyAs, title: "Zz added later" };
      }

      index.revision += 1;
      localStorage.setItem(indexKey, JSON.stringify(index));
      window.dispatchEvent(new StorageEvent("storage", { key: indexKey }));
    }, change);
  }

  it("sorts by title across every page, and stays on the page shown when the last one empties", async () => {
    await page.goto(`${server.origin}/documents`, { waitUntil: "networkidle" });
    const pages = page.getByRole("navigation", { name: "Document pages" });
    await pages.waitFor();

    await page.locator("#document-sort").selectOption("title");
    const firstPage = await shownTitles();
    await pages.getByRole("button", { name: "Next" }).click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("section[aria-label='VeriWorkly dashboard'] article").length ===
        5,
    );
    const secondPage = await shownTitles();

    const all = [...firstPage, ...secondPage];
    expect(all).toHaveLength(25);
    expect(all).toEqual([...all].sort((left, right) => left.localeCompare(right)));

    // Leave one card on the last page, then delete it here.
    const [last, ...rest] = await shownIds();
    await editStorageElsewhere({ remove: rest });
    await page.waitForFunction(
      () =>
        document.querySelectorAll("section[aria-label='VeriWorkly dashboard'] article").length ===
        1,
    );

    const lastTitle = (await shownTitles())[0];
    // A grid card hides its actions until hovered; the list row shows them.
    await page.getByRole("button", { name: "List view" }).click();
    await page.getByRole("button", { name: `Open actions for ${lastTitle}` }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.locator("#confirm-phrase-input").fill("DELETE");
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("section[aria-label='VeriWorkly dashboard'] article").length ===
        20,
    );
    expect(await shownIds()).not.toContain(last);

    // The list grows again: the page shown stays the first, not the second it was before.
    await editStorageElsewhere({ copyAs: "added-later" });
    await pages.waitFor();
    expect(await pages.textContent()).toContain("1–20 of 21");
    expect(await shownTitles()).toEqual(firstPage);
  });
});
