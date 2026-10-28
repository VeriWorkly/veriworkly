import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Browser, BrowserContext, Page } from "playwright";

import type { ParityServer } from "../parity/server";

import { launchParityBrowser } from "../parity/browser";
import { startParityServer } from "../parity/server";

import { screenshotFailures } from "./failure-screenshots";

/**
 * Phase 8 accessibility behaviour that only exists in a browser: the login carousel's pause
 * and reduced-motion handling, the editor's announced save status, and wheel scrolling on
 * the preview canvas.
 */

const DESKTOP = { width: 1440, height: 900 };

let server: ParityServer;
let browser: Browser;
let context: BrowserContext;
let page: Page;

screenshotFailures(() => page);

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

describe("login showcase carousel", () => {
  const carousel = () => page.getByTestId("showcase-carousel");
  const currentDot = () => carousel().locator('button[aria-current="true"]');

  beforeAll(async () => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`${server.origin}/login`, { waitUntil: "networkidle" });
    await carousel().waitFor();
  });

  it("marks the current slide's dot with aria-current", async () => {
    expect(await currentDot().count()).toBe(1);
    expect(await currentDot().getAttribute("aria-label")).toBe("Go to slide 1");
  });

  it("stops rotating while the pointer is over it", async () => {
    expect(await carousel().getAttribute("data-rotating")).toBe("true");

    await carousel().hover();
    expect(await carousel().getAttribute("data-rotating")).toBe("false");

    await page.mouse.move(0, 0);
    expect(await carousel().getAttribute("data-rotating")).toBe("true");
  });

  it("offers a pause button that stops and restarts rotation", async () => {
    await page.getByRole("button", { name: "Pause slideshow" }).click();
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    expect(await carousel().getAttribute("data-rotating")).toBe("false");

    await page.getByRole("button", { name: "Play slideshow" }).click();
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    expect(await carousel().getAttribute("data-rotating")).toBe("true");
  });

  it("never auto-rotates under prefers-reduced-motion", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.mouse.move(0, 0);

    expect(await carousel().getAttribute("data-rotating")).toBe("false");
    expect(await page.getByRole("button", { name: /slideshow/ }).count()).toBe(0);

    const before = await currentDot().getAttribute("aria-label");
    // Deliberate negative check: nothing may happen for longer than one rotation interval.
    await page.waitForTimeout(6_500);

    expect(await currentDot().getAttribute("aria-label")).toBe(before);

    await page.emulateMedia({ reducedMotion: "no-preference" });
  });
});

describe("editor", () => {
  beforeAll(async () => {
    await page.goto(`${server.origin}/editor/resume/new?template=executive-clarity`, {
      waitUntil: "networkidle",
    });
    await page.waitForFunction(() => !location.pathname.endsWith("/new"));
    await page
      .getByLabel(/full name/i)
      .first()
      .waitFor({ state: "visible", timeout: 30_000 });
  });

  it("S-167: shows routine saves without announcing them", async () => {
    await page
      .getByLabel(/full name/i)
      .first()
      .fill("Live Region");

    await expect
      .poll(() => page.getByTestId("editor-status").innerText())
      .toBe("Saved on this device");
    expect(await page.getByRole("status").filter({ hasText: "Saved on this device" }).count()).toBe(
      0,
    );
  });

  it("pans the preview with the mouse wheel", async () => {
    const canvas = page.getByRole("group", { name: /Document preview canvas/ });
    const transform = () =>
      canvas.evaluate(
        (element) => element.querySelector<HTMLElement>("[style*='translate3d']")!.style.transform,
      );

    const before = await transform();

    await canvas.hover();
    await page.mouse.wheel(0, 400);

    await expect.poll(transform).toContain("-400px");
    expect(await transform()).not.toBe(before);
  });
});
