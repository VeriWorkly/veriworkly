import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import type { BaseDocument } from "@/features/documents/core/types";
import { defaultResume } from "@/features/resume/constants/default-resume";
import {
  DOCUMENT_INDEX_STORAGE_KEY,
  getDocumentKey,
  getLegacyDocumentCollectionKey,
} from "@/features/documents/services/storage-keys";

function createLocalStorageMock() {
  const store = new Map<string, string>();

  return {
    store,
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

function createResumeDocument(id: string, role = "Engineer"): BaseDocument {
  const now = new Date().toISOString();
  const resume = {
    ...structuredClone(defaultResume),
    id,
    updatedAt: now,
    basics: { ...defaultResume.basics, fullName: `Resume ${id}`, role },
  };

  return {
    id,
    type: "RESUME",
    title: `Resume ${id}`,
    templateId: resume.templateId,
    content: resume,
    updatedAt: now,
    sync: resume.sync,
  };
}

let storageMock: ReturnType<typeof createLocalStorageMock>;

/**
 * The storage modules memoize both the per-type LocalStorageService and the index
 * revision, so each test needs a fresh module graph against a fresh mock.
 */
async function loadStorageModules() {
  vi.resetModules();

  return {
    workspace: await import("@/features/documents/services/document-workspace-service"),
    library: await import("@/features/documents/services/document-library"),
    index: await import("@/features/documents/services/document-index"),
  };
}

describe("document storage layout", () => {
  beforeEach(() => {
    storageMock = createLocalStorageMock();

    vi.stubGlobal("localStorage", storageMock);
    vi.stubGlobal("window", {
      localStorage: storageMock,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("stores each document under its own key rather than one shared blob", async () => {
    const { workspace } = await loadStorageModules();

    workspace.saveDocument(createResumeDocument("resume-a"), { flush: true });
    workspace.saveDocument(createResumeDocument("resume-b"), { flush: true });

    expect(storageMock.store.has(getDocumentKey("RESUME", "resume-a"))).toBe(true);
    expect(storageMock.store.has(getDocumentKey("RESUME", "resume-b"))).toBe(true);
    expect(storageMock.store.has(getLegacyDocumentCollectionKey("RESUME"))).toBe(false);
  }, 15000);

  it("keeps document bodies out of the index", async () => {
    const { workspace } = await loadStorageModules();

    workspace.saveDocument(createResumeDocument("resume-a", "Staff Engineer"), { flush: true });

    const index = JSON.parse(storageMock.store.get(DOCUMENT_INDEX_STORAGE_KEY) ?? "{}");
    const entry = index.items["RESUME:resume-a"];

    expect(entry).toMatchObject({
      id: "resume-a",
      type: "RESUME",
      title: "Resume resume-a",
      description: "Staff Engineer",
    });
    expect(entry).not.toHaveProperty("content");
  });

  it("does not read other documents' bodies when saving one document", async () => {
    const { workspace } = await loadStorageModules();

    for (let i = 0; i < 8; i += 1) {
      workspace.saveDocument(createResumeDocument(`resume-${i}`), { flush: true });
    }

    storageMock.getItem.mockClear();
    workspace.saveDocument(createResumeDocument("resume-3", "Updated"), { flush: true });

    const otherBodyReads = storageMock.getItem.mock.calls
      .map(([key]) => key)
      .filter(
        (key) =>
          key.startsWith("veriworkly:docs:v3:doc:") && key !== getDocumentKey("RESUME", "resume-3"),
      );

    expect(otherBodyReads).toEqual([]);
  });

  it("does not read any document body to build the library snapshot", async () => {
    const { workspace, library } = await loadStorageModules();

    for (let i = 0; i < 8; i += 1) {
      workspace.saveDocument(createResumeDocument(`resume-${i}`), { flush: true });
    }

    storageMock.getItem.mockClear();
    const snapshot = library.getDocumentLibrarySnapshot("ALL");

    expect(snapshot.docs).toHaveLength(8);
    expect(
      storageMock.getItem.mock.calls
        .map(([key]) => key)
        .filter((key) => key.startsWith("veriworkly:docs:v3:doc:")),
    ).toEqual([]);
  });

  it("serves a cached snapshot until the index revision changes", async () => {
    const { workspace, library } = await loadStorageModules();

    workspace.saveDocument(createResumeDocument("resume-a"), { flush: true });

    const first = library.getDocumentLibrarySnapshot("ALL");
    expect(library.getDocumentLibrarySnapshot("ALL")).toBe(first);

    workspace.saveDocument(createResumeDocument("resume-b"), { flush: true });

    const second = library.getDocumentLibrarySnapshot("ALL");
    expect(second).not.toBe(first);
    expect(second.docs).toHaveLength(2);
  });

  it("does not thrash the cache when two callers ask for different filters", async () => {
    const { workspace, library } = await loadStorageModules();

    workspace.saveDocument(createResumeDocument("resume-a"), { flush: true });

    const all = library.getDocumentLibrarySnapshot("ALL");
    const resumes = library.getDocumentLibrarySnapshot("RESUME");

    // Alternating filters must both stay cached — a single-slot cache made each of
    // these evict the other, which is what made search-while-filtered rebuild per keystroke.
    expect(library.getDocumentLibrarySnapshot("ALL")).toBe(all);
    expect(library.getDocumentLibrarySnapshot("RESUME")).toBe(resumes);
  });

  it("migrates a v2 collection blob into per-document keys once", async () => {
    const legacyA = createResumeDocument("legacy-a", "Designer");
    const legacyB = createResumeDocument("legacy-b", "Analyst");

    storageMock.store.set(
      getLegacyDocumentCollectionKey("RESUME"),
      JSON.stringify({ version: 2, items: { [legacyA.id]: legacyA, [legacyB.id]: legacyB } }),
    );

    const { workspace } = await loadStorageModules();

    expect(workspace.loadDocumentById("RESUME", "legacy-a")?.title).toBe("Resume legacy-a");
    expect(workspace.loadDocumentById("RESUME", "legacy-b")?.title).toBe("Resume legacy-b");

    expect(storageMock.store.has(getDocumentKey("RESUME", "legacy-a"))).toBe(true);
    expect(storageMock.store.has(getDocumentKey("RESUME", "legacy-b"))).toBe(true);

    // The legacy blob is removed only after every document has been rewritten.
    expect(storageMock.store.has(getLegacyDocumentCollectionKey("RESUME"))).toBe(false);

    expect(
      workspace
        .listDocumentIndexEntries("RESUME")
        .map((entry) => entry.description)
        .sort(),
    ).toEqual(["Analyst", "Designer"]);
  });

  it("keeps the legacy blob when migration cannot finish, so it retries", async () => {
    const legacy = createResumeDocument("legacy-quota");

    storageMock.store.set(
      getLegacyDocumentCollectionKey("RESUME"),
      JSON.stringify({ version: 2, items: { [legacy.id]: legacy } }),
    );

    storageMock.setItem.mockImplementation((key: string) => {
      if (key.startsWith("veriworkly:docs:v3:doc:")) {
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      }
      storageMock.store.set(key, "{}");
    });

    const { workspace } = await loadStorageModules();
    workspace.loadDocumentById("RESUME", "legacy-quota");

    expect(storageMock.store.has(getLegacyDocumentCollectionKey("RESUME"))).toBe(true);
  });

  it("recovers from a corrupted index instead of throwing", async () => {
    storageMock.store.set(DOCUMENT_INDEX_STORAGE_KEY, "{not json");

    const { workspace } = await loadStorageModules();

    expect(() => workspace.listDocumentIndexEntries("RESUME")).not.toThrow();
    expect(workspace.listDocumentIndexEntries("RESUME")).toEqual([]);
  });

  it("removes the document body and index entry on delete", async () => {
    const { workspace } = await loadStorageModules();

    workspace.saveDocument(createResumeDocument("resume-a"), { flush: true });
    workspace.saveDocument(createResumeDocument("resume-b"), { flush: true });

    workspace.deleteDocument("RESUME", "resume-a");

    expect(storageMock.store.has(getDocumentKey("RESUME", "resume-a"))).toBe(false);
    expect(workspace.loadDocumentById("RESUME", "resume-a")).toBeNull();
    expect(workspace.listDocumentIndexEntries("RESUME").map((entry) => entry.id)).toEqual([
      "resume-b",
    ]);
  });
});
