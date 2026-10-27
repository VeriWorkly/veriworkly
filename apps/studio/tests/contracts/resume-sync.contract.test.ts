import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ResumeData } from "@/types/resume";

import { defaultResume } from "@/features/resume/constants/default-resume";
import { useResumeStore } from "@/features/resume/store/resume-store";
import {
  readResumeById,
  saveResume,
  toResumeDocument,
} from "@/features/resume/services/resume-core";
import {
  flushPendingSaves,
  getWorkspaceStorage,
  loadDocumentById,
  renameDocument,
} from "@/features/documents/services/document-workspace-service";
import { createLocalStorageMock } from "@/tests/utils/local-storage";

/**
 * What the resume editor's own save path does to the stored copy: the rename made in the
 * library, the cloud link the sync worker recorded, and a failed write. Real storage throughout
 * (over the in-memory `localStorage`), so these fail when the editor would lose either.
 */

const RESUME_ID = "resume-sync";

function storedResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    ...structuredClone(defaultResume),
    id: RESUME_ID,
    title: "Old name",
    sync: { ...defaultResume.sync, enabled: true, status: "pending" },
    ...overrides,
  };
}

/** What the editor does on open: load the stored resume into the store and save it back. */
function openInEditor() {
  const resume = readResumeById(RESUME_ID);
  expect(resume).not.toBeNull();

  useResumeStore.getState().setResume(resume!);
  return useResumeStore.getState().saveToStorage({ flush: true });
}

describe("resume editor saves against the stored copy", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();

    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", {
      localStorage: localStorageMock,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      dispatchEvent: vi.fn(),
    });

    getWorkspaceStorage("RESUME").persistMany([toResumeDocument(storedResume())]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("S-157 S-170: a resume renamed in the library keeps the new name once the editor opens it", () => {
    expect(renameDocument("RESUME", RESUME_ID, "New name")?.saved.ok).toBe(true);

    expect(openInEditor().ok).toBe(true);

    // The next keystroke's autosave rebuilds the envelope from the editor's copy again.
    useResumeStore.getState().updateBasics({ headline: "Typed after opening" });
    useResumeStore.getState().saveToStorage({ debounceMs: 300 });
    flushPendingSaves("RESUME");

    const stored = loadDocumentById("RESUME", RESUME_ID);
    expect(stored?.title).toBe("New name");
    expect((stored?.content as ResumeData).title).toBe("New name");
    expect((stored?.content as ResumeData).basics.headline).toBe("Typed after opening");
  });

  it("S-170 S-002: the editor's save keeps the cloud link the sync recorded after it opened", () => {
    openInEditor();

    // The worker finishes the first upload while the editor still holds the unlinked copy.
    getWorkspaceStorage("RESUME").patchSync(RESUME_ID, {
      cloudDocumentId: "cloud-9",
      revision: 4,
      status: "synced",
    });
    expect(useResumeStore.getState().resume.sync.cloudDocumentId).toBeFalsy();

    useResumeStore.getState().updateBasics({ headline: "Typed after the sync" });
    useResumeStore.getState().saveToStorage({ flush: true });

    expect(loadDocumentById("RESUME", RESUME_ID)?.sync).toMatchObject({
      cloudDocumentId: "cloud-9",
      revision: 4,
      status: "pending",
    });
  });

  it("reports a queued autosave as queued, and a failed write with its reason", () => {
    const resume = storedResume();
    resume.basics = { ...resume.basics, headline: "An edit worth writing" };

    expect(saveResume(resume, { debounceMs: 300 })).toEqual({ ok: true, queued: true });

    localStorageMock.setItem.mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    expect(saveResume(resume, { flush: true })).toMatchObject({
      ok: false,
      reason: "quota-exceeded",
    });
  });
});
