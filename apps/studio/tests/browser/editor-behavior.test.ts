import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Browser, BrowserContext, Page } from "playwright";

import type { ParityServer } from "../parity/server";

import { launchParityBrowser } from "../parity/browser";
import { startParityServer } from "../parity/server";

/**
 * Editor defects that only reproduce in a browser, so nothing in `tests/contracts` could
 * have caught them:
 *
 * - a mobile viewport could reach a state where the whole editor body was empty,
 * - a route id that resolved to nothing silently opened a *different* document and then
 *   autosaved the user's edits onto it,
 * - a failed local save was invisible, so a full-storage user kept typing into a draft
 *   that was no longer being persisted,
 * - the HTML export cloned the preview stage, which carries a hidden off-screen copy of
 *   the whole resume, so every exported file contained the document twice,
 * - opening a *preview* repointed the workspace's active document, changing what other
 *   surfaces opened by default,
 * - the resume toolbar's status line was owned by the toolbar while autosave ran in the
 *   editor, so it sat on "Autosave ready" forever.
 *
 * Guest mode throughout: local storage is the primary store for logged-out users, which is
 * exactly the case the save-failure defect hurt most.
 */

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

/** Shared wording for a failed local save. Both editors must produce this exact string. */
const QUOTA_MESSAGE = "Storage is full. Remove older documents or exports and try again.";

let server: ParityServer;
let browser: Browser;
let context: BrowserContext;
let page: Page;

beforeAll(async () => {
  server = await startParityServer();
  browser = await launchParityBrowser();

  context = await browser.newContext({ viewport: MOBILE });

  // The editor routes require either a session or explicit guest mode (see `proxy.ts`).
  await context.addCookies([{ name: "veriworkly-guest-mode", value: "true", url: server.origin }]);

  page = await context.newPage();
});

afterAll(async () => {
  await browser?.close();
  await server?.stop();
});

/** Creates a resume through the app itself, so the stored shape is never hand-written. */
async function seedResume(): Promise<string> {
  await page.goto(`${server.origin}/editor/resume/new?template=executive-clarity`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(() => !location.pathname.endsWith("/new"));
  await page.waitForTimeout(1_000);

  return page.url().split("/").pop()!.split("?")[0];
}

async function seedCoverLetter(): Promise<string> {
  await page.goto(`${server.origin}/editor/cover-letter/new`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !location.pathname.endsWith("/new"));
  await page.waitForTimeout(1_000);

  return page.url().split("/").pop()!.split("?")[0];
}

/**
 * Tallest painted child of the editor grid. Zero means the region below the mobile tab bar
 * is blank — the VW-01 dead end.
 */
function paintedBodyHeight(): Promise<number> {
  return page.evaluate(() => {
    const grid = document.querySelector("main")?.parentElement;

    if (!grid) return -1;

    const painted = [...grid.children].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    return painted.length === 0
      ? 0
      : Math.max(...painted.map((element) => element.getBoundingClientRect().height));
  });
}

function paintedRailCount(): Promise<number> {
  return page.evaluate(
    () =>
      [...document.querySelectorAll("aside")].filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).length,
  );
}

async function anyVisible(namePattern: RegExp): Promise<boolean> {
  const buttons = page.getByRole("button", { name: namePattern });

  for (let index = 0; index < (await buttons.count()); index += 1) {
    if (await buttons.nth(index).isVisible()) return true;
  }

  return false;
}

async function openTab(label: string) {
  await page.getByRole("tab", { name: new RegExp(`^${label}$`) }).click();
  await page.waitForTimeout(300);
}

/** Makes every local storage write throw the quota error browsers actually throw. */
async function breakLocalStorage() {
  await page.evaluate(() => {
    const proto = Object.getPrototypeOf(window.localStorage);

    (window as unknown as { __originalSetItem: unknown }).__originalSetItem = proto.setItem;

    proto.setItem = function throwQuota() {
      // `safe-local-storage.ts` classifies by `DOMException`; a plain Error would be
      // reported as the generic "unknown" failure instead of the quota one.
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    };
  });
}

async function repairLocalStorage() {
  await page.evaluate(() => {
    const proto = Object.getPrototypeOf(window.localStorage);
    proto.setItem = (window as unknown as { __originalSetItem: unknown }).__originalSetItem;
  });
}

describe("editor shell: mobile panel switching (VW-01)", () => {
  beforeAll(async () => {
    await page.setViewportSize(MOBILE);
    await page.goto(`${server.origin}/editor/resume/${await seedResume()}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(800);
  });

  it("keeps rail collapsing off mobile entirely", async () => {
    // The collapse chevron was tappable on a phone, and collapsing unmounted the rail the
    // "Content" tab pointed at. Below `md` the tab bar owns visibility, so neither the
    // collapse control nor its floating counterpart belongs there.
    expect(await anyVisible(/collapse .* panel/i)).toBe(false);
    expect(await anyVisible(/open (content|style settings) panel/i)).toBe(false);
  });

  it("renders a non-empty region on every tab, in any order", async () => {
    for (const tab of ["Content", "Preview", "Style settings", "Content", "Preview", "Content"]) {
      await openTab(tab);

      expect(await paintedBodyHeight(), `${tab} tab is blank`).toBeGreaterThan(100);
    }
  });

  it("is not blank on mobile after a session that collapsed both rails on desktop", async () => {
    await page.setViewportSize(DESKTOP);
    await page.waitForTimeout(300);

    for (const label of [/collapse content panel/i, /collapse style settings panel/i]) {
      await page.getByRole("button", { name: label }).first().click();
      await page.waitForTimeout(250);
    }

    await page.setViewportSize(MOBILE);
    await page.waitForTimeout(300);

    expect(await paintedBodyHeight()).toBeGreaterThan(100);
  });

  it("still collapses and re-expands rails on desktop", async () => {
    await page.setViewportSize(DESKTOP);
    await page.goto(page.url(), { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    expect(await paintedRailCount()).toBe(2);

    for (const label of [/collapse content panel/i, /collapse style settings panel/i]) {
      await page.getByRole("button", { name: label }).first().click();
      await page.waitForTimeout(250);
    }

    // Collapsing unmounts the rail rather than leaving a hidden subtree re-rendering on
    // every keystroke.
    expect(await paintedRailCount()).toBe(0);
    expect(await page.evaluate(() => document.querySelectorAll("aside").length)).toBe(0);

    for (const label of [/open content panel/i, /open style settings panel/i]) {
      await page.getByRole("button", { name: label }).first().click();
      await page.waitForTimeout(250);
    }

    expect(await paintedRailCount()).toBe(2);
  });

  it("behaves the same in the cover letter editor, which mounts the same shell", async () => {
    await page.setViewportSize(MOBILE);
    await page.goto(`${server.origin}/editor/cover-letter/${await seedCoverLetter()}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(800);

    expect(await anyVisible(/collapse .* panel/i)).toBe(false);

    for (const tab of ["Content", "Preview", "Style settings"]) {
      await openTab(tab);

      expect(await paintedBodyHeight(), `${tab} tab is blank`).toBeGreaterThan(100);
    }
  });
});

describe("resume hydration by route id (VW-02)", () => {
  beforeAll(async () => {
    await page.setViewportSize(DESKTOP);
  });

  it("reports a missing resume instead of opening a different document", async () => {
    // A resume exists locally, so the removed "active-or-newest" fallback would have had
    // something to silently swap in.
    await seedResume();

    await page.goto(`${server.origin}/editor/resume/does-not-exist-xyz`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1_200);

    expect(await page.getByText(/resume not found/i).isVisible()).toBe(true);
    expect(await page.getByRole("button", { name: /back to documents/i }).isVisible()).toBe(true);

    // No editor: an editable field here would mean the user is typing into some other resume.
    expect(await page.getByLabel(/full name/i).count()).toBe(0);
  });

  it("writes nothing to storage for a route id that does not exist", async () => {
    const keysMentioningTheDeadId = await page.evaluate((deadId) => {
      const hits: string[] = [];

      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index)!;
        if ((localStorage.getItem(key) ?? "").includes(deadId)) hits.push(key);
      }

      return hits;
    }, "does-not-exist-xyz");

    expect(keysMentioningTheDeadId).toEqual([]);
  });

  it("still resolves a document that exists only in the cloud", async () => {
    // The guardrail on the fix: removing the local fallback must not break cloud-only
    // documents. The API response is stubbed (a real session would need a live account),
    // but everything downstream is the real path — DocumentApi.get, the merge into local
    // storage, and the editor's own status transition.
    const localId = await seedResume();

    const storedContent = await page.evaluate((id) => {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index)!;
        const raw = localStorage.getItem(key) ?? "";

        if (key.includes(id) && raw.includes('"content"')) {
          return JSON.parse(raw) as { title: string; templateId: string; content: unknown };
        }
      }

      return null;
    }, localId);

    expect(storedContent, "could not read the seeded resume back").not.toBeNull();

    const cloudId = "resume-cloud-only-fixture";
    const now = new Date().toISOString();

    await page.route("**/documents/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Document fetched successfully",
          data: {
            id: cloudId,
            type: "RESUME",
            title: "Cloud Only Resume",
            templateId: storedContent!.templateId,
            content: {
              ...(storedContent!.content as Record<string, unknown>),
              id: cloudId,
              title: "Cloud Only Resume",
            },
            visibility: "PRIVATE",
            revision: 1,
            lastSyncedAt: null,
            createdAt: now,
            updatedAt: now,
          },
        }),
      });
    });

    try {
      await page.goto(`${server.origin}/editor/resume/${cloudId}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(2_000);

      expect(await page.getByText(/resume not found/i).count()).toBe(0);
      expect(
        await page
          .getByLabel(/full name/i)
          .first()
          .isVisible(),
      ).toBe(true);

      const landedInStorage = await page.evaluate((id) => {
        for (let index = 0; index < localStorage.length; index += 1) {
          if ((localStorage.getItem(localStorage.key(index)!) ?? "").includes(id)) return true;
        }

        return false;
      }, cloudId);

      expect(landedInStorage).toBe(true);
    } finally {
      await page.unroute("**/documents/*");
    }
  });
});

describe("autosave failure reporting (VW-03)", () => {
  beforeAll(async () => {
    await page.setViewportSize(DESKTOP);
    await page.goto(`${server.origin}/editor/resume/${await seedResume()}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1_000);
  });

  it("says nothing when the save succeeds", async () => {
    const field = page.getByLabel(/full name/i).first();

    await field.fill("Healthy Save");
    await page.waitForTimeout(1_000);

    expect(await page.locator("body").innerText()).not.toContain("Storage is full");
  });

  it("surfaces a quota failure in both the toast and the status line", async () => {
    // The debounced save returns `{ queued: true }` before the write happens, so this only
    // works because the deferred result is reported through `onFlush`.
    await breakLocalStorage();

    await page
      .getByLabel(/full name/i)
      .first()
      .fill("Quota Failure");
    await page.waitForTimeout(1_500);

    expect(await page.locator("[data-sonner-toast]").innerText()).toContain(QUOTA_MESSAGE);
    expect(await page.locator("body").innerText()).toContain(QUOTA_MESSAGE);
  });

  it("does not fire a toast per keystroke while the failure persists", async () => {
    const before = await page.locator("[data-sonner-toast]").count();

    await page
      .getByLabel(/full name/i)
      .first()
      .pressSequentially("ABCDEF", { delay: 120 });
    await page.waitForTimeout(1_500);

    expect(await page.locator("[data-sonner-toast]").count()).toBeLessThanOrEqual(before);

    await repairLocalStorage();
  });

  it("uses the same wording in the cover letter editor", async () => {
    await page.goto(`${server.origin}/editor/cover-letter/${await seedCoverLetter()}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1_000);

    await breakLocalStorage();

    await page.locator("aside input:visible, aside textarea:visible").first().fill("Quota Parity");
    await page.waitForTimeout(1_500);

    expect(await page.locator("body").innerText()).toContain(QUOTA_MESSAGE);

    await repairLocalStorage();
  });
});

describe("HTML export carries no hidden duplicate (VW-04)", () => {
  /** Distinctive enough that a substring count is meaningful. */
  const CANDIDATE = "Zephyrine Quillsworth";

  let exportedHtml = "";

  beforeAll(async () => {
    await page.setViewportSize(DESKTOP);
    await page.goto(`${server.origin}/editor/resume/${await seedResume()}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1_000);

    await page
      .getByLabel(/full name/i)
      .first()
      .fill(CANDIDATE);

    // Pagination is debounced and runs off the rendered DOM, so the pages the export
    // clones only exist after a measuring pass has completed.
    await page.waitForTimeout(1_500);

    // The exporter hands a Blob to `downloadBlob`, which is the last point the produced
    // file exists in the page. Capturing it here beats reading it back off disk.
    await page.evaluate(() => {
      const createObjectURL = URL.createObjectURL.bind(URL);

      (window as unknown as { __exportedBlob: Blob | null }).__exportedBlob = null;

      URL.createObjectURL = (object: Blob | MediaSource) => {
        if (object instanceof Blob) {
          (window as unknown as { __exportedBlob: Blob | null }).__exportedBlob = object;
        }

        return createObjectURL(object);
      };
    });

    await page.getByRole("button", { name: /^export$/i }).click();
    await page.getByRole("menuitem", { name: /^html$/i }).click();
    await page.waitForTimeout(1_500);

    exportedHtml =
      (await page.evaluate(async () => {
        const blob = (window as unknown as { __exportedBlob: Blob | null }).__exportedBlob;
        return blob ? await blob.text() : null;
      })) ?? "";
  });

  it("produces a file at all", () => {
    expect(exportedHtml.length, "no blob reached downloadBlob").toBeGreaterThan(0);
    expect(exportedHtml).toContain(CANDIDATE);
  });

  it("contains the candidate's name exactly once in the document body", () => {
    // The preview keeps a full off-screen copy of the resume for measuring page breaks.
    // Cloning the stage that wraps both put that copy in the file too — invisible in a
    // browser, but a second complete resume to an ATS or any other parser.
    const body = exportedHtml.slice(exportedHtml.indexOf("<body>"));

    expect(body.split(CANDIDATE).length - 1).toBe(1);
  });

  it("carries no off-screen measuring container", () => {
    expect(exportedHtml).not.toContain("data-export-exclude");
    expect(exportedHtml).not.toContain("-10000px");
  });

  it("still exports the visible pages, not an empty shell", () => {
    // The guardrail on the fix: narrowing the export target must not narrow it to nothing.
    expect(exportedHtml).toContain("resume-page-preview");
  });
});

describe("preview route does not write to storage (VW-05)", () => {
  const BODY_PREFIX = "veriworkly:docs:v3:doc:resume:";

  function readBody(id: string): Promise<string | null> {
    return page.evaluate((key) => localStorage.getItem(key), `${BODY_PREFIX}${id}`);
  }

  it("leaves the previewed document's stored body untouched", async () => {
    await page.setViewportSize(DESKTOP);

    const previewed = await seedResume();
    await seedResume();

    const before = await readBody(previewed);
    expect(before).not.toBeNull();

    await page.goto(`${server.origin}/editor/resume/${previewed}/preview`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1_500);

    expect(await readBody(previewed)).toBe(before);
  });

  it("still renders the previewed document", async () => {
    expect(await page.getByText(/document not found/i).count()).toBe(0);
    expect(await page.locator("#resume-container").count()).toBeGreaterThan(0);
  });
});

describe("toolbar status line reflects autosave (VW-06)", () => {
  const status = () => page.getByTestId("editor-status");

  beforeAll(async () => {
    await page.setViewportSize(DESKTOP);
  });

  it("reports autosaves instead of sitting on the mount-time placeholder", async () => {
    await page.goto(`${server.origin}/editor/resume/${await seedResume()}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1_000);

    await page
      .getByLabel(/full name/i)
      .first()
      .fill("Status Line");
    await page.waitForTimeout(1_500);

    // Before the fix this state lived inside `ResumeToolbar` while autosave ran in
    // `ResumeEditor`, so the line read "Autosave ready" from mount until the user clicked
    // Save — no matter how much had actually been persisted.
    expect(await status().innerText()).toBe("Saved on this device");
  });

  it("words a queued save differently from a persisted one", async () => {
    // The debounced write lands 300ms after the keystroke, so the status line must not
    // claim "Saved on this device" the moment the save is merely queued.
    await page
      .getByLabel(/full name/i)
      .first()
      .fill("Queued Wording");

    expect(await status().innerText()).toBe("Saving...");

    await page.waitForTimeout(1_500);

    expect(await status().innerText()).toBe("Saved on this device");
  });

  it("does the same in the cover letter editor", async () => {
    await page.goto(`${server.origin}/editor/cover-letter/${await seedCoverLetter()}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1_000);

    await page.locator("aside input:visible, aside textarea:visible").first().fill("Status Parity");

    expect(await status().innerText()).toBe("Saving...");

    await page.waitForTimeout(1_500);

    expect(await status().innerText()).toBe("Saved on this device");
  });
});

/** The stored envelope of a document, read the way the app wrote it. */
function readStoredDocument(id: string): Promise<{
  type: string;
  content: Record<string, unknown> & {
    interests: Array<{ keywords: string[] }>;
    experience: Array<{ highlights: string[] }>;
  };
} | null> {
  return page.evaluate((documentId) => {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)!;
      const raw = localStorage.getItem(key) ?? "";

      if (key.includes(documentId) && raw.includes('"content"')) return JSON.parse(raw);
    }

    return null;
  }, id);
}

async function openSection(id: string) {
  const button = page.locator(`[id="section-accordion-button-${id}"]`);

  if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
  await page.waitForTimeout(250);
}

/** Opens the experience section and adds entries until at least `count` exist. */
async function ensureExperienceEntries(count: number) {
  await openSection("experience");

  const options = page
    .locator('[id="section-accordion-panel-experience"]')
    .getByRole("combobox")
    .first()
    .locator("option");

  while ((await options.count()) < count) {
    await page.getByRole("region").getByRole("button", { name: /^add$/i }).click();
    await page.waitForTimeout(250);
  }
}

describe("editor input (Phase 2)", () => {
  let resumeId = "";
  const pageErrors: string[] = [];

  beforeAll(async () => {
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.setViewportSize(DESKTOP);
    resumeId = await seedResume();
    await page.goto(`${server.origin}/editor/resume/${resumeId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1_000);
  });

  it("imports the same JSON file twice, without a page error (S-057, S-307)", async () => {
    const stored = await readStoredDocument(resumeId);
    const file = {
      name: "resume.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(stored)),
    };
    const status = page.getByTestId("editor-status");

    pageErrors.length = 0;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      // An edit resets the status line, so the second import has to answer again.
      await page
        .getByLabel(/full name/i)
        .first()
        .fill(`Before import ${attempt}`);
      await expect.poll(() => status.innerText()).toBe("Saved on this device");

      await page.locator('input[type="file"][accept="application/json"]').setInputFiles(file);

      // A guest already has their one resume: the import is refused, never written over it.
      await expect.poll(() => status.innerText()).toMatch(/keep 1 resume at a time/);
    }

    expect(page.url()).toBe(`${server.origin}/editor/resume/${resumeId}`);
    expect(pageErrors).toEqual([]);
  });

  it("clears the file input after an import so the same file can be chosen again (S-057)", async () => {
    const input = page.locator('input[type="file"][accept="application/json"]');

    expect(await input.evaluate((element: HTMLInputElement) => element.value)).toBe("");
  });

  it("accepts a typed comma in interest keywords (S-059)", async () => {
    await page.goto(`${server.origin}/editor/resume/${resumeId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1_000);

    await openSection("interests");
    await page.getByRole("button", { name: /^add interest$/i }).click();
    await page.waitForTimeout(250);

    const keywords = page.getByLabel("Keywords (comma separated)");

    await keywords.pressSequentially("a, b", { delay: 60 });
    await page.waitForTimeout(1_000);

    expect(await keywords.inputValue()).toBe("a, b");
    expect((await readStoredDocument(resumeId))?.content.interests.at(-1)?.keywords).toEqual([
      "a",
      "b",
    ]);
  });

  it("keeps a highlight that contains a comma as one item, also after a keystroke (S-058)", async () => {
    await ensureExperienceEntries(1);

    const highlights = page.getByLabel("Highlights (one per line)");

    await highlights.fill("x, y");
    await page.waitForTimeout(1_000);

    // Reloaded, so the field starts from the stored list rather than from typed text.
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1_000);
    await openSection("experience");

    await highlights.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" z");
    await page.waitForTimeout(1_000);

    expect(await highlights.inputValue()).toBe("x, y z");
    expect((await readStoredDocument(resumeId))?.content.experience[0].highlights).toEqual([
      "x, y z",
    ]);
  });

  it("starts a new highlight on Enter (S-058, S-079)", async () => {
    const highlights = page.getByLabel("Highlights (one per line)");

    await highlights.fill("");
    await highlights.pressSequentially("a", { delay: 60 });
    await page.keyboard.press("Enter");
    await highlights.pressSequentially("b", { delay: 60 });
    await page.waitForTimeout(1_000);

    expect(await highlights.inputValue()).toBe("a\nb");
    expect((await readStoredDocument(resumeId))?.content.experience[0].highlights).toEqual([
      "a",
      "b",
    ]);
  });

  // Guest throughout, like the rest of this file: a signed-in session comes from the
  // server-side `fetchCurrentUser`, which `page.route` cannot reach. The signed-in panel's
  // pricing failure and Retry are covered in `tests/contracts/editor-input.contract.test.ts`.
  describe("AI field assist", () => {
    const signIn = () => page.getByRole("link", { name: /sign in to use ai/i });

    it("closes the assistant when switching to another entry (S-060)", async () => {
      await ensureExperienceEntries(2);

      const picker = page
        .locator('[id="section-accordion-panel-experience"]')
        .getByRole("combobox")
        .first();
      await picker.selectOption({ index: 0 });
      await page.waitForTimeout(250);

      await page.getByRole("button", { name: /(improve|write) with ai/i }).click();

      expect(await signIn().count()).toBe(1);

      await picker.selectOption({ index: 1 });
      await page.waitForTimeout(250);

      expect(await signIn().count()).toBe(0);
      expect(await page.getByRole("button", { name: /(improve|write) with ai/i }).count()).toBe(1);
    });

    it("asks a guest to sign in, with a link back to this editor (S-200)", async () => {
      await page.getByRole("button", { name: /(improve|write) with ai/i }).click();

      const editorPath = new URL(page.url()).pathname;
      const href = await signIn().getAttribute("href");

      expect(href).toBe(`/login?callbackURL=${encodeURIComponent(editorPath)}`);

      await signIn().click();
      await page.waitForURL((url) => url.pathname === "/login");

      expect(new URL(page.url()).searchParams.get("callbackURL")).toBe(editorPath);

      await page.goto(`${server.origin}${editorPath}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1_000);
    });
  });

  it("keeps 'Add custom section' after the last custom section is removed (S-065)", async () => {
    const customButtons = page.locator('[id^="section-accordion-button-custom:"]');

    for (let guard = 0; guard < 10 && (await customButtons.count()) > 0; guard += 1) {
      const first = customButtons.first();

      if ((await first.getAttribute("aria-expanded")) !== "true") await first.click();
      await page.waitForTimeout(250);

      await page.getByRole("button", { name: /^remove this section$/i }).click();
      await page.getByRole("button", { name: /^remove section$/i }).click();
      await page.waitForTimeout(300);
    }

    expect(await customButtons.count()).toBe(0);

    const add = page.getByRole("button", { name: /^add custom section$/i });

    expect(await add.isVisible()).toBe(true);

    await add.click();
    await page.waitForTimeout(300);

    expect(await customButtons.count()).toBe(1);
  });

  it("asks before removing a list entry (S-068)", async () => {
    await ensureExperienceEntries(2);

    const options = page
      .locator('[id="section-accordion-panel-experience"]')
      .getByRole("combobox")
      .first()
      .locator("option");
    const before = await options.count();
    const remove = page
      .locator('[id="section-accordion-panel-experience"]')
      .getByRole("button", { name: /^remove$/i });

    await remove.click();
    expect(await page.getByText("Remove this entry?").isVisible()).toBe(true);

    await page.getByRole("button", { name: /^cancel$/i }).click();
    await page.waitForTimeout(250);
    expect(await options.count()).toBe(before);

    await remove.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^remove$/i })
      .click();
    await page.waitForTimeout(250);
    expect(await options.count()).toBe(before - 1);
  });

  it("raised no page error anywhere in this block", () => {
    expect(pageErrors).toEqual([]);
  });
});

describe("an open editor follows changes saved elsewhere (S-315)", () => {
  let otherTab: Page;

  beforeAll(async () => {
    await page.setViewportSize(DESKTOP);
    otherTab = await context.newPage();
    await otherTab.setViewportSize(DESKTOP);
  });

  afterAll(async () => {
    await otherTab?.close();
  });

  it("S-315: an editor with nothing unsaved shows the version another tab saved", async () => {
    const editorUrl = `${server.origin}/editor/resume/${await seedResume()}`;

    await page.goto(editorUrl, { waitUntil: "networkidle" });
    await otherTab.goto(editorUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(1_000);

    await otherTab
      .getByLabel(/full name/i)
      .first()
      .fill("Edited In Another Tab");

    // Before the fix the first tab kept its old text, and its next keystroke saved over this.
    await expect
      .poll(
        () =>
          page
            .getByLabel(/full name/i)
            .first()
            .inputValue(),
        { timeout: 5_000 },
      )
      .toBe("Edited In Another Tab");
  });

  it("S-315: an editor holding edits neither saves over the other tab's version nor loses it", async () => {
    const resumeId = await seedResume();
    const editorUrl = `${server.origin}/editor/resume/${resumeId}`;
    const editingTab = await context.newPage();
    const fullName = (tab: Page) => tab.getByLabel(/full name/i).first();
    const storedName = async () =>
      ((await readStoredDocument(resumeId))?.content.basics as { fullName?: string } | undefined)
        ?.fullName;

    try {
      await editingTab.setViewportSize(DESKTOP);
      await editingTab.goto(editorUrl, { waitUntil: "networkidle" });
      await otherTab.goto(editorUrl, { waitUntil: "networkidle" });
      await page.waitForTimeout(1_000);

      // This tab's 300 ms autosave is stretched to 8 s, so it is still queued when the other
      // tab saves (the clock API would hold the other tab's timers too).
      await editingTab.evaluate(() => {
        const setTimeoutNative = window.setTimeout.bind(window);
        window.setTimeout = ((handler: TimerHandler, ms?: number) =>
          setTimeoutNative(handler, ms === 300 ? 8_000 : ms)) as typeof window.setTimeout;
      });
      await fullName(editingTab).fill("Mine From Tab A");

      await fullName(otherTab).fill("Theirs From Tab B");
      await expect.poll(storedName, { timeout: 5_000 }).toBe("Theirs From Tab B");

      await expect
        .poll(() => editingTab.getByText("This document changed elsewhere").count())
        .toBe(1);

      // The queued autosave's time comes and goes: it must not land on the other version.
      await page.waitForTimeout(9_000);
      expect(await storedName()).toBe("Theirs From Tab B");

      await editingTab.getByRole("button", { name: "Use the other version" }).click();
      await expect.poll(() => fullName(editingTab).inputValue()).toBe("Theirs From Tab B");
      expect(await storedName()).toBe("Theirs From Tab B");
    } finally {
      await editingTab.close();
    }
  });

  it("S-315: held edits survive leaving the editor in-app, and are offered back on reopening", async () => {
    const resumeId = await seedResume();
    const editorUrl = `${server.origin}/editor/resume/${resumeId}`;
    const editingTab = await context.newPage();
    const fullName = (tab: Page) => tab.getByLabel(/full name/i).first();
    const setStoredStatus = (status: string) =>
      otherTab.evaluate(
        ({ id, status }) => {
          const documentKey = `veriworkly:docs:v3:doc:resume:${id}`;
          const indexKey = "veriworkly:docs:v3:index";
          const stored = JSON.parse(localStorage.getItem(documentKey)!);
          const index = JSON.parse(localStorage.getItem(indexKey)!);

          stored.sync = { ...stored.sync, status };
          index.items[`RESUME:${id}`].sync = stored.sync;
          index.revision += 1;

          localStorage.setItem(documentKey, JSON.stringify(stored));
          localStorage.setItem(indexKey, JSON.stringify(index));
        },
        { id: resumeId, status },
      );

    try {
      await editingTab.setViewportSize(DESKTOP);
      await editingTab.goto(editorUrl, { waitUntil: "networkidle" });
      await otherTab.goto(editorUrl, { waitUntil: "networkidle" });
      await page.waitForTimeout(1_000);

      await editingTab.evaluate(() => {
        const setTimeoutNative = window.setTimeout.bind(window);
        window.setTimeout = ((handler: TimerHandler, ms?: number) =>
          setTimeoutNative(handler, ms === 300 ? 8_000 : ms)) as typeof window.setTimeout;
      });
      await fullName(editingTab).fill("Held In Tab A");
      await fullName(otherTab).fill("Saved In Tab B");

      await expect
        .poll(() => editingTab.getByText("This document changed elsewhere").count())
        .toBe(1);

      // The stored copy turning conflicted must not end the hold (S-315 re-review).
      await setStoredStatus("conflicted");
      await page.waitForTimeout(1_000);
      expect(await editingTab.getByText("This document changed elsewhere").count()).toBe(1);
      expect(await editingTab.getByText("This document changed on another device").count()).toBe(0);
      await setStoredStatus("pending");

      // Leaving in-app: no beforeunload, and nothing queued to flush.
      await editingTab.getByRole("button", { name: "Back to documents" }).click();
      await editingTab.waitForURL((url) => url.pathname === "/documents");

      await editingTab.goto(editorUrl, { waitUntil: "networkidle" });
      await editingTab.getByRole("button", { name: /restore my unsaved edits/i }).click();

      await expect.poll(() => fullName(editingTab).inputValue()).toBe("Held In Tab A");
      await expect
        .poll(
          async () =>
            ((await readStoredDocument(resumeId))?.content.basics as { fullName?: string })
              .fullName,
        )
        .toBe("Held In Tab A");
    } finally {
      await editingTab.close();
    }
  });

  it("S-315: edits to a document in conflict with the cloud are still saved on this device", async () => {
    const resumeId = await seedResume();

    await page.goto(`${server.origin}/editor/resume/${resumeId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1_000);

    // As a cloud pull leaves it when the cloud moved past this device's unsynced edits.
    await page.evaluate((id) => {
      const documentKey = `veriworkly:docs:v3:doc:resume:${id}`;
      const indexKey = "veriworkly:docs:v3:index";
      const stored = JSON.parse(localStorage.getItem(documentKey)!);
      const index = JSON.parse(localStorage.getItem(indexKey)!);

      stored.sync = { ...stored.sync, enabled: true, status: "conflicted", cloudDocumentId: id };
      index.items[`RESUME:${id}`].sync = stored.sync;
      index.revision += 1;

      localStorage.setItem(documentKey, JSON.stringify(stored));
      localStorage.setItem(indexKey, JSON.stringify(index));
    }, resumeId);

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1_000);
    expect(await page.getByText("This document changed on another device").count()).toBe(1);

    await page
      .getByLabel(/full name/i)
      .first()
      .fill("Typed During Conflict");
    await page.waitForTimeout(1_500);

    const stored = await readStoredDocument(resumeId);
    expect((stored?.content.basics as { fullName?: string }).fullName).toBe(
      "Typed During Conflict",
    );
  });
});
