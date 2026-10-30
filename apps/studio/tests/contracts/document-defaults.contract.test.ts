import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { useUserStore } from "@/store/useUserStore";
import { fetchApiData } from "@/utils/fetchApiData";
import { WORKSPACE_SETTINGS_STORAGE_KEY } from "@/lib/constants";
import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";
import { getDocumentDefinition } from "@/features/documents/core/registry";
import { useCoverLetterStore } from "@/features/cover-letter/store/cover-letter-store";
import {
  loadWorkspaceSettingsFromLocalStorage,
  setAutoSyncEnabledInLocalStorage,
} from "@/features/documents/services/workspace-settings";
import { createLocalStorageMock } from "@/tests/utils/local-storage";

/**
 * What a new or reset document starts from, and the small local state around it: the cover
 * letter's title, the workspace settings, and whether a 401 signs a guest out.
 */

const clearInvalidSessionAndRedirect = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("@/lib/invalid-session", () => ({
  isInvalidSessionResponse: (_path: string, status: number) => status === 401,
  clearInvalidSessionAndRedirect,
}));

let localStorageMock: ReturnType<typeof createLocalStorageMock>;

beforeEach(() => {
  localStorageMock = createLocalStorageMock();

  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("window", { localStorage: localStorageMock, dispatchEvent: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  useUserStore.getState().logout();
});

describe("new documents (S-211)", () => {
  it("S-211: a guest's first resume and letter are the sample, so a first visit is not blank", () => {
    const resume = getDocumentDefinition("RESUME").createDefault("resume-1").content as ResumeData;
    const letter = getDocumentDefinition("COVER_LETTER").createDefault("letter-1")
      .content as CoverLetterContent;

    expect(resume.basics.fullName).not.toBe("");
    expect(letter.senderName).not.toBe("");
  });

  it("S-211: a signed-in user with no profile starts blank, never as someone else", () => {
    useUserStore.getState().setUser({ email: "ada@example.com" } as never);

    const resume = getDocumentDefinition("RESUME").createDefault("resume-1").content as ResumeData;
    const letter = getDocumentDefinition("COVER_LETTER").createDefault("letter-1")
      .content as CoverLetterContent;

    expect(resume.basics.fullName).toBe("");
    expect(resume.experience).toEqual([]);
    expect(letter.senderName).toBe("");
    expect(letter.body).toBe("");
  });

  it("Decision 9: every new resume and letter, sample or blank, is A4", () => {
    for (const signedIn of [false, true]) {
      if (signedIn) useUserStore.getState().setUser({ email: "ada@example.com" } as never);

      const resume = getDocumentDefinition("RESUME").createDefault("resume-1")
        .content as ResumeData;
      const letter = getDocumentDefinition("COVER_LETTER").createDefault("letter-1")
        .content as CoverLetterContent;

      expect(resume.customization.paperSize).toBe("a4");
      expect(letter.appearance.paperSize).toBe("a4");
    }
  });

  it("S-211: the sample letter is not addressed to VeriWorkly and names no founder", () => {
    expect(JSON.stringify(createDefaultCoverLetter("letter-1"))).not.toMatch(/veriworkly|gautam/i);
  });
});

describe("cover letter store (S-123, S-129)", () => {
  beforeEach(() => {
    const sample = createDefaultCoverLetter("letter-1");

    useCoverLetterStore.getState().setDocument({
      ...sample,
      templateId: "modern",
      sync: { ...sample.sync, cloudDocumentId: "cloud-1", revision: 4 },
      content: {
        ...sample.content,
        appearance: { ...sample.content.appearance, accentColor: "#ff0000", paperSize: "letter" },
        language: "fr",
      },
    });
  });

  it("S-123: the title follows the target while it is still the derived one", () => {
    useCoverLetterStore.getState().updateContent({ companyName: "Globex" });

    expect(useCoverLetterStore.getState().document?.title).toBe("Product Engineer - Globex");
  });

  it("S-123: a renamed letter keeps its name when the target changes", () => {
    useCoverLetterStore.getState().updateTitle("My application");
    useCoverLetterStore.getState().updateContent({ companyName: "Globex" });

    expect(useCoverLetterStore.getState().document?.title).toBe("My application");
  });

  for (const action of ["resetDocument", "emptyDocument"] as const) {
    it(`S-129 S-296: ${action} keeps template, appearance, title, language and sync linkage`, () => {
      useCoverLetterStore.getState().updateTitle("My application");
      useCoverLetterStore.getState()[action]();

      const document = useCoverLetterStore.getState().document;

      expect(document?.title).toBe("My application");
      expect(document?.templateId).toBe("modern");
      expect(document?.content.appearance.accentColor).toBe("#ff0000");
      expect(document?.content.appearance.paperSize).toBe("letter");
      expect(document?.sync.cloudDocumentId).toBe("cloud-1");
      expect(document?.content.language).toBe("fr");
      expect(document?.content.senderName).toBe("");
    });
  }
});

describe("workspace settings (S-132)", () => {
  it("S-132: round-trips the auto-sync choice and reports the write", () => {
    expect(setAutoSyncEnabledInLocalStorage(true)).toEqual({ ok: true });
    expect(loadWorkspaceSettingsFromLocalStorage().autoSyncEnabled).toBe(true);
  });

  it("S-132: a failed write is reported, not swallowed", () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    expect(setAutoSyncEnabledInLocalStorage(true)).toEqual({
      ok: false,
      reason: "quota-exceeded",
    });
  });

  it("S-132: an unreadable value is left in place instead of being reset to off", () => {
    localStorageMock.setItem(WORKSPACE_SETTINGS_STORAGE_KEY, "{ not json");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(loadWorkspaceSettingsFromLocalStorage().autoSyncEnabled).toBe(false);
    expect(localStorageMock.getItem(WORKSPACE_SETTINGS_STORAGE_KEY)).toBe("{ not json");
  });
});

describe("fetchApiData session redirect (S-012, S-200)", () => {
  beforeEach(() => {
    clearInvalidSessionAndRedirect.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ message: "Sign in" }), { status: 401 })),
      ),
    );
  });

  it("S-012: a call that opts out reports the 401 instead of signing out", async () => {
    await expect(
      fetchApiData("https://api.example.test/ai/generate", {
        method: "POST",
        redirectOnInvalidSession: false,
      }),
    ).rejects.toMatchObject({ status: 401, message: "Sign in" });

    expect(clearInvalidSessionAndRedirect).not.toHaveBeenCalled();
  });

  it("S-012: every other call still clears an expired session", async () => {
    // The page is navigating to /login, so the call never settles: no "Request failed: 401"
    // toast flashes on the way out (S-150).
    const outcome = Promise.race([
      fetchApiData("https://api.example.test/billing/me").then(
        () => "resolved",
        () => "rejected",
      ),
      new Promise((resolve) => setTimeout(() => resolve("pending"), 50)),
    ]);

    expect(await outcome).toBe("pending");
    expect(clearInvalidSessionAndRedirect).toHaveBeenCalledTimes(1);
  });
});
