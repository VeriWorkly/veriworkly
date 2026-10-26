import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { MASTER_PROFILE_STORAGE_KEY } from "@/lib/constants";
import { defaultResume } from "@/features/resume/constants/default-resume";
import {
  createDocument,
  listDocuments,
  loadDocumentById,
} from "@/features/documents/services/document-workspace-service";
import {
  createDocumentWithinLimit,
  duplicateDocumentWithinLimit,
  hasUnlimitedDocuments,
  importDraftWithinLimit,
} from "@/features/documents/services/document-limit";
import { importJsonFile } from "@/features/documents/services/import-service";
import { createResume } from "@/features/resume/services/resume-core";
import { resolveDocumentsPerType } from "@/features/documents/editor/toolbar/useDocumentJsonImport";
import { useUserStore } from "@/store/useUserStore";
import { createLocalStorageMock } from "@/tests/utils/local-storage";

const { fetchApiData } = vi.hoisted(() => ({ fetchApiData: vi.fn() }));

vi.mock("@/utils/fetchApiData", () => ({ fetchApiData }));

/**
 * There is exactly one way to construct a resume, and it derives from the master profile.
 *
 * There used to be two: the registry's `createDefault` cloned `defaultResume` while
 * `createResume` derived from the master profile. Every ordinary creation route — the
 * sidebar, `/editor?type=resume`, `/editor/resume/new` — goes through `createDocument` and
 * therefore through the registry, so a user who filled in a master profile got generic
 * placeholder content everywhere except the post-delete fallback nobody would discover.
 */

function storeMasterProfile(overrides: Record<string, unknown>) {
  localStorage.setItem(
    MASTER_PROFILE_STORAGE_KEY,
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      profile: {
        ...structuredClone(defaultResume),
        ...overrides,
      },
    }),
  );
}

describe("resume creation contract", () => {
  beforeEach(() => {
    const localStorageMock = createLocalStorageMock();

    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", {
      localStorage: localStorageMock,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pre-fills a new resume from the stored master profile", () => {
    storeMasterProfile({
      basics: { ...defaultResume.basics, fullName: "Ada Lovelace", role: "Analytical Engineer" },
      summary: "Wrote the first algorithm intended for a machine.",
    });

    const resume = createDocument("RESUME").content as ResumeData;

    expect(resume.basics.fullName).toBe("Ada Lovelace");
    expect(resume.basics.role).toBe("Analytical Engineer");
    expect(resume.summary).toBe("Wrote the first algorithm intended for a machine.");
  });

  it("falls back to defaultResume when no master profile is stored", () => {
    expect(localStorage.getItem(MASTER_PROFILE_STORAGE_KEY)).toBeNull();

    const resume = createDocument("RESUME").content as ResumeData;

    expect(resume.basics.fullName).toBe(defaultResume.basics.fullName);
    expect(resume.summary).toBe(defaultResume.summary);
  });

  it("does not throw when the stored master profile is corrupt", () => {
    localStorage.setItem(MASTER_PROFILE_STORAGE_KEY, "{ not json");

    expect(() => createDocument("RESUME")).not.toThrow();
    expect((createDocument("RESUME").content as ResumeData).basics.fullName).toBe(
      defaultResume.basics.fullName,
    );
  });

  it("produces identical content from every creation entry point", async () => {
    storeMasterProfile({
      basics: { ...defaultResume.basics, fullName: "Grace Hopper" },
    });

    // The sidebar / EditorEntryRedirect path and the post-delete fallback path.
    const viaRegistry = createDocument("RESUME").content as ResumeData;
    const viaService = await createResume();

    // Identity necessarily differs; everything else must not.
    const withoutIdentity = (resume: ResumeData) => {
      const rest: Partial<ResumeData> = { ...resume };

      delete rest.id;
      delete rest.updatedAt;

      return rest;
    };

    expect(withoutIdentity(viaService)).toEqual(withoutIdentity(viaRegistry));
    expect(viaService.id).not.toBe(viaRegistry.id);
  });

  /**
   * The workspace auto-sync setting has to reach the *content's* sync copy too — the resume
   * store hydrates from that copy, so leaving it at the derived `local-only` meant the
   * editor's first autosave silently reverted the setting.
   */
  it("lets the workspace auto-sync setting win over the derived sync state", () => {
    localStorage.setItem(
      "veriworkly:workspace-settings",
      JSON.stringify({ autoSyncEnabled: true }),
    );

    const document = createDocument("RESUME");
    const content = document.content as ResumeData;

    expect(document.sync.enabled).toBe(true);
    expect(document.sync.status).toBe("pending");
    expect(content.sync.enabled).toBe(true);
    expect(content.sync.status).toBe("pending");
    expect(content.id).toBe(document.id);
  });
});

/**
 * The free limit (one active document per type) is enforced in one place every "new document"
 * path goes through. It used to run in the click handler before any await: a double click made
 * two documents, a billing outage made a paying customer "free", and the template link from the
 * marketing site skipped it entirely.
 */
describe("free document limit (S-069, S-194, S-215)", () => {
  /**
   * Answers `/billing/me` with `billing` (or rejects with it) and has no master profile; every
   * request takes `delayMs`.
   */
  function serveBilling(billing: { plan: string } | Error, delayMs = 0) {
    fetchApiData.mockImplementation(async (path: string) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      if (path === "/billing/me") {
        if (billing instanceof Error) throw billing;
        return billing;
      }

      return null;
    });
  }

  beforeEach(() => {
    const localStorageMock = createLocalStorageMock();

    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", {
      localStorage: localStorageMock,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      dispatchEvent: vi.fn(),
    });

    fetchApiData.mockReset();
    useUserStore.setState({ isLoggedIn: false, user: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useUserStore.setState({ isLoggedIn: false, user: null });
  });

  it("S-069: a double click creates exactly one document", async () => {
    const [first, second] = await Promise.all([
      createDocumentWithinLimit("RESUME"),
      createDocumentWithinLimit("RESUME"),
    ]);

    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, reason: "busy" });
    expect(listDocuments("RESUME")).toHaveLength(1);
  });

  it("S-069: a guest at the limit is refused and pointed at the document they have", async () => {
    const existing = createDocument("RESUME");

    const result = await createDocumentWithinLimit("RESUME");

    expect(result).toMatchObject({ ok: false, reason: "limit", existingId: existing.id });
    expect(listDocuments("RESUME")).toHaveLength(1);
    // Another type is a separate allowance.
    expect((await createDocumentWithinLimit("COVER_LETTER")).ok).toBe(true);
  });

  it("S-215: the limit message names every product that lifts it", async () => {
    createDocument("RESUME");

    const result = await createDocumentWithinLimit("RESUME");
    const message = result.ok || result.reason !== "limit" ? "" : result.message;

    for (const product of ["Creator Pro", "AI Credits", "Bundle", "pass"]) {
      expect(message).toContain(product);
    }
  });

  it("S-069: counts after the awaits, so a create elsewhere during the profile fetch is caught", async () => {
    useUserStore.setState({ isLoggedIn: true });
    serveBilling({ plan: "FREE" }, 20);

    const pending = createDocumentWithinLimit("RESUME");
    // Another tab or entry point wins the race while the master profile is in flight.
    createDocument("RESUME");

    expect(await pending).toMatchObject({ ok: false, reason: "limit" });
    expect(listDocuments("RESUME")).toHaveLength(1);
  });

  it("S-069: needs no plan for the first document, so an offline account can still create one", async () => {
    useUserStore.setState({ isLoggedIn: true });
    serveBilling(new Error("Failed to fetch"));

    expect((await createDocumentWithinLimit("RESUME")).ok).toBe(true);
    expect(fetchApiData).not.toHaveBeenCalledWith("/billing/me");
  });

  it("S-069: past the limit, a billing failure is an error, never the free plan", async () => {
    useUserStore.setState({ isLoggedIn: true });
    serveBilling(new Error("Service unavailable"));
    createDocument("RESUME");

    const result = await createDocumentWithinLimit("RESUME");

    expect(result).toEqual({
      ok: false,
      reason: "billing",
      message: "Could not check your plan: Service unavailable",
    });
    expect(listDocuments("RESUME")).toHaveLength(1);
  });

  it("S-069: a paying customer is not held to the free limit", async () => {
    useUserStore.setState({ isLoggedIn: true });
    serveBilling({ plan: "AI_CREDITS" });
    createDocument("RESUME");

    expect((await createDocumentWithinLimit("RESUME")).ok).toBe(true);
    expect(listDocuments("RESUME")).toHaveLength(2);
  });

  it("matches the server's paid predicate: any document grant, not a credit pack alone", () => {
    for (const plan of ["AI_CREDITS", "PORTFOLIO_PRO", "BUNDLE"] as const) {
      expect(hasUnlimitedDocuments({ plan })).toBe(true);
    }

    expect(hasUnlimitedDocuments({ plan: "FREE" })).toBe(false);
  });

  it("S-211: a blank resume has none of the sample or profile content", async () => {
    storeMasterProfile({
      basics: { ...defaultResume.basics, fullName: "Ada Lovelace" },
    });

    const result = await createDocumentWithinLimit("RESUME", "blank");
    const resume = (result.ok ? result.document.content : null) as ResumeData;

    expect(resume.basics.fullName).toBe("");
    expect(resume.summary).toBe("");
  });

  it("S-215: a new resume is titled 'Untitled resume', not the person's name", () => {
    storeMasterProfile({
      basics: { ...defaultResume.basics, fullName: "Ada Lovelace" },
    });

    const created = createDocument("RESUME");

    expect(created.title).toBe("Untitled resume");
    expect((created.content as ResumeData).title).toBe("Untitled resume");
  });

  it("S-215: Duplicate copies the content into a new, unsynced document under the limit", async () => {
    useUserStore.setState({ isLoggedIn: true });
    serveBilling({ plan: "BUNDLE" });

    const source = createDocument("COVER_LETTER");
    const result = await duplicateDocumentWithinLimit(source);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.document.id).not.toBe(source.id);
    expect(result.document.title).toBe(`${source.title} (copy)`);
    expect(result.document.sync.cloudDocumentId).toBeNull();
    expect(loadDocumentById("COVER_LETTER", result.document.id)?.content).toEqual(source.content);

    // A free user at the limit cannot duplicate their way past it.
    serveBilling({ plan: "FREE" });
    expect(await duplicateDocumentWithinLimit(source)).toMatchObject({ reason: "limit" });
  });

  it("restoring a backup asks for the plan only when it would go past the free limit", async () => {
    useUserStore.setState({ isLoggedIn: true });
    serveBilling(new Error("Failed to fetch"));

    const backup = new File(
      [JSON.stringify({ format: "veriworkly-backup", documents: [{ type: "RESUME" }] })],
      "backup.json",
    );

    expect(await resolveDocumentsPerType(true, backup)).toBe(1);
    expect(fetchApiData).not.toHaveBeenCalled();

    createDocument("RESUME");
    await expect(resolveDocumentsPerType(true, backup)).rejects.toThrow("Failed to fetch");

    serveBilling({ plan: "BUNDLE" });
    expect(await resolveDocumentsPerType(true, backup)).toBeNull();
  });

  it("S-286: an imported letter becomes a new document and never overwrites the open one", async () => {
    useUserStore.setState({ isLoggedIn: true });
    serveBilling({ plan: "BUNDLE" });

    const open = createDocument("COVER_LETTER");
    const content = { ...(open.content as CoverLetterContent), senderName: "Imported Sender" };

    const result = await importDraftWithinLimit("COVER_LETTER", {
      title: "Imported letter",
      templateId: open.templateId,
      content,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.document.id).not.toBe(open.id);
    expect(loadDocumentById("COVER_LETTER", open.id)?.content).toEqual(open.content);
    expect(
      (loadDocumentById("COVER_LETTER", result.document.id)?.content as CoverLetterContent)
        .senderName,
    ).toBe("Imported Sender");
  });

  it("S-307: an import is held to the free limit like any new document", async () => {
    const open = createDocument("RESUME");

    const result = await importDraftWithinLimit("RESUME", {
      title: "Imported resume",
      templateId: open.templateId,
      content: open.content,
    });

    expect(result).toMatchObject({ ok: false, reason: "limit", existingId: open.id });
    expect(listDocuments("RESUME")).toHaveLength(1);
  });

  it("S-307: reading a single JSON file writes nothing until the limit allows it", async () => {
    const open = createDocument("RESUME");
    const file = new File([JSON.stringify(open)], "resume.json", { type: "application/json" });

    const outcome = await importJsonFile("RESUME", file, async () => 1);

    expect(outcome.kind).toBe("document");
    expect(listDocuments("RESUME")).toHaveLength(1);
  });
});
