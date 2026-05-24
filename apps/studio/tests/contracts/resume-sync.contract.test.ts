import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResumeData } from "@/types/resume";
import type { BaseDocument } from "@/features/documents/core/types";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { saveResume, setAllResumesSyncEnabled } from "@/features/resume/services/resume-core";

const state = {
  byId: new Map<string, BaseDocument>(),
  activeId: defaultResume.id,
  lastSaveOptions: undefined as { debounceMs?: number; flush?: boolean } | undefined,
  nextSaveResult: { ok: true, queued: false } as
    | { ok: true; queued: boolean }
    | { ok: false; reason: "quota-exceeded" | "unknown" },
};

function cloneResume(input: ResumeData): ResumeData {
  return JSON.parse(JSON.stringify(input)) as ResumeData;
}

function cloneDoc(input: BaseDocument): BaseDocument {
  return JSON.parse(JSON.stringify(input)) as BaseDocument;
}

function wrapResume(resume: ResumeData): BaseDocument {
  return {
    id: resume.id,
    type: "RESUME",
    title: resume.basics.fullName || "Resume",
    templateId: resume.templateId,
    content: resume,
    updatedAt: resume.updatedAt,
    sync: resume.sync,
  };
}

vi.mock("@/features/documents/services/document-workspace-service", () => {
  return {
    saveDocument: vi.fn((doc: BaseDocument, options?: { debounceMs?: number; flush?: boolean }) => {
      state.byId.set(doc.id, cloneDoc(doc));
      state.lastSaveOptions = options;
      return state.nextSaveResult;
    }),
    loadDocumentById: vi.fn((_type: string, id: string) => {
      return state.byId.get(id) ?? null;
    }),
    deleteDocument: vi.fn((_type: string, id: string) => {
      void _type;
      state.byId.delete(id);
    }),
    listFullDocuments: vi.fn((_type: string) => {
      void _type;
      return Array.from(state.byId.values()).map((doc) => cloneDoc(doc));
    }),
    setActiveDocument: vi.fn((_type: string, id: string) => {
      void _type;
      state.activeId = id;
    }),
  };
});

vi.mock("@/features/documents/services/workspace-settings", () => ({
  loadWorkspaceSettingsFromLocalStorage: vi.fn(() => ({
    autoSyncEnabled: false,
  })),
}));

vi.mock("@/features/resume/services/master-profile", () => ({
  deriveResumeFromMasterProfile: vi.fn((id: string) => ({
    ...cloneResume(defaultResume),
    id,
  })),
}));

describe("resume sync contract", () => {
  beforeEach(() => {
    state.byId.clear();
    state.lastSaveOptions = undefined;
    state.nextSaveResult = { ok: true, queued: false };

    const first = cloneResume(defaultResume);
    const second = cloneResume(defaultResume);

    first.id = "resume-1";
    second.id = "resume-2";

    state.byId.set(first.id, wrapResume(first));
    state.byId.set(second.id, wrapResume(second));
    state.activeId = first.id;
  });

  it("enables sync for all saved resumes", () => {
    const result = setAllResumesSyncEnabled(true);

    expect(result.ok).toBe(true);

    const items = Array.from(state.byId.values());

    expect(items.every((doc) => doc.sync.enabled)).toBe(true);
    expect(items.every((doc) => doc.sync.status === "pending")).toBe(true);
  });

  it("disables sync for all saved resumes", () => {
    const result = setAllResumesSyncEnabled(false);

    expect(result.ok).toBe(true);

    const items = Array.from(state.byId.values());

    expect(items.every((doc) => !doc.sync.enabled)).toBe(true);
    expect(items.every((doc) => doc.sync.status === "local-only")).toBe(true);
  });

  it("passes save options and storage failures through saveResume", () => {
    const resume = cloneResume(defaultResume);
    resume.id = "resume-options";
    state.nextSaveResult = { ok: true, queued: true };

    const debounced = saveResume(resume, { debounceMs: 300 });

    expect(debounced).toEqual({ ok: true, queued: true });
    expect(state.lastSaveOptions).toEqual({ debounceMs: 300 });

    state.nextSaveResult = { ok: false, reason: "quota-exceeded" };

    const failed = saveResume(resume, { flush: true });

    expect(failed).toEqual({ ok: false, reason: "quota-exceeded" });
    expect(state.lastSaveOptions).toEqual({ flush: true });
  });
});
