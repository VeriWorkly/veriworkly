import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { Browser, BrowserContext, Page } from "playwright";

import type { ParityServer } from "../parity/server";

import { launchParityBrowser } from "../parity/browser";
import { startParityServer } from "../parity/server";

import { screenshotFailures } from "./failure-screenshots";

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

screenshotFailures(() => page);

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

/** Waits until `tab` shows a loaded editor: its first field is on screen. */
async function editorReady(tab: Page = page) {
  await tab
    .getByLabel(/full name/i)
    .first()
    .waitFor({ state: "visible", timeout: 30_000 });
}

/** Waits until the document with `id` is in this browser's storage. */
async function storedDocumentExists(id: string) {
  await page.waitForFunction(
    (documentId) => {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index)!;
        if (key.includes(documentId) && (localStorage.getItem(key) ?? "").includes('"content"')) {
          return true;
        }
      }

      return false;
    },
    id,
    { timeout: 30_000 },
  );
}

/** Creates a document through the app itself, so the stored shape is never hand-written. */
async function seedDocument(path: string): Promise<string> {
  // The first visit compiles the editor under `next dev`, which alone can take most of 30 s.
  await page.goto(`${server.origin}${path}`, { waitUntil: "networkidle", timeout: 90_000 });

  // A guest at the free limit gets their existing document; when the link names another
  // template, they are asked first whether to restyle it (S-360). These tests want the template.
  const useTemplate = page.getByRole("button", { name: /^Use / });
  await page.waitForFunction(
    () =>
      !location.pathname.endsWith("/new") ||
      [...document.querySelectorAll("button")].some((button) =>
        button.textContent?.startsWith("Use "),
      ),
    undefined,
    { timeout: 30_000 },
  );
  if (new URL(page.url()).pathname.endsWith("/new")) await useTemplate.click();

  await page.waitForFunction(() => !location.pathname.endsWith("/new"), undefined, {
    timeout: 30_000,
  });

  const id = page.url().split("/").pop()!.split("?")[0];

  await storedDocumentExists(id);
  await editorReady();

  return id;
}

function seedResume(): Promise<string> {
  return seedDocument("/editor/resume/new?template=executive-clarity");
}

function seedCoverLetter(): Promise<string> {
  return seedDocument("/editor/cover-letter/new");
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
  const tab = page.getByRole("tab", { name: new RegExp(`^${label}$`) });

  await tab.click();
  await expect.poll(() => tab.getAttribute("aria-selected")).toBe("true");
}

/**
 * Makes every local storage write throw the quota error browsers actually throw. Calling it again
 * while broken keeps the real `setItem` saved, so a repair always restores it.
 */
async function breakLocalStorage() {
  await page.evaluate(() => {
    const proto = Object.getPrototypeOf(window.localStorage);
    const saved = window as unknown as { __originalSetItem?: unknown };

    saved.__originalSetItem ??= proto.setItem;

    proto.setItem = function throwQuota() {
      // `safe-local-storage.ts` classifies by `DOMException`; a plain Error would be
      // reported as the generic "unknown" failure instead of the quota one.
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    };
  });
}

/** Undoes `breakLocalStorage`; a no-op when storage is not broken, or the page was replaced. */
async function repairLocalStorage() {
  await page.evaluate(() => {
    const saved = window as unknown as { __originalSetItem?: unknown };
    if (!saved.__originalSetItem) return;

    Object.getPrototypeOf(window.localStorage).setItem = saved.__originalSetItem;
    delete saved.__originalSetItem;
  });
}

/**
 * From now on, records each text the status line shows. "Saving..." lasts only the 300 ms
 * debounce, so reading it once after typing races the save.
 */
type StatusRecorder = { __statusSeen?: string[]; __statusObserver?: MutationObserver };

async function recordStatusLine() {
  await page.evaluate(() => {
    const recorder = window as unknown as StatusRecorder;
    const read = () =>
      document.querySelector('[data-testid="editor-status"]')?.textContent?.trim() ?? "";
    const seen = [read()];

    recorder.__statusObserver?.disconnect();
    recorder.__statusSeen = seen;
    recorder.__statusObserver = new MutationObserver(() => {
      if (seen.at(-1) !== read()) seen.push(read());
    });
    recorder.__statusObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });
}

/** What the status line showed since `recordStatusLine`, recording still on. */
function statusLineHistory(): Promise<string[]> {
  return page.evaluate(() => (window as unknown as StatusRecorder).__statusSeen ?? []);
}

/** Stops recording and returns what the status line showed. */
function stopRecordingStatusLine(): Promise<string[]> {
  return page.evaluate(() => {
    const recorder = window as unknown as StatusRecorder;

    recorder.__statusObserver?.disconnect();
    delete recorder.__statusObserver;
    return recorder.__statusSeen ?? [];
  });
}

describe("editor shell: mobile panel switching (VW-01)", () => {
  beforeAll(async () => {
    await page.setViewportSize(MOBILE);
    await page.goto(`${server.origin}/editor/resume/${await seedResume()}`, {
      waitUntil: "networkidle",
    });
    await page.getByRole("tab", { name: /^Preview$/ }).waitFor({ state: "visible" });
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
    await expect.poll(paintedRailCount).toBe(2);

    for (const label of [/collapse content panel/i, /collapse style settings panel/i]) {
      await page.getByRole("button", { name: label }).first().click();
    }
    await expect.poll(paintedRailCount).toBe(0);

    await page.setViewportSize(MOBILE);

    await expect.poll(paintedBodyHeight).toBeGreaterThan(100);
  });

  it("still collapses and re-expands rails on desktop", async () => {
    await page.setViewportSize(DESKTOP);
    await page.goto(page.url(), { waitUntil: "networkidle" });

    await expect.poll(paintedRailCount).toBe(2);

    for (const label of [/collapse content panel/i, /collapse style settings panel/i]) {
      await page.getByRole("button", { name: label }).first().click();
    }

    // Collapsing unmounts the rail rather than leaving a hidden subtree re-rendering on
    // every keystroke.
    await expect.poll(paintedRailCount).toBe(0);
    expect(await page.evaluate(() => document.querySelectorAll("aside").length)).toBe(0);

    for (const label of [/open content panel/i, /open style settings panel/i]) {
      await page.getByRole("button", { name: label }).first().click();
    }

    await expect.poll(paintedRailCount).toBe(2);
  });

  it("behaves the same in the cover letter editor, which mounts the same shell", async () => {
    await page.setViewportSize(MOBILE);
    await page.goto(`${server.origin}/editor/cover-letter/${await seedCoverLetter()}`, {
      waitUntil: "networkidle",
    });
    await page.getByRole("tab", { name: /^Preview$/ }).waitFor({ state: "visible" });

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
    await page.getByText(/resume not found/i).waitFor({ state: "visible" });
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
      await page
        .getByLabel(/full name/i)
        .first()
        .waitFor({ state: "visible", timeout: 15_000 });

      expect(await page.getByText(/resume not found/i).count()).toBe(0);

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
  const status = () => page.getByTestId("editor-status");

  beforeAll(async () => {
    await page.setViewportSize(DESKTOP);
    await page.goto(`${server.origin}/editor/resume/${await seedResume()}`, {
      waitUntil: "networkidle",
    });
    await editorReady();
  });

  // Repaired even when an assertion failed, so one failure cannot break every later test.
  afterEach(repairLocalStorage);

  it("says nothing when the save succeeds", async () => {
    const field = page.getByLabel(/full name/i).first();

    await field.fill("Healthy Save");
    await expect.poll(() => status().innerText()).toBe("Saved on this device");

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

    await expect.poll(() => status().innerText()).toBe(QUOTA_MESSAGE);
    expect(await page.locator("[data-sonner-toast]").innerText()).toContain(QUOTA_MESSAGE);
  });

  it("does not fire a toast per keystroke while the failure persists", async () => {
    await breakLocalStorage();
    await recordStatusLine();
    const before = await page.locator("[data-sonner-toast]").count();

    await page
      .getByLabel(/full name/i)
      .first()
      .pressSequentially("ABCDEF", { delay: 120 });
    // The last keystroke's save has run and failed again.
    await expect.poll(async () => (await statusLineHistory()).slice(1)).toContain(QUOTA_MESSAGE);
    await expect.poll(() => status().innerText()).toBe(QUOTA_MESSAGE);
    await stopRecordingStatusLine();

    expect(await page.locator("[data-sonner-toast]").count()).toBeLessThanOrEqual(before);
  });

  it("uses the same wording in the cover letter editor", async () => {
    await page.goto(`${server.origin}/editor/cover-letter/${await seedCoverLetter()}`, {
      waitUntil: "networkidle",
    });
    const field = page.locator("aside input:visible, aside textarea:visible").first();
    await field.waitFor();

    await breakLocalStorage();
    await field.fill("Quota Parity");

    await expect.poll(() => status().innerText()).toBe(QUOTA_MESSAGE);
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
    await editorReady();

    await page
      .getByLabel(/full name/i)
      .first()
      .fill(CANDIDATE);

    // Pagination is debounced and runs off the rendered DOM, so the pages the export
    // clones only exist after a measuring pass has completed.
    await page.waitForFunction(
      (name) => document.querySelector("[data-resume-pages]")?.textContent?.includes(name),
      CANDIDATE,
    );

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
    await page.waitForFunction(() =>
      Boolean((window as unknown as { __exportedBlob: Blob | null }).__exportedBlob),
    );

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
    // Any write would come from opening it, which is done once the page is drawn.
    await page.locator("article.resume-page-preview").first().waitFor({ state: "visible" });

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

  /** After the edit the line said "Saving...", then "Saved on this device", and rests there. */
  async function expectQueuedThenSaved() {
    await expect.poll(() => status().innerText()).toBe("Saved on this device");

    const seen = await stopRecordingStatusLine();
    const queued = seen.lastIndexOf("Saving...");

    expect(queued, seen.join(" -> ")).toBeGreaterThanOrEqual(0);
    expect(seen.slice(queued + 1), seen.join(" -> ")).toEqual(["Saved on this device"]);
  }

  it("reports autosaves instead of sitting on the mount-time placeholder", async () => {
    await page.goto(`${server.origin}/editor/resume/${await seedResume()}`, {
      waitUntil: "networkidle",
    });
    await editorReady();

    await page
      .getByLabel(/full name/i)
      .first()
      .fill("Status Line");

    // Before the fix this state lived inside `ResumeToolbar` while autosave ran in
    // `ResumeEditor`, so the line read "Autosave ready" from mount until the user clicked
    // Save — no matter how much had actually been persisted.
    await expect.poll(() => status().innerText()).toBe("Saved on this device");
  });

  it("words a queued save differently from a persisted one", async () => {
    // The debounced write lands 300ms after the keystroke, so the status line must not
    // claim "Saved on this device" the moment the save is merely queued.
    await recordStatusLine();
    await page
      .getByLabel(/full name/i)
      .first()
      .fill("Queued Wording");

    await expectQueuedThenSaved();
  });

  it("does the same in the cover letter editor", async () => {
    await page.goto(`${server.origin}/editor/cover-letter/${await seedCoverLetter()}`, {
      waitUntil: "networkidle",
    });
    const field = page.locator("aside input:visible, aside textarea:visible").first();
    await field.waitFor();

    await recordStatusLine();
    await field.fill("Status Parity");

    await expectQueuedThenSaved();
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
  await page.locator(`[id="section-accordion-panel-${id}"]`).waitFor({ state: "visible" });
}

/** Opens a list section and adds entries until at least `count` exist. */
async function ensureEntries(section: string, count: number) {
  await openSection(section);

  const panel = page.locator(`[id="section-accordion-panel-${section}"]`);
  const options = panel.getByRole("combobox").first().locator("option");

  while ((await options.count()) < count) {
    const before = await options.count();
    await panel.getByRole("button", { name: /^add$/i }).click();
    await expect.poll(() => options.count()).toBeGreaterThan(before);
  }
}

function ensureExperienceEntries(count: number) {
  return ensureEntries("experience", count);
}

describe("editor input (Phase 2)", () => {
  let resumeId = "";
  const pageErrors: string[] = [];

  beforeAll(async () => {
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.setViewportSize(DESKTOP);
    resumeId = await seedResume();
    await page.goto(`${server.origin}/editor/resume/${resumeId}`, { waitUntil: "networkidle" });
    await editorReady();
  });

  it("imports the same JSON file twice, without a page error (S-057, S-307)", async () => {
    const stored = await readStoredDocument(resumeId);
    const file = {
      name: "resume.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(stored)),
    };
    const status = page.getByTestId("editor-status");

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
    await editorReady();

    await openSection("interests");
    await page.getByRole("button", { name: /^add interest$/i }).click();

    const keywords = page.getByLabel("Keywords (comma separated)");
    await keywords.waitFor({ state: "visible" });

    await keywords.pressSequentially("a, b", { delay: 60 });

    await expect
      .poll(async () => (await readStoredDocument(resumeId))?.content.interests.at(-1)?.keywords)
      .toEqual(["a", "b"]);
    expect(await keywords.inputValue()).toBe("a, b");
  });

  it("keeps a highlight that contains a comma as one item, also after a keystroke (S-058)", async () => {
    await ensureExperienceEntries(1);

    const highlights = page.getByLabel("Highlights (one per line)");

    await highlights.fill("x, y");
    await expect
      .poll(async () => (await readStoredDocument(resumeId))?.content.experience[0].highlights)
      .toEqual(["x, y"]);

    // Reloaded, so the field starts from the stored list rather than from typed text.
    await page.reload({ waitUntil: "networkidle" });
    await editorReady();
    await openSection("experience");

    await highlights.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" z");

    await expect
      .poll(async () => (await readStoredDocument(resumeId))?.content.experience[0].highlights)
      .toEqual(["x, y z"]);
    expect(await highlights.inputValue()).toBe("x, y z");
  });

  it("starts a new highlight on Enter (S-058, S-079)", async () => {
    const highlights = page.getByLabel("Highlights (one per line)");

    await highlights.fill("");
    await highlights.pressSequentially("a", { delay: 60 });
    await page.keyboard.press("Enter");
    await highlights.pressSequentially("b", { delay: 60 });

    await expect
      .poll(async () => (await readStoredDocument(resumeId))?.content.experience[0].highlights)
      .toEqual(["a", "b"]);
    expect(await highlights.inputValue()).toBe("a\nb");
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
      await page.getByRole("button", { name: /(improve|write) with ai/i }).click();
      await expect.poll(() => signIn().count()).toBe(1);

      await picker.selectOption({ index: 1 });
      await expect.poll(() => signIn().count()).toBe(0);
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
      await editorReady();
    });

    it("closes the assistant when switching to another project too (S-060)", async () => {
      await ensureEntries("projects", 2);

      const panel = page.locator('[id="section-accordion-panel-projects"]');
      const assist = () => panel.getByRole("button", { name: /(improve|write) with ai/i });
      const picker = panel.getByRole("combobox").first();

      await picker.selectOption({ index: 0 });
      await assist().click();
      await expect.poll(() => signIn().count()).toBe(1);

      await picker.selectOption({ index: 1 });
      await expect.poll(() => signIn().count()).toBe(0);
      expect(await assist().count()).toBe(1);
    });
  });

  it("keeps 'Add custom section' after the last custom section is removed (S-065)", async () => {
    const customButtons = page.locator('[id^="section-accordion-button-custom:"]');

    for (let guard = 0; guard < 10 && (await customButtons.count()) > 0; guard += 1) {
      const first = customButtons.first();

      if ((await first.getAttribute("aria-expanded")) !== "true") await first.click();

      const before = await customButtons.count();
      await page.getByRole("button", { name: /^remove this section$/i }).click();
      await page.getByRole("button", { name: /^remove section$/i }).click();
      await expect.poll(() => customButtons.count()).toBeLessThan(before);
    }

    expect(await customButtons.count()).toBe(0);

    const add = page.getByRole("button", { name: /^add custom section$/i });

    expect(await add.isVisible()).toBe(true);

    await add.click();

    await expect.poll(() => customButtons.count()).toBe(1);
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
    await page.getByText("Remove this entry?").waitFor({ state: "hidden" });
    expect(await options.count()).toBe(before);

    await remove.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^remove$/i })
      .click();
    await expect.poll(() => options.count()).toBe(before - 1);
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
    await editorReady(page);
    await editorReady(otherTab);

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
        { timeout: 15_000 },
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
      await editorReady(editingTab);
      await editorReady(otherTab);

      // This tab's 300 ms autosave is stretched to 8 s, so it is still queued when the other
      // tab saves (the clock API would hold the other tab's timers too).
      await editingTab.evaluate(() => {
        const setTimeoutNative = window.setTimeout.bind(window);
        window.setTimeout = ((handler: TimerHandler, ms?: number) =>
          setTimeoutNative(handler, ms === 300 ? 8_000 : ms)) as typeof window.setTimeout;
      });
      await fullName(editingTab).fill("Mine From Tab A");

      await fullName(otherTab).fill("Theirs From Tab B");
      await expect.poll(storedName, { timeout: 15_000 }).toBe("Theirs From Tab B");

      await expect
        .poll(() => editingTab.getByText("This document changed elsewhere").count(), {
          timeout: 15_000,
        })
        .toBe(1);

      // Deliberate negative check: the queued autosave's (stretched) time comes and goes, and
      // it must not land on the other version.
      await page.waitForTimeout(9_000);
      expect(await storedName()).toBe("Theirs From Tab B");

      await editingTab.getByRole("button", { name: "Use the other version" }).click();
      await expect
        .poll(() => fullName(editingTab).inputValue(), { timeout: 15_000 })
        .toBe("Theirs From Tab B");
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
      await editorReady(editingTab);
      await editorReady(otherTab);

      await editingTab.evaluate(() => {
        const setTimeoutNative = window.setTimeout.bind(window);
        window.setTimeout = ((handler: TimerHandler, ms?: number) =>
          setTimeoutNative(handler, ms === 300 ? 8_000 : ms)) as typeof window.setTimeout;
      });
      await fullName(editingTab).fill("Held In Tab A");
      await fullName(otherTab).fill("Saved In Tab B");

      await expect
        .poll(() => editingTab.getByText("This document changed elsewhere").count(), {
          timeout: 15_000,
        })
        .toBe(1);

      // The stored copy turning conflicted must not end the hold (S-315 re-review).
      // A "nothing happens" check: the notice must hold steady over the next second and a
      // half, so it is sampled throughout rather than read once after a fixed sleep.
      await setStoredStatus("conflicted");
      for (let sample = 0; sample < 10; sample += 1) {
        expect(await editingTab.getByText("This document changed elsewhere").count()).toBe(1);
        expect(await editingTab.getByText("This document changed on another device").count()).toBe(
          0,
        );
        await editingTab.waitForTimeout(150);
      }
      await setStoredStatus("pending");

      // Leaving in-app: no beforeunload, and nothing queued to flush.
      await editingTab.getByRole("button", { name: "Back to documents" }).click();
      await editingTab.waitForURL((url) => url.pathname === "/documents");

      await editingTab.goto(editorUrl, { waitUntil: "networkidle" });
      await editingTab.getByRole("button", { name: /restore my unsaved edits/i }).click();

      await expect
        .poll(() => fullName(editingTab).inputValue(), { timeout: 15_000 })
        .toBe("Held In Tab A");
      await expect
        .poll(
          async () =>
            ((await readStoredDocument(resumeId))?.content.basics as { fullName?: string })
              .fullName,
          { timeout: 15_000 },
        )
        .toBe("Held In Tab A");
    } finally {
      await editingTab.close();
    }
  });

  it("S-315: edits to a document in conflict with the cloud are still saved on this device", async () => {
    const resumeId = await seedResume();

    await page.goto(`${server.origin}/editor/resume/${resumeId}`, { waitUntil: "networkidle" });
    await editorReady();

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
    await editorReady();
    await expect
      .poll(() => page.getByText("This document changed on another device").count(), {
        timeout: 15_000,
      })
      .toBe(1);

    await page
      .getByLabel(/full name/i)
      .first()
      .fill("Typed During Conflict");

    await expect
      .poll(
        async () =>
          ((await readStoredDocument(resumeId))?.content.basics as { fullName?: string }).fullName,
        { timeout: 15_000 },
      )
      .toBe("Typed During Conflict");
  });
});

describe("editors (Phase 9)", () => {
  const experiencePanel = () => page.locator('[id="section-accordion-panel-experience"]');
  let resumeId = "";

  beforeAll(async () => {
    await page.setViewportSize(DESKTOP);
    resumeId = await seedResume();
    await page.goto(`${server.origin}/editor/resume/${resumeId}`, { waitUntil: "networkidle" });
    await editorReady();
  });

  it("S-292: moves an experience entry with the keyboard, and says where it went", async () => {
    await ensureExperienceEntries(2);

    const picker = experiencePanel().getByRole("combobox", { name: /experience entry to edit/i });

    for (const [index, role] of ["First role", "Second role"].entries()) {
      await picker.selectOption({ index });
      await experiencePanel().getByLabel("Role", { exact: true }).fill(role);
    }

    await picker.selectOption({ index: 0 });
    await experiencePanel().getByRole("button", { name: 'Move "First role" down' }).focus();
    await page.keyboard.press("Enter");

    await expect
      .poll(async () =>
        (await readStoredDocument(resumeId))?.content.experience
          .slice(0, 2)
          .map((item) => (item as unknown as { role: string }).role),
      )
      .toEqual(["Second role", "First role"]);
    // The selection follows the entry, and a screen reader hears the new position.
    expect(await picker.inputValue()).toBe("1");
    expect(
      await experiencePanel()
        .getByText(/"First role" moved to position 2 of/)
        .count(),
    ).toBe(1);
  });

  it("S-310: says nothing about a field until it has been left, and never asks for a blank one", async () => {
    await openSection("basics");

    const email = page.getByLabel("Email", { exact: true });
    const fullName = page.getByLabel(/full name/i).first();

    await fullName.fill("");
    await email.fill("not-an-email");

    expect(await page.getByText("Enter a valid email address.").count()).toBe(0);

    await email.blur();

    expect(await page.getByText("Enter a valid email address.").count()).toBe(1);
    expect(await email.getAttribute("aria-describedby")).toBeTruthy();
    expect(await page.getByText(/is required/i).count()).toBe(0);

    await email.fill("ada@example.com");
  });

  it("S-305: an emptied link text stays empty instead of turning back into 'Link'", async () => {
    await openSection("projects");

    const panel = page.locator('[id="section-accordion-panel-projects"]');

    if ((await panel.getByRole("combobox").count()) === 0) {
      await panel.getByRole("button", { name: /^add$/i }).click();
    }

    const linkText = panel.getByLabel("Link text");

    await linkText.fill("");
    await linkText.pressSequentially("R");

    expect(await linkText.inputValue()).toBe("R");
  });

  it("S-290: Full Preview shows whole pages that fit a phone, one page for a short resume", async () => {
    await page.setViewportSize(MOBILE);
    await page.goto(`${server.origin}/editor/resume/${resumeId}/preview`, {
      waitUntil: "networkidle",
    });
    await expect.poll(() => page.locator("article.resume-page-preview").count()).toBeGreaterThan(0);

    const layout = await page.evaluate(() => ({
      pages: [...document.querySelectorAll("article.resume-page-preview")].map((article) =>
        Math.round(article.getBoundingClientRect().right),
      ),
      scrollWidth: document.scrollingElement!.scrollWidth,
      innerWidth: window.innerWidth,
    }));

    expect(layout.pages.length).toBeGreaterThan(0);
    for (const right of layout.pages) expect(right).toBeLessThanOrEqual(layout.innerWidth);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth);

    await page.setViewportSize(DESKTOP);
  });

  it("S-308: Full Preview opens a document that exists only in the cloud", async () => {
    const stored = await readStoredDocument(resumeId);
    const cloudId = "resume-cloud-only-preview";
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
            title: "Cloud Only Preview",
            templateId: stored!.content.templateId,
            content: { ...stored!.content, id: cloudId, title: "Cloud Only Preview" },
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
      await page.goto(`${server.origin}/editor/resume/${cloudId}/preview`, {
        waitUntil: "networkidle",
      });
      await page
        .locator("article.resume-page-preview")
        .first()
        .waitFor({ state: "visible", timeout: 15_000 });

      expect(await page.getByText(/not found/i).count()).toBe(0);
      await expect.poll(() => page.title()).toMatch(/^Cloud Only Preview preview/);
    } finally {
      await page.unroute("**/documents/*");
    }
  });

  it("S-309: deleting the last cover letter goes back to the library, not into a new one", async () => {
    // Every cover letter the earlier blocks made, so the last delete is the last letter.
    await seedCoverLetter();

    const ids = await page.evaluate(() => {
      const index = JSON.parse(localStorage.getItem("veriworkly:docs:v3:index") ?? "{}");

      return Object.values(index.items ?? {})
        .filter((entry) => (entry as { type: string }).type === "COVER_LETTER")
        .map((entry) => (entry as { id: string }).id);
    });

    for (const id of ids) {
      await page.goto(`${server.origin}/editor/cover-letter/${id}`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /^actions$/i }).waitFor({ state: "visible" });

      await page.getByRole("button", { name: /^actions$/i }).click();
      await page.getByRole("menuitem", { name: /^delete$/i }).click();
      await page.getByPlaceholder("Type DELETE to proceed").fill("DELETE");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: /^confirm$/i })
        .click();
      await page.waitForURL((url) => !url.pathname.endsWith(id), { timeout: 30_000 });
    }

    // The first visit to the library compiles it in dev, so wait for the navigation.
    await page.waitForURL((url) => url.pathname === "/documents", { timeout: 30_000 });

    expect(new URL(page.url()).pathname).toBe("/documents");
  });
});

describe("a scaled preview still shows every line on exactly one page (S-287)", () => {
  const TOKENS = Array.from({ length: 1500 }, (_, index) => `zq${String(index).padStart(4, "0")}`);
  const LONG_TEXT = TOKENS.join(" ");

  /** How often each token is drawn inside its page's box, on the visible pages only. */
  function visibleTokenCounts(): Promise<Record<string, number>> {
    return page.evaluate(() => {
      const counts: Record<string, number> = {};
      const range = document.createRange();

      for (const article of document.querySelectorAll("article")) {
        // The off-screen measuring copies sit under an aria-hidden container.
        if (article.closest('[aria-hidden="true"]')) continue;

        const box = article.getBoundingClientRect();
        const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);

        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          for (const match of (node.textContent ?? "").matchAll(/\bzq\d{4}\b/g)) {
            range.setStart(node, match.index!);
            range.setEnd(node, match.index! + match[0].length);

            const rect = range.getBoundingClientRect();

            if (rect.height > 0 && rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1) {
              counts[match[0]] = (counts[match[0]] ?? 0) + 1;
            }
          }
        }
      }

      return counts;
    });
  }

  async function expectEveryTokenOnce(where: string) {
    const wrong = async () => {
      const counts = await visibleTokenCounts();
      return TOKENS.filter((token) => counts[token] !== 1);
    };

    // Pagination is debounced; the pages settle once the text has been measured.
    await expect
      .poll(wrong, { message: `${where}: tokens not drawn exactly once`, timeout: 15_000 })
      .toEqual([]);
  }

  it("resume: Full Preview on a phone and the editor at its default zoom", async () => {
    await page.setViewportSize(DESKTOP);

    const resumeId = await seedResume();

    await page.goto(`${server.origin}/editor/resume/${resumeId}`, { waitUntil: "networkidle" });
    await editorReady();
    await openSection("summary");
    await page.getByLabel("Professional summary").fill(LONG_TEXT);

    await expectEveryTokenOnce("resume editor");

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${server.origin}/editor/resume/${resumeId}/preview`, {
      waitUntil: "networkidle",
    });

    await expectEveryTokenOnce("resume Full Preview at 375px");
    await page.setViewportSize(DESKTOP);
  });

  it("cover letter: Full Preview on a phone and the editor at its default zoom", async () => {
    await page.setViewportSize(DESKTOP);

    const letterId = await seedCoverLetter();

    await page.goto(`${server.origin}/editor/cover-letter/${letterId}`, {
      waitUntil: "networkidle",
    });
    await page.locator('[id="section-accordion-button-letter"]').click();
    await page.getByLabel("Main body").fill(LONG_TEXT);

    await expectEveryTokenOnce("cover letter editor");

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${server.origin}/editor/cover-letter/${letterId}/preview`, {
      waitUntil: "networkidle",
    });

    await expectEveryTokenOnce("cover letter Full Preview at 375px");
    await page.setViewportSize(DESKTOP);
  });
});

describe("exports (Phase 9: S-285, S-288)", () => {
  /** Records the next Blob handed to `downloadBlob`, the last point an export exists. */
  async function captureNextBlob() {
    await page.evaluate(() => {
      const w = window as unknown as { __exportedBlob: Blob | null; __realCreate?: unknown };
      const real = (w.__realCreate ??= URL.createObjectURL.bind(URL)) as typeof URL.createObjectURL;

      w.__exportedBlob = null;
      URL.createObjectURL = (object: Blob | MediaSource) => {
        if (object instanceof Blob) w.__exportedBlob = object;
        return real(object);
      };
    });
  }

  function exportedText(): Promise<string> {
    return page.evaluate(async () => {
      const blob = (window as unknown as { __exportedBlob: Blob | null }).__exportedBlob;
      return blob ? await blob.text() : "";
    });
  }

  async function exportAs(format: RegExp) {
    await page.getByRole("button", { name: /^export$/i }).click();
    await page.getByRole("menuitem", { name: format }).click();
  }

  it("S-285: the WYSIWYG HTML page is as wide as the page, whatever the editor zoom", async () => {
    await page.setViewportSize(DESKTOP);
    await page.goto(`${server.origin}/editor/resume/${await seedResume()}`, {
      waitUntil: "networkidle",
    });
    // The drawn pages, not the whole resume the root holds until they are measured.
    await page.waitForSelector("[data-resume-pages] > article");

    const layoutWidth = await page.evaluate(
      () => (document.querySelector("[data-resume-pages]") as HTMLElement).offsetWidth,
    );
    const zoomedWidth = await page.evaluate(
      () => document.querySelector("[data-resume-pages]")!.getBoundingClientRect().width,
    );

    await captureNextBlob();
    await exportAs(/^html$/i);
    await page.waitForFunction(() =>
      Boolean((window as unknown as { __exportedBlob: Blob | null }).__exportedBlob),
    );

    const html = await exportedText();

    expect(zoomedWidth, "the editor opens zoomed, or this test proves nothing").not.toBe(
      layoutWidth,
    );
    expect(html).toContain(`width: ${layoutWidth}px`);

    // S-304: printed, each preview page is one sheet, not split over two.
    const previewPages = await page.evaluate(
      () => document.querySelectorAll("[data-resume-pages] > *").length,
    );
    const printTab = await context.newPage();

    try {
      await printTab.setContent(html, { waitUntil: "load" });
      const pdf = (await printTab.pdf({ preferCSSPageSize: true })).toString("latin1");

      expect(pdf.match(/\/Type\s*\/Page[^s]/g)?.length).toBe(previewPages);

      // The sheet count alone could match by accident; the break rule itself must win over
      // the styles the export inlines, and backgrounds must print.
      await printTab.emulateMedia({ media: "print" });
      const printed = await printTab.evaluate(() =>
        [...document.querySelectorAll("[data-resume-pages] > *")].map((node) => {
          const style = getComputedStyle(node);
          return `${style.breakAfter}/${style.printColorAdjust}`;
        }),
      );

      expect(printed).toEqual(
        printed.map((_, index) => (index === printed.length - 1 ? "auto/exact" : "page/exact")),
      );
    } finally {
      await printTab.close();
    }
  });

  it("S-285: exports the generated document from a phone's Content tab", async () => {
    await page.setViewportSize(MOBILE);
    await page.reload({ waitUntil: "networkidle" });
    await openTab("Content");

    await captureNextBlob();
    await exportAs(/^html$/i);
    await page.waitForFunction(() =>
      Boolean((window as unknown as { __exportedBlob: Blob | null }).__exportedBlob),
    );

    const html = await exportedText();

    expect(html).toContain("<main>");
    expect(html).not.toContain("data-resume-pages");
    await page.setViewportSize(DESKTOP);
  });

  it("S-288: warns before a PDF that would print a name blank, and offers DOCX and HTML", async () => {
    await page.setViewportSize(DESKTOP);
    await page.goto(`${server.origin}/editor/resume/${await seedResume()}`, {
      waitUntil: "networkidle",
    });
    await editorReady();
    await page
      .getByLabel(/full name/i)
      .first()
      .fill("山田太郎");
    await expect
      .poll(() => page.getByTestId("editor-status").innerText())
      .toBe("Saved on this device");

    await captureNextBlob();
    await exportAs(/^pdf$/i);

    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 10_000 });

    expect(await dialog.textContent()).toContain(
      "These characters will be blank in the PDF: Name (山 田 太 郎)",
    );
    expect(await dialog.getByRole("button", { name: /download docx/i }).isVisible()).toBe(true);
    expect(await dialog.getByRole("button", { name: /download html/i }).isVisible()).toBe(true);

    await dialog.getByRole("button", { name: /^cancel$/i }).click();
    await dialog.waitFor({ state: "hidden" });

    expect(await exportedText(), "cancelling must not download anything").toBe("");
  });

  async function downloadFromWarning(button: RegExp): Promise<{ type: string; head: string }> {
    await captureNextBlob();
    await exportAs(/^pdf$/i);

    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 10_000 });
    await dialog.getByRole("button", { name: button }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction(
      () => Boolean((window as unknown as { __exportedBlob: Blob | null }).__exportedBlob),
      undefined,
      { timeout: 60_000 },
    );

    return page.evaluate(async () => {
      const blob = (window as unknown as { __exportedBlob: Blob }).__exportedBlob;
      const bytes = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
      return { type: blob.type, head: String.fromCharCode(...bytes) };
    });
  }

  it("S-288: 'Download PDF anyway' still downloads the PDF", async () => {
    const file = await downloadFromWarning(/download pdf anyway/i);

    expect(file.head).toBe("%PDF");
  });

  it("S-288: DOCX downloads from the warning", async () => {
    const file = await downloadFromWarning(/download docx/i);

    // A .docx is a zip.
    expect(file.head).toBe("PK\u0003\u0004");
  });

  it("warns in the editor when the VeriWorkly rail cannot hold the contact list", async () => {
    await page.setViewportSize(DESKTOP);
    const letterId = await seedDocument("/editor/cover-letter/new?template=veriworkly-special");
    await page.goto(`${server.origin}/editor/cover-letter/${letterId}`, {
      waitUntil: "networkidle",
    });
    await page.getByLabel("Location", { exact: true }).waitFor({ state: "visible" });

    const notice = page.getByRole("note").filter({ hasText: /too long for the VeriWorkly rail/ });
    const railOverflows = () =>
      page.evaluate(() =>
        [...document.querySelectorAll("article aside")].some(
          (rail) => rail.getBoundingClientRect().width > 0 && rail.scrollHeight > rail.clientHeight,
        ),
      );

    expect(await notice.count()).toBe(0);
    expect(await railOverflows()).toBe(false);

    const long = "Building 7, Unit 12, A Very Long Street Name That Goes On ".repeat(10);
    await page.getByLabel("Location", { exact: true }).fill(long);
    await page
      .getByLabel("Website", { exact: true })
      .fill(`https://example.com/${"a-long-path-segment/".repeat(25)}`);

    await notice.first().waitFor({ state: "visible" });
    // The estimate is not crying wolf: the rendered rail really is taller than the page.
    await expect.poll(railOverflows).toBe(true);
  });
});

describe("a phone scrolls the preview natively (S-351)", () => {
  let touchContext: BrowserContext;
  let touchPage: Page;

  beforeAll(async () => {
    // `isMobile` + `hasTouch` make `(pointer: coarse)` match, as on a real phone.
    touchContext = await browser.newContext({ viewport: MOBILE, isMobile: true, hasTouch: true });
    await touchContext.addCookies([
      { name: "veriworkly-guest-mode", value: "true", url: server.origin },
    ]);
    touchPage = await touchContext.newPage();
  });

  afterAll(async () => {
    await touchContext?.close();
  });

  it("S-351: the preview is a native scroll area that ends where the drawn page ends", async () => {
    await touchPage.goto(`${server.origin}/editor/resume/new?template=executive-clarity`, {
      waitUntil: "networkidle",
    });
    await touchPage.waitForFunction(() => !location.pathname.endsWith("/new"), undefined, {
      timeout: 30_000,
    });
    await touchPage.getByRole("tab", { name: /^Preview$/ }).click();
    await touchPage
      .locator("[style*='translate3d'] article.resume-page-preview")
      .first()
      .waitFor({ state: "visible" });

    const scroll = await touchPage.evaluate(() => {
      // The scaled page: the only element the shell transforms with translate3d and scale.
      const page = document.querySelector<HTMLElement>("[style*='translate3d']");
      const area = page?.parentElement;

      if (!page || !area) return null;

      return {
        overflowY: getComputedStyle(area).overflowY,
        scrollHeight: area.scrollHeight,
        clientHeight: area.clientHeight,
        drawnBottom: page.getBoundingClientRect().bottom - area.getBoundingClientRect().top,
      };
    });

    expect(scroll).not.toBeNull();
    expect(scroll!.overflowY).toBe("auto");
    // The page plus the area's bottom padding, not the unscaled page or its measuring copy.
    expect(scroll!.scrollHeight).toBeLessThanOrEqual(
      Math.max(scroll!.clientHeight, scroll!.drawnBottom + 80),
    );
  });

  it("S-351: a wheel or trackpad on a phone scrolls natively and does not also pan the page", async () => {
    const canvas = touchPage.getByRole("group", { name: /Document preview canvas/ });
    await canvas.hover();
    await touchPage.mouse.wheel(0, 400);
    // Deliberate negative check: a pan would land within a frame or two of the wheel.
    await touchPage.waitForTimeout(500);

    const transform = await touchPage.evaluate(
      () => document.querySelector<HTMLElement>("[style*='translate3d']")!.style.transform,
    );

    expect(transform).toContain("translate3d(0px, 0px, 0px)");
  });
});

describe("readable dates and renamed headings (S-296)", () => {
  const pages = () => page.locator("[data-resume-pages]");
  /** The text of every leaf element in the pages: a section heading is one on its own. */
  const leafTexts = () =>
    pages().evaluate((root) =>
      [...root.querySelectorAll("*")]
        .filter((element) => element.children.length === 0)
        .map((element) => element.textContent?.trim() ?? ""),
    );

  beforeAll(async () => {
    await page.setViewportSize(DESKTOP);
    const resumeId = await seedResume();
    await page.goto(`${server.origin}/editor/resume/${resumeId}`, { waitUntil: "networkidle" });
    await editorReady();

    // Earlier suites edit this guest document, so the role under test is set here.
    await ensureExperienceEntries(1);
    const panel = page.locator('[id="section-accordion-panel-experience"]');
    await panel
      .getByRole("combobox", { name: /experience entry to edit/i })
      .selectOption({ index: 0 });
    await panel.getByLabel("Start (YYYY-MM)").fill("2021-07");
    await panel.getByLabel("I currently work here").check();
  });

  it("S-296: the preview prints the chosen date format and updates when it changes", async () => {
    await page.getByLabel("Date format").selectOption("MMM YYYY");
    await expect.poll(() => pages().innerText()).toContain("Jul 2021 – Present");

    await page.getByLabel("Date format").selectOption("MM/YYYY");

    await expect.poll(() => pages().innerText()).toContain("07/2021 – Present");
    expect(await pages().innerText()).not.toContain("Jul 2021");
  });

  it("S-296: a renamed heading reaches the preview, and clearing it restores the default", async () => {
    await openSection("headings");

    const heading = page.getByLabel("Experience heading");
    await heading.fill("Berufserfahrung");

    await expect.poll(leafTexts).toContain("Berufserfahrung");
    expect(await leafTexts()).not.toContain("Experience");

    await heading.fill("");

    await expect.poll(leafTexts).toContain("Experience");
    expect(await leafTexts()).not.toContain("Berufserfahrung");
  });
});

describe("paper size (owner decision 9)", () => {
  /** Every rendered preview page's layout box, unaffected by the editor's zoom. */
  const pageBoxes = (selector: string) =>
    page.evaluate(
      (pageSelector) =>
        [...document.querySelectorAll<HTMLElement>(pageSelector)]
          .filter((article) => !article.closest("[aria-hidden='true']"))
          .map((article) => `${article.offsetWidth}x${article.offsetHeight}`),
      selector,
    );

  async function switchesShape(selector: string) {
    const paper = page.getByLabel("Paper size");

    expect(await paper.inputValue()).toBe("a4");
    await expect.poll(() => pageBoxes(selector)).toContain("794x1122");

    await paper.selectOption("letter");

    await expect.poll(() => pageBoxes(selector)).toContain("816x1056");
    expect(await pageBoxes(selector)).not.toContain("794x1122");

    await paper.selectOption("a4");

    await expect.poll(() => pageBoxes(selector)).toContain("794x1122");
    expect(await pageBoxes(selector)).not.toContain("816x1056");
  }

  beforeAll(async () => {
    await page.setViewportSize(DESKTOP);
  });

  it("Decision 9: switching a resume to US Letter reshapes every preview page", async () => {
    const resumeId = await seedResume();
    await page.goto(`${server.origin}/editor/resume/${resumeId}`, { waitUntil: "networkidle" });
    await editorReady();
    await openSection("typography");

    await switchesShape("article.resume-page-preview");
  });

  it("Decision 9: switching a cover letter to US Letter reshapes every preview page", async () => {
    await page.goto(`${server.origin}/editor/cover-letter/${await seedCoverLetter()}`, {
      waitUntil: "networkidle",
    });
    await page.getByLabel("Paper size").waitFor({ state: "visible", timeout: 30_000 });

    await switchesShape("article.shadow-sm");
  });
});

describe("the public share page's height (check (c))", () => {
  it.each([
    ["a4", 1122],
    ["letter", 1056],
  ])(
    "a one-page resume on %s shows, and downloads as HTML, one page tall",
    async (paper, pageHeight) => {
      await page.setViewportSize(DESKTOP);
      await page.goto(
        `${server.origin}/parity/resume/executive-clarity?mode=share&fixture=short&paper=${paper}`,
        { waitUntil: "networkidle" },
      );
      await page.waitForSelector("main[data-parity-ready='1']", { timeout: 30_000 });

      // The share page cuts the resume into the editor's pages: one page, one page tall.
      const pages = page.locator("#share-preview article.resume-page-preview");
      await pages.first().waitFor({ state: "visible" });

      expect(await pages.count()).toBe(1);
      expect(await pages.first().evaluate((element) => (element as HTMLElement).offsetHeight)).toBe(
        pageHeight,
      );

      await page.evaluate(() => {
        const w = window as unknown as { __exportedBlob: Blob | null; __realCreate?: unknown };
        const real = (w.__realCreate ??=
          URL.createObjectURL.bind(URL)) as typeof URL.createObjectURL;

        w.__exportedBlob = null;
        URL.createObjectURL = (object: Blob | MediaSource) => {
          if (object instanceof Blob) w.__exportedBlob = object;
          return real(object);
        };
      });

      await page.getByRole("button", { name: /download/i }).click();
      await page.getByRole("menuitem", { name: /html/i }).click();

      const exported = () =>
        page.evaluate(async () => {
          const blob = (window as unknown as { __exportedBlob: Blob | null }).__exportedBlob;
          return blob ? await blob.text() : "";
        });
      await expect.poll(async () => (await exported()).length).toBeGreaterThan(0);

      const file = await context.newPage();

      try {
        await file.setViewportSize(DESKTOP);
        await file.setContent(await exported());

        expect(
          await file.evaluate(() => (document.body.firstElementChild as HTMLElement).offsetHeight),
        ).toBe(pageHeight);
      } finally {
        await file.close();
      }
    },
  );
});

describe("S-134: a measuring pass that throws", () => {
  it("S-134: reaches the error boundary instead of leaving the preview stuck", async () => {
    await page.setViewportSize(DESKTOP);
    await page.goto(`${server.origin}/parity/resume/executive-clarity?mode=paged`, {
      waitUntil: "networkidle",
    });
    await page.waitForSelector("main[data-parity-ready='1']", { timeout: 30_000 });
    await expect.poll(() => page.locator("article.resume-page-preview").count()).toBeGreaterThan(0);

    // The next pass fails where it reads the template's page; a font finishing triggers one.
    await page.evaluate(() => {
      const real = window.getComputedStyle.bind(window);

      window.getComputedStyle = (element, pseudo) => {
        if ((element as HTMLElement).id === "resume-container") {
          throw new Error("S-134 measure failed");
        }
        return real(element, pseudo);
      };
      document.fonts.dispatchEvent(new Event("loadingdone"));
    });

    await page.getByText("We could not load this workspace").waitFor({ timeout: 15_000 });
  });
});

describe("S-221: from the resume editor to the ATS checker", () => {
  it("S-221: the editor offers the check, and the checker opens on that resume", async () => {
    await page.setViewportSize(DESKTOP);
    const resumeId = await seedResume();

    await page.getByRole("button", { name: /^actions$/i }).click();
    const check = page.getByRole("menuitem", { name: /check with ats/i });
    await check.waitFor({ state: "visible" });
    // A guest is asked to sign in first, as on the ATS page itself.
    expect(await check.textContent()).toContain("Sign in");
    await page.keyboard.press("Escape");

    // The ATS route's first compile under `next dev` can take most of the default 30 s.
    await page.goto(`${server.origin}/ats?document=${resumeId}`, {
      waitUntil: "networkidle",
      timeout: 90_000,
    });
    const resumeText = page.getByLabel("Resume text");

    await expect.poll(() => resumeText.inputValue()).not.toBe("");
    await page.getByText(/^Using: /).waitFor({ state: "attached" });

    await page.goto(`${server.origin}/ats`, { waitUntil: "networkidle" });
    await page.getByLabel("Resume text").waitFor({ state: "attached" });
    expect(await page.getByLabel("Resume text").inputValue()).toBe("");
  });
});

describe("S-243: the username that will be stored is the one confirmed", () => {
  it("S-243: a handle the server folds is shown, named on the button, and saved as folded", async () => {
    const tab = await context.newPage();
    const saved: string[] = [];

    try {
      await tab.route("**/api/v1/users/**", async (route) => {
        const request = route.request();
        const headers = {
          "Access-Control-Allow-Origin": server.origin,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods": "GET, PUT",
          "Access-Control-Allow-Headers":
            request.headers()["access-control-request-headers"] ?? "content-type",
        };

        if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });

        if (request.method() === "PUT") {
          const { username } = JSON.parse(request.postData() ?? "{}") as { username: string };
          saved.push(username);
          return route.fulfill({
            status: 200,
            headers,
            contentType: "application/json",
            body: JSON.stringify({ data: { id: "u1", email: "a@example.com", username } }),
          });
        }

        return route.fulfill({
          status: 200,
          headers,
          contentType: "application/json",
          body: JSON.stringify({ data: { available: true, normalizedUsername: "jane-doe" } }),
        });
      });

      await tab.goto(`${server.origin}/parity/username`, {
        waitUntil: "networkidle",
        timeout: 90_000,
      });
      await tab.getByRole("textbox", { name: "Username" }).fill("jane--doe-");

      const save = tab.getByRole("button", { name: 'Set Username "jane-doe"' });
      await save.waitFor({ state: "visible" });
      expect(await tab.getByText("It will be saved as").textContent()).toContain("jane-doe");

      await save.click();

      await expect.poll(() => tab.getByTestId("saved-username").textContent()).toBe("jane-doe");
      expect(saved).toEqual(["jane-doe"]);
    } finally {
      await tab.close();
    }
  });
});

describe("S-265: the delete dialog says where the document goes", () => {
  async function deleteDialogText() {
    await page.getByRole("button", { name: /^actions$/i }).click();
    await page.getByRole("menuitem", { name: /^delete/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    const text = (await dialog.textContent()) ?? "";
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    return text;
  }

  it("S-265: device-only until it has a cloud copy, then erased from the servers after 30 days", async () => {
    await page.setViewportSize(DESKTOP);
    // A guest at the free limit is handed their existing resume, which an earlier test may have
    // linked to a cloud copy: this one needs a document that never left the device.
    await page.goto(`${server.origin}/documents`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    const resumeId = await seedResume();

    const local = await deleteDialogText();
    expect(local).toContain("removed from this device and cannot be recovered");
    expect(local).not.toContain("30 days");

    // As if the worker had backed it up: every stored copy of its sync block names a cloud id.
    await page.evaluate((id) => {
      const link = (value: unknown): void => {
        if (!value || typeof value !== "object") return;
        const record = value as Record<string, unknown>;
        if ("cloudDocumentId" in record) record.cloudDocumentId = "cloud-s265";
        Object.values(record).forEach(link);
      };

      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index)!;
        const raw = localStorage.getItem(key) ?? "";
        if (!raw.includes(id)) continue;
        const parsed = JSON.parse(raw) as unknown;
        link(parsed);
        localStorage.setItem(key, JSON.stringify(parsed));
      }
    }, resumeId);

    await page.goto(`${server.origin}/editor/resume/${resumeId}`, { waitUntil: "networkidle" });
    await editorReady();

    expect(await deleteDialogText()).toContain("erased from our servers after 30 days");
  });
});
