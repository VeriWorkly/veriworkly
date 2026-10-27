import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { Browser, BrowserContext, Page, Route } from "playwright";

import type { ParityServer } from "../parity/server";

import { launchParityBrowser } from "../parity/browser";
import { startParityServer } from "../parity/server";

/**
 * The admin chrome's browser-only behaviour, on the dev-only `/parity/admin-shell` harness: the
 * real `/admin` needs the configured admin's session and a live API, so the API calls these
 * controls make are answered here instead.
 */

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

const API = "**/api/v1/**";

let server: ParityServer;
let browser: Browser;
let context: BrowserContext;
let page: Page;
let pageErrors: string[];

/** The API is another origin: a credentialed request needs these, and its preflight an answer. */
function corsHeaders(route: Route) {
  return {
    "Access-Control-Allow-Origin": server.origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE",
    "Access-Control-Allow-Headers":
      route.request().headers()["access-control-request-headers"] ?? "content-type",
  };
}

function json(route: Route, status: number, body: unknown) {
  if (route.request().method() === "OPTIONS") {
    return route.fulfill({ status: 204, headers: corsHeaders(route) });
  }

  return route.fulfill({
    status,
    headers: corsHeaders(route),
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function openHarness(viewport = DESKTOP, initScript?: () => void) {
  await page?.close();
  page = await context.newPage();
  pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  if (initScript) await page.addInitScript(initScript);

  await page.setViewportSize(viewport);
  await page.goto(`${server.origin}/parity/admin-shell`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Harness action" }).waitFor();
}

beforeAll(async () => {
  server = await startParityServer();
  browser = await launchParityBrowser();
  context = await browser.newContext({ viewport: DESKTOP });
});

afterAll(async () => {
  await browser?.close();
  await server?.stop();
});

beforeEach(async () => {
  await context.unrouteAll();
  // Anything the test does not answer is an outage, never a silent success.
  await context.route(API, (route) => json(route, 503, { message: "not stubbed" }));
});

describe("admin command palette (S-345, S-071)", () => {
  beforeAll(async () => {
    await openHarness();
  });

  it("is a combobox over a listbox, its highlight announced through aria-activedescendant", async () => {
    await page.getByRole("button", { name: /Search/ }).click();

    const input = page.getByRole("combobox", { name: "Search admin pages" });
    await expect
      .poll(() => input.evaluate((element) => element === document.activeElement))
      .toBe(true);

    const options = page.getByRole("listbox").getByRole("option");
    expect(await options.count()).toBeGreaterThan(3);

    const first = await input.getAttribute("aria-activedescendant");
    expect(await page.locator(`[id="${first}"]`).getAttribute("aria-selected")).toBe("true");

    await page.keyboard.press("ArrowDown");
    const second = await input.getAttribute("aria-activedescendant");
    expect(second).not.toBe(first);
    expect(await page.locator(`[id="${second}"]`).getAttribute("aria-selected")).toBe("true");
  });

  it("keeps Tab inside the dialog", async () => {
    const dialog = page.getByRole("dialog", { name: "Admin command palette" });

    // More presses than the palette has entries, so a list of tab stops cannot hide a leak.
    for (let press = 0; press < 40; press += 1) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(
        true,
      );
    }
  });

  it("closes on Escape and gives focus back to the button that opened it", async () => {
    await page.keyboard.press("Escape");

    await expect
      .poll(() => page.getByRole("dialog", { name: "Admin command palette" }).count())
      .toBe(0);
    expect(
      await page.evaluate(
        () =>
          document.activeElement?.tagName === "BUTTON" &&
          document.activeElement.textContent?.includes("Search"),
      ),
    ).toBe(true);
  });
});

describe("admin navigation drawer (S-071)", () => {
  beforeAll(async () => {
    await openHarness(PHONE);
  });

  it("traps focus, closes on Escape and returns focus to the menu button", async () => {
    await page.getByRole("button", { name: "Open navigation" }).click();

    const drawer = page.getByRole("dialog", { name: "Admin navigation" });
    await drawer.waitFor();

    for (let press = 0; press < 30; press += 1) {
      await page.keyboard.press("Tab");
      expect(await drawer.evaluate((element) => element.contains(document.activeElement))).toBe(
        true,
      );
    }

    await page.keyboard.press("Escape");
    await expect.poll(() => drawer.count()).toBe(0);
    expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe(
      "Open navigation",
    );
  });
});

describe("admin confirmation dialog on a plain-HTTP origin (S-342)", () => {
  it("opens and runs without crypto.randomUUID", async () => {
    // A LAN or HTTP self-host is not a secure context, where randomUUID does not exist.
    await openHarness(DESKTOP, () => {
      delete (Crypto.prototype as { randomUUID?: unknown }).randomUUID;
    });

    expect(await page.evaluate(() => typeof crypto.randomUUID)).toBe("undefined");

    await page.getByRole("button", { name: "Harness action" }).click();
    await page.getByRole("textbox").fill("harness reason");
    await page.getByRole("button", { name: "Run harness action" }).click();

    await expect.poll(() => page.getByTestId("attempt-key").innerText()).toMatch(/^[0-9a-f]{32}$/);
    expect(pageErrors).toEqual([]);
  });
});

describe("admin topbar sign-out (LOW)", () => {
  it("shows why a failed sign-out failed, and stays signed in", async () => {
    await context.route("**/api/v1/auth/sign-out", (route) =>
      json(route, 500, { message: "boom" }),
    );
    await openHarness();

    await page.getByRole("button", { name: "Sign out" }).click();

    await expect
      .poll(() => page.getByText(/Sign-out failed \(500\)\. You are still signed in\./).count())
      .toBe(1);
    expect(new URL(page.url()).pathname).toBe("/parity/admin-shell");
    expect(await page.getByRole("button", { name: "Sign out" }).isEnabled()).toBe(true);
  });
});

describe("dashboard GitHub sync (LOW)", () => {
  it("stays busy while the sync runs and settles when it ends", async () => {
    let running = true;

    await context.route("**/api/v1/admin/system/github/sync", (route) =>
      json(route, 202, { data: { status: "started", statusUrl: "/admin/system/github" } }),
    );
    await context.route("**/api/v1/admin/system/github", (route) =>
      json(route, 200, { data: { running } }),
    );
    await openHarness();

    await page.getByRole("button", { name: "Sync GitHub" }).click();

    await expect.poll(() => page.getByRole("button", { name: /Syncing GitHub/ }).count()).toBe(1);
    await expect
      .poll(() => page.getByRole("status").filter({ hasText: "A sync is running" }).count())
      .toBe(1);

    running = false;

    await expect
      .poll(() => page.getByRole("button", { name: "Sync GitHub" }).count(), { timeout: 10_000 })
      .toBe(1);
  });
});

describe("admin console review fixes", () => {
  it("palette: an empty result list is not announced as expanded", async () => {
    await openHarness();
    await page.getByRole("button", { name: /Search/ }).click();

    const input = page.getByRole("combobox", { name: "Search admin pages" });
    expect(await input.getAttribute("aria-expanded")).toBe("true");
    expect(await input.getAttribute("aria-controls")).toBeTruthy();

    await input.fill("qqqqzzzz");

    expect(await input.getAttribute("aria-expanded")).toBe("false");
    expect(await input.getAttribute("aria-controls")).toBeNull();
    expect(await input.getAttribute("aria-activedescendant")).toBeNull();
    await page.keyboard.press("Escape");
  });

  it("drawer: widening to the desktop layout closes it and releases the scroll lock", async () => {
    await openHarness(PHONE);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("dialog", { name: "Admin navigation" }).waitFor();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");

    await page.setViewportSize(DESKTOP);

    await expect.poll(() => page.getByRole("dialog", { name: "Admin navigation" }).count()).toBe(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  });

  it("a staged control follows the server value after a refresh (useServerDraft)", async () => {
    await openHarness();
    const probe = page.getByRole("combobox", { name: "Draft probe" });

    await probe.selectOption("CANCELED");
    expect(await probe.inputValue()).toBe("CANCELED");

    await page.getByRole("button", { name: "Server moves to past due" }).click();
    expect(await probe.inputValue()).toBe("PAST_DUE");
  });

  it("S-256: Convert to USD sends the currency, the original and its subscription", async () => {
    const sent: unknown[] = [];

    await context.route("**/api/v1/admin/affiliates/commissions", (route) => {
      if (route.request().method() === "POST") sent.push(route.request().postDataJSON());
      return json(route, 201, { data: { id: "c-usd" } });
    });
    await openHarness();

    await page.getByRole("button", { name: "Convert to USD" }).click();
    await page.getByRole("textbox", { name: "Purchase amount in USD" }).fill("12.50");
    await page.getByRole("button", { name: "Convert", exact: true }).click();

    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]).toMatchObject({
      referredUserId: "u-referred",
      providerPaymentId: "pay_eur:usd",
      purchaseAmountCents: 1250,
      currency: "USD",
      convertedFromId: "c-eur",
      subscriptionId: "sub_eur",
      status: "PENDING",
    });
  });

  it("S-256: a payment reference already used says so", async () => {
    await context.route("**/api/v1/admin/affiliates/commissions", (route) =>
      json(route, 409, { success: false, message: "Resource already exists" }),
    );
    await openHarness();

    await page.getByRole("button", { name: "Convert to USD" }).click();
    await page.getByRole("textbox", { name: "Purchase amount in USD" }).fill("12.50");
    await page.getByRole("button", { name: "Convert", exact: true }).click();

    await expect
      .poll(() =>
        page.getByRole("alert").filter({ hasText: "That reference is already used" }).count(),
      )
      .toBe(1);
  });

  it("topbar: sign-out is refused while this device holds unsynced documents", async () => {
    const guest = await browser.newContext({ viewport: DESKTOP });
    await guest.addCookies([{ name: "veriworkly-guest-mode", value: "true", url: server.origin }]);
    await guest.route(API, (route) => json(route, 503, { message: "not stubbed" }));
    let signOutCalls = 0;
    await guest.route("**/api/v1/auth/sign-out", (route) => {
      signOutCalls += 1;
      return json(route, 200, { data: {} });
    });

    const editor = await guest.newPage();
    // A guest's new resume is a local-only document: not synced.
    await editor.goto(`${server.origin}/editor/resume/new?template=executive-clarity`, {
      waitUntil: "networkidle",
    });
    await editor.waitForFunction(() => !location.pathname.endsWith("/new"));

    await editor.goto(`${server.origin}/parity/admin-shell`, { waitUntil: "networkidle" });
    await editor.getByRole("button", { name: "Sign out" }).click();

    await expect
      .poll(() => editor.getByText(/This device has 1 unsynced document/).count())
      .toBe(1);
    expect(await editor.getByRole("button", { name: "Open the studio" }).count()).toBe(1);
    expect(signOutCalls).toBe(0);
    expect(new URL(editor.url()).pathname).toBe("/parity/admin-shell");

    await guest.close();
  });
});
