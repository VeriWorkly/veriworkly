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
  await page.getByRole("button", { name: new RegExp(`^${label}$`) }).click();
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
  const ACTIVE_KEY = "veriworkly:docs:v2:active";

  function readActivePointer(): Promise<string | null> {
    return page.evaluate((key) => localStorage.getItem(key), ACTIVE_KEY);
  }

  it("leaves the active document pointer where the editor left it", async () => {
    await page.setViewportSize(DESKTOP);

    const other = await seedResume();
    const opened = await seedResume();

    // Opening an editor is the one place that legitimately claims the active pointer.
    await page.goto(`${server.origin}/editor/resume/${opened}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1_200);

    expect(await readActivePointer()).toBe(`RESUME:${opened}`);

    await page.goto(`${server.origin}/editor/resume/${other}/preview`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1_500);

    // Merely looking at a document must not repoint what other surfaces open by default.
    expect(await readActivePointer()).toBe(`RESUME:${opened}`);
  });

  it("still renders the previewed document", async () => {
    expect(await page.getByText(/document not found/i).count()).toBe(0);
    expect(await page.locator("#resume-container").count()).toBeGreaterThan(0);
  });

  it("still updates the pointer when the editor opens that document", async () => {
    const previewed = page.url().split("/").slice(-2)[0];

    await page.goto(`${server.origin}/editor/resume/${previewed}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1_200);

    expect(await readActivePointer()).toBe(`RESUME:${previewed}`);
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
    expect(await status().innerText()).toBe("Saved locally");
  });

  it("words a queued save differently from a persisted one", async () => {
    // The debounced write lands 300ms after the keystroke, so the status line must not
    // claim "Saved locally" the moment the save is merely queued.
    await page
      .getByLabel(/full name/i)
      .first()
      .fill("Queued Wording");

    expect(await status().innerText()).toBe("Saving...");

    await page.waitForTimeout(1_500);

    expect(await status().innerText()).toBe("Saved locally");
  });

  it("does the same in the cover letter editor", async () => {
    await page.goto(`${server.origin}/editor/cover-letter/${await seedCoverLetter()}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1_000);

    await page.locator("aside input:visible, aside textarea:visible").first().fill("Status Parity");

    expect(await status().innerText()).toBe("Saving...");

    await page.waitForTimeout(1_500);

    expect(await status().innerText()).toBe("Saved locally");
  });
});
