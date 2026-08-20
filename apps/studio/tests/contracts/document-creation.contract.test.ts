import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import type { ResumeData } from "@/types/resume";

import { MASTER_PROFILE_STORAGE_KEY } from "@/lib/constants";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { createDocument } from "@/features/documents/services/document-workspace-service";
import { createResume } from "@/features/resume/services/resume-core";

/**
 * There is exactly one way to construct a resume, and it derives from the master profile.
 *
 * There used to be two: the registry's `createDefault` cloned `defaultResume` while
 * `createResume` derived from the master profile. Every ordinary creation route — the
 * sidebar, `/editor?type=resume`, `/editor/resume/new` — goes through `createDocument` and
 * therefore through the registry, so a user who filled in a master profile got generic
 * placeholder content everywhere except the post-delete fallback nobody would discover.
 */

function createLocalStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

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
