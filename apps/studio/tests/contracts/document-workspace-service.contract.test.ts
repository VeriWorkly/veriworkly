import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import type { BaseDocument } from "@/features/documents/core/types";
import { defaultResume } from "@/features/resume/constants/default-resume";
import {
  saveDocument,
  createDocument,
  deleteDocument,
  setActiveDocument,
  loadDocumentById,
  flushPendingSaves,
} from "@/features/documents/services/document-workspace-service";

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

function createResumeDocument(id: string): BaseDocument {
  const now = new Date().toISOString();
  const title = `Resume ${id}`;
  const resume = {
    ...structuredClone(defaultResume),
    id,
    updatedAt: now,
    basics: {
      ...defaultResume.basics,
      fullName: title,
    },
  };

  return {
    id,
    type: "RESUME",
    title,
    templateId: resume.templateId,
    content: resume,
    updatedAt: now,
    sync: resume.sync,
  };
}

describe("document workspace service", () => {
  beforeEach(() => {
    vi.useFakeTimers();

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
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps debounced saves isolated by document id", () => {
    const first = createResumeDocument("resume-a");
    const second = createResumeDocument("resume-b");

    expect(saveDocument(first, { debounceMs: 300 })).toEqual({ ok: true, queued: true });
    expect(saveDocument(second, { debounceMs: 300 })).toEqual({ ok: true, queued: true });

    vi.advanceTimersByTime(300);

    expect(loadDocumentById("RESUME", first.id)?.title).toBe(first.title);
    expect(loadDocumentById("RESUME", second.id)?.title).toBe(second.title);
  });

  it("only clears the deleted document's pending save", () => {
    const first = createResumeDocument("resume-delete");
    const second = createResumeDocument("resume-keep");

    saveDocument(first, { debounceMs: 300 });
    saveDocument(second, { debounceMs: 300 });
    deleteDocument("RESUME", first.id);

    vi.advanceTimersByTime(300);

    expect(loadDocumentById("RESUME", first.id)).toBeNull();
    expect(loadDocumentById("RESUME", second.id)?.title).toBe(second.title);
  });

  it("returns a failed save result instead of throwing when local storage quota is exceeded", () => {
    const document = createResumeDocument("resume-quota");
    const quotaError = new DOMException("Storage quota exceeded", "QuotaExceededError");

    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw quotaError;
    });

    expect(saveDocument(document)).toEqual({ ok: false, reason: "quota-exceeded" });
  });

  /**
   * A debounced save returns `{ queued: true }` before the write happens, so the returned
   * value can never describe a quota failure. Editors report save state from `onFlush`
   * instead; without it, a full-storage autosave is invisible and the user's edits are
   * silently dropped.
   */
  it("reports a debounced write's real result through onFlush", () => {
    const document = createResumeDocument("resume-deferred");
    const onFlush = vi.fn();

    expect(saveDocument(document, { debounceMs: 300, onFlush })).toEqual({
      ok: true,
      queued: true,
    });
    expect(onFlush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith({ ok: true, queued: false });
  });

  it("reports a quota failure from a debounced write through onFlush", () => {
    const document = createResumeDocument("resume-deferred-quota");
    const onFlush = vi.fn();

    saveDocument(document, { debounceMs: 300, onFlush });

    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    });

    vi.advanceTimersByTime(300);

    expect(onFlush).toHaveBeenCalledWith({ ok: false, reason: "quota-exceeded" });
  });

  it("still performs the debounced write when no onFlush callback is supplied", () => {
    const document = createResumeDocument("resume-no-callback");

    saveDocument(document, { debounceMs: 300 });
    vi.advanceTimersByTime(300);

    expect(loadDocumentById("RESUME", document.id)?.title).toBe(document.title);
  });

  /**
   * The editors call this on unmount and on `visibilitychange` to "hidden". Without it,
   * closing the tab or backgrounding on mobile discarded whatever was typed in the last
   * 300ms — the timer never got to run.
   */
  it("persists a pending debounced save immediately when flushed", () => {
    const document = createResumeDocument("resume-flush");
    const onFlush = vi.fn();

    saveDocument(document, { debounceMs: 300, onFlush });

    expect(loadDocumentById("RESUME", document.id)).toBeNull();

    flushPendingSaves();

    // Persisted without the timer ever firing.
    expect(loadDocumentById("RESUME", document.id)?.title).toBe(document.title);
    expect(onFlush).toHaveBeenCalledWith({ ok: true, queued: false });

    // And the entry is gone, so the timer cannot write a second, staler copy afterwards.
    onFlush.mockClear();
    vi.advanceTimersByTime(300);
    expect(onFlush).not.toHaveBeenCalled();
  });

  it("leaves other document types pending when the flush is scoped to one type", () => {
    const resume = createResumeDocument("resume-scoped-flush");

    saveDocument(resume, { debounceMs: 300 });
    saveDocument(createDocument("COVER_LETTER"), { debounceMs: 300 });

    flushPendingSaves("COVER_LETTER");

    expect(loadDocumentById("RESUME", resume.id)).toBeNull();

    vi.advanceTimersByTime(300);

    expect(loadDocumentById("RESUME", resume.id)?.title).toBe(resume.title);
  });

  it("does not throw when setting the active document fails under quota pressure", () => {
    const quotaError = new DOMException("Storage quota exceeded", "QuotaExceededError");

    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw quotaError;
    });

    expect(() => setActiveDocument("RESUME", "resume-quota")).not.toThrow();
  });

  it("creates generic documents with sync enabled when workspace auto-sync is enabled", () => {
    localStorage.setItem(
      "veriworkly:workspace-settings",
      JSON.stringify({ autoSyncEnabled: true }),
    );

    const document = createDocument("COVER_LETTER");
    const saved = loadDocumentById("COVER_LETTER", document.id);

    expect(saved?.sync.enabled).toBe(true);
    expect(saved?.sync.status).toBe("pending");
  });

  it("creates generic documents as local-only when workspace auto-sync is disabled", () => {
    localStorage.setItem(
      "veriworkly:workspace-settings",
      JSON.stringify({ autoSyncEnabled: false }),
    );

    const document = createDocument("COVER_LETTER");
    const saved = loadDocumentById("COVER_LETTER", document.id);

    expect(saved?.sync.enabled).toBe(false);
    expect(saved?.sync.status).toBe("local-only");
  });
});
