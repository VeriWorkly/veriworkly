import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import type { BaseDocument } from "@/features/documents/core/types";
import { defaultResume } from "@/features/resume/constants/default-resume";
import {
  saveDocument,
  deleteDocument,
  loadDocumentById,
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
});
