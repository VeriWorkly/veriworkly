import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { ResumeData } from "@/types/resume";
import type { BaseDocument } from "@/features/documents/core/types";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { MASTER_PROFILE_STORAGE_KEY } from "@/lib/constants";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { normalizeResumeData } from "@/features/resume/utils/normalize-data";
import { useResumeStore } from "@/features/resume/store/resume-store";
import {
  useCoverLetterStore,
  type CoverLetterDocument,
} from "@/features/cover-letter/store/cover-letter-store";
import { ChangedElsewhereNotice } from "@/features/documents/editor/ChangedElsewhereNotice";
import {
  HELD_EDITS_MESSAGE,
  editorStatusMessage,
  shouldRefreshBeforeEditing,
} from "@/features/documents/editor/editor-load-status";
import {
  SAVE_PERSISTED_MESSAGE,
  SAVE_QUEUED_MESSAGE,
  getSaveFailureMessage,
  leavingLosesEdits,
} from "@/features/documents/services/save-failure-message";
import {
  createDocument,
  deleteDocument,
  forgetDocumentRemovedElsewhere,
  getWorkspaceStorage,
  listDocuments,
  loadDocumentById,
  rekeyDocument,
  renameDocument,
  saveDocument,
} from "@/features/documents/services/document-workspace-service";
import {
  hydrateCloudDocumentByIdToLocalStorage,
  syncDocumentNow,
} from "@/features/documents/services/document-sync";
import {
  createDocumentWithinLimit,
  freeLimitMessage,
} from "@/features/documents/services/document-limit";
import {
  setWorkspaceUser,
  confirmSessionIsViewer,
  hasDocumentsAwaitingAnswer,
  subscribeToSessionEnded,
} from "@/features/documents/services/workspace-owner";
import {
  setAutoSyncEnabledInLocalStorage,
  subscribeToWorkspaceSettings,
} from "@/features/documents/services/workspace-settings";
import {
  DOCUMENT_INDEX_STORAGE_KEY,
  getDocumentKey,
} from "@/features/documents/services/storage-keys";
import { DOCUMENT_TITLE_MAX_LENGTH } from "@/features/documents/core/document-title";
import { endBeforeStartError, validateEducation } from "@/features/resume/utils/validation";
import { importJsonWithinLimits } from "@/features/documents/editor/toolbar/useDocumentJsonImport";
import { SyncEngine } from "@/features/documents/services/sync-engine";
import { useUserStore } from "@/store/useUserStore";
import { createLocalStorageMock } from "@/tests/utils/local-storage";

const { toast } = vi.hoisted(() => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({ toast }));
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// lib/constants reads the backend URL when it is first imported.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL ||= "http://localhost:8080/api/v1";
});

const studioRoot = path.resolve(__dirname, "../..");

function stubBrowser() {
  const localStorageMock = createLocalStorageMock();
  const listeners = new Map<string, Set<(event: Event) => void>>();

  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("window", {
    localStorage: localStorageMock,
    location: { hostname: "app.veriworkly.com", protocol: "https:", pathname: "/", search: "" },
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    dispatchEvent: (event: Event) => {
      listeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
    addEventListener: (type: string, listener: (event: Event) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener: (type: string, listener: (event: Event) => void) => {
      listeners.get(type)?.delete(listener);
    },
  });

  return localStorageMock;
}

/** The documents API as a list of routes; anything unrouted is a 404. */
function stubFetch(route: (url: string, init?: RequestInit) => Response | undefined) {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({
        url,
        method: init?.method ?? "GET",
        body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      });

      return route(url, init) ?? Response.json({ message: "Not found" }, { status: 404 });
    }),
  );

  return calls;
}

function cloudRecord(document: BaseDocument, revision: number, content: unknown = document) {
  return {
    id: document.id,
    type: document.type,
    title: document.title,
    templateId: document.templateId,
    visibility: "private",
    revision,
    content,
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  stubBrowser();
  setWorkspaceUser(null);
  useUserStore.setState({ user: null, isLoggedIn: false, loading: false });
});

afterEach(() => {
  vi.unstubAllGlobals();
  setWorkspaceUser(null);
});

describe("editor conflicts and open-time refresh", () => {
  it("S-411 tells the user held edits are kept if they leave, not lost", () => {
    const html = renderToStaticMarkup(
      <ChangedElsewhereNotice
        changedElsewhere="tab"
        busy={false}
        onKeepMine={() => {}}
        onKeepOther={() => {}}
      />,
    );

    expect(html).not.toContain("lost if you leave");
    expect(html).toContain("kept and offered back");
  });

  it("S-364 a signed-in user's clean linked copy is refreshed from the cloud before editing", () => {
    const linked = (status: "synced" | "pending") => ({
      id: "resume-1",
      type: "RESUME",
      title: "Resume",
      templateId: "executive-clarity",
      updatedAt: new Date().toISOString(),
      sync: {
        enabled: true,
        status,
        cloudDocumentId: "resume-1",
        lastSyncedAt: null,
        revision: 2,
      },
    });

    expect(shouldRefreshBeforeEditing(linked("synced"), true)).toBe(true);
    // Unsynced edits are never replaced: the post-open check makes that a conflict.
    expect(shouldRefreshBeforeEditing(linked("pending"), true)).toBe(false);
    expect(shouldRefreshBeforeEditing(linked("synced"), false)).toBe(false);
    expect(
      shouldRefreshBeforeEditing(
        { ...linked("synced"), sync: { ...linked("synced").sync, cloudDocumentId: null } },
        true,
      ),
    ).toBe(false);
    expect(shouldRefreshBeforeEditing(null, true)).toBe(false);
  });

  it("S-364 the status line says the edits wait for a choice, never 'Saving...'", () => {
    expect(editorStatusMessage(SAVE_QUEUED_MESSAGE, "tab")).toBe(HELD_EDITS_MESSAGE);
    expect(editorStatusMessage(SAVE_PERSISTED_MESSAGE, "device")).toBe(HELD_EDITS_MESSAGE);
    expect(editorStatusMessage(SAVE_QUEUED_MESSAGE, null)).toBe(SAVE_QUEUED_MESSAGE);

    // A save failure is still reported as it is.
    const full = getSaveFailureMessage("quota-exceeded");
    expect(editorStatusMessage(full, "device")).toBe(full);
  });

  it("S-381 a newer cloud revision met while this copy's own sync is in flight is no conflict", async () => {
    const created = createDocument("RESUME");
    getWorkspaceStorage("RESUME").patchSync(created.id, {
      enabled: true,
      status: "syncing",
      cloudDocumentId: created.id,
      revision: 1,
    });
    // Another tab's worker started the PATCH a moment ago.
    SyncEngine.upsertOutboxItem(created.id, { state: "syncing" }, "RESUME");

    const stored = loadDocumentById("RESUME", created.id)!;
    stubFetch((url) =>
      url.endsWith(`/documents/${created.id}`)
        ? Response.json({ data: cloudRecord(stored, 2) })
        : undefined,
    );

    await hydrateCloudDocumentByIdToLocalStorage("RESUME", created.id);

    expect(loadDocumentById("RESUME", created.id)?.sync.status).toBe("syncing");
  });

  it("S-381 a 'syncing' left by a tab closed mid-request does not hide a newer cloud revision", async () => {
    const created = createDocument("RESUME");
    getWorkspaceStorage("RESUME").patchSync(created.id, {
      enabled: true,
      status: "syncing",
      cloudDocumentId: created.id,
      revision: 1,
    });

    const stored = loadDocumentById("RESUME", created.id)!;
    stubFetch((url) =>
      url.endsWith(`/documents/${created.id}`)
        ? Response.json({ data: cloudRecord(stored, 2) })
        : undefined,
    );

    await hydrateCloudDocumentByIdToLocalStorage("RESUME", created.id);

    expect(loadDocumentById("RESUME", created.id)?.sync.status).toBe("conflicted");
  });
});

describe("documents deleted or signed out elsewhere", () => {
  it("S-403 an open editor's document deleted in another tab is never written back", () => {
    const created = createDocument("RESUME");

    // Tab B deletes it: only storage changes, this tab's service never saw the delete.
    window.localStorage.removeItem(getDocumentKey("RESUME", created.id));
    const index = JSON.parse(localStorage.getItem(DOCUMENT_INDEX_STORAGE_KEY)!);
    delete index.items[`RESUME:${created.id}`];
    localStorage.setItem(DOCUMENT_INDEX_STORAGE_KEY, JSON.stringify(index));

    expect(listDocuments("RESUME")).toHaveLength(0);
    expect(forgetDocumentRemovedElsewhere("RESUME", created.id)).toBe(true);

    const typed = { ...created, updatedAt: new Date(Date.now() + 1000).toISOString() };
    expect(saveDocument(typed, { flush: true })).toEqual({ ok: false, reason: "removed" });
    expect(listDocuments("RESUME")).toHaveLength(0);
  });

  it("S-403 a document still here, or moved to a new id, is not treated as deleted", () => {
    const kept = createDocument("RESUME");
    expect(forgetDocumentRemovedElsewhere("RESUME", kept.id)).toBe(false);

    const moved = rekeyDocument("RESUME", kept.id)!;
    expect(forgetDocumentRemovedElsewhere("RESUME", kept.id)).toBe(false);
    expect(loadDocumentById("RESUME", moved.id)).not.toBeNull();
  });

  it("S-374 a session check answered 401 announces that the user was signed out", async () => {
    const ended = vi.fn();
    const unsubscribe = subscribeToSessionEnded(ended);
    vi.spyOn(console, "error").mockImplementation(() => {});

    setWorkspaceUser("user-a");
    stubFetch(() => Response.json({ message: "Unauthorized" }, { status: 401 }));

    await expect(confirmSessionIsViewer()).resolves.toBe(false);
    expect(ended).toHaveBeenCalledOnce();

    unsubscribe();
  });

  it("S-374 a check that could not reach the server announces nothing", async () => {
    const ended = vi.fn();
    const unsubscribe = subscribeToSessionEnded(ended);
    vi.spyOn(console, "error").mockImplementation(() => {});

    setWorkspaceUser("user-a");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    await expect(confirmSessionIsViewer()).resolves.toBe(false);
    expect(ended).not.toHaveBeenCalled();

    unsubscribe();
  });

  it("S-368 a guest's documents waiting to be added to the new account are known as such", () => {
    createDocument("RESUME");
    expect(hasDocumentsAwaitingAnswer()).toBe(false);

    // Signed in, not yet answered: the overview must not read as an empty account.
    setWorkspaceUser("user-a");
    expect(hasDocumentsAwaitingAnswer()).toBe(true);
  });

  it("S-380 the automatic-backup setting tells its readers when it changes", () => {
    const changed = vi.fn();
    const unsubscribe = subscribeToWorkspaceSettings(changed);

    setAutoSyncEnabledInLocalStorage(true);

    expect(changed).toHaveBeenCalled();
    unsubscribe();
  });
});

describe("the free limit counts the account's cloud documents", () => {
  function signIn() {
    setWorkspaceUser("user-a");
    useUserStore.setState({
      user: { id: "user-a", email: "a@example.com" } as never,
      isLoggedIn: true,
      loading: false,
    });
  }

  function billing(access: Record<string, unknown> = {}) {
    return Response.json({
      data: {
        plan: "FREE",
        access: { tier: "free", isPaying: false, paymentIssue: false, ...access },
      },
    });
  }

  it("S-404 a free account whose resume is only in the cloud is offered it, not a second one", async () => {
    signIn();
    const calls = stubFetch((url) => {
      if (url.includes("/documents?") && url.includes("type=RESUME")) {
        return Response.json({ data: [{ id: "cloud-resume" }], total: 1, nextCursor: null });
      }
      if (url.endsWith("/billing/me")) return billing();
    });

    const result = await createDocumentWithinLimit("RESUME", "blank");

    expect(result).toMatchObject({ ok: false, reason: "limit", existingId: "cloud-resume" });
    expect(listDocuments("RESUME")).toHaveLength(0);
    expect(calls.some((call) => call.url.endsWith("/billing/me"))).toBe(true);
  });

  it("S-404 the cloud lookup failing still lets the user start their first document here", async () => {
    signIn();
    const calls = stubFetch(() => Response.json({ message: "Down" }, { status: 503 }));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await createDocumentWithinLimit("RESUME", "blank");

    expect(calls.some((call) => call.url.includes("/documents?"))).toBe(true);
    expect(result.ok).toBe(true);
  });

  it("S-404 a cloud lookup that hangs is given up after a few seconds, not the API's 30", async () => {
    signIn();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    try {
      const pending = createDocumentWithinLimit("RESUME", "blank");
      await vi.advanceTimersByTimeAsync(5_000);

      await expect(pending).resolves.toMatchObject({ ok: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it("S-404 a first document made in another tab during the cloud lookup is counted", async () => {
    signIn();
    stubFetch((url) => {
      if (url.includes("/documents?")) {
        // Another tab makes the first resume while this one waits on the cloud.
        createDocument("RESUME");
        return Response.json({ data: [], total: 0, nextCursor: null });
      }
      if (url.endsWith("/billing/me")) return billing();
    });

    const result = await createDocumentWithinLimit("RESUME", "blank");

    expect(result).toMatchObject({ ok: false, reason: "limit" });
    expect(listDocuments("RESUME")).toHaveLength(1);
  });

  it("S-409 restoring a backup counts the resume a free account holds only in the cloud", async () => {
    signIn();
    stubFetch((url) => {
      if (url.includes("/documents?") && url.includes("type=RESUME")) {
        return Response.json({ data: [{ id: "cloud-resume" }], total: 1, nextCursor: null });
      }
      if (url.includes("/documents?")) {
        return Response.json({ data: [], total: 0, nextCursor: null });
      }
      if (url.endsWith("/billing/me")) return billing();
    });

    const resume = createDocument("RESUME");
    const letter = createDocument("COVER_LETTER");
    const backup = JSON.stringify({
      format: "veriworkly-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      documents: [resume, letter],
    });
    // The device is empty again, as on another computer after a sign-out.
    for (const document of [resume, letter]) deleteDocument(document.type, document.id);

    const outcome = await importJsonWithinLimits("RESUME", new File([backup], "backup.json"), true);

    expect(outcome).toMatchObject({ kind: "backup", skipped: 1 });
    expect(listDocuments("RESUME")).toHaveLength(0);
    expect(listDocuments("COVER_LETTER")).toHaveLength(1);
  });

  it("S-386 a customer whose card failed is told to update it, never that they are free", async () => {
    signIn();
    createDocument("RESUME");
    stubFetch((url) =>
      url.endsWith("/billing/me")
        ? billing({ tier: "ai_credits", isPaying: true, paymentIssue: true })
        : undefined,
    );

    const result = await createDocumentWithinLimit("RESUME", "blank");

    expect(result).toMatchObject({ ok: false, reason: "limit", paymentIssue: true });
    if (result.ok || result.reason !== "limit") throw new Error("expected the limit");
    expect(result.message).not.toBe(freeLimitMessage("RESUME"));
    expect(result.message).toMatch(/payment failed/i);
    expect(result.message).not.toMatch(/free/i);
  });

  it("S-386 the limit toast offers 'Update card' to a customer whose card failed", async () => {
    const { reportCreateFailure } = await import("@/components/dashboard/hooks/useCreateDocument");
    const router = { push: vi.fn() };

    reportCreateFailure(
      { ok: false, reason: "limit", message: "m", existingId: "x", paymentIssue: true },
      router as never,
    );

    const options = toast.error.mock.calls.at(-1)?.[1] as { action: { label: string } };
    expect(options.action.label).toBe("Update card");

    reportCreateFailure(
      { ok: false, reason: "limit", message: "m", existingId: "x", paymentIssue: false },
      router as never,
    );

    const free = toast.error.mock.calls.at(-1)?.[1] as { action: { label: string } };
    expect(free.action.label).toBe("Upgrade");
  });

  it("S-410 'Sample' starts a guest's resume from the sample, not their cached profile", async () => {
    localStorage.setItem(
      MASTER_PROFILE_STORAGE_KEY,
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        owner: null,
        profile: {
          ...structuredClone(defaultResume),
          basics: { ...defaultResume.basics, fullName: "Cached Person" },
        },
      }),
    );

    const result = await createDocumentWithinLimit("RESUME", "sample");
    if (!result.ok) throw new Error(result.reason);

    expect((result.document.content as ResumeData).basics.fullName).toBe(
      defaultResume.basics.fullName,
    );
  });
});

describe("titles the server accepts", () => {
  it("S-405 a long or blank title is backed up within the server's limit", async () => {
    const created = createDocument("RESUME");
    const long = "x".repeat(300);
    saveDocument(
      {
        ...created,
        title: long,
        content: { ...(created.content as ResumeData), title: long },
        updatedAt: new Date(Date.now() + 1000).toISOString(),
      },
      { flush: true },
    );

    const calls = stubFetch((url, init) =>
      init?.method === "POST"
        ? Response.json({ data: cloudRecord(created, 1) }, { status: 201 })
        : undefined,
    );

    await syncDocumentNow("RESUME", created.id);

    const post = calls.find((call) => call.method === "POST");
    expect((post?.body as { title: string }).title).toHaveLength(DOCUMENT_TITLE_MAX_LENGTH);
  });

  it("S-405 a cover letter's derived title is trimmed and never longer than the limit", () => {
    const document: CoverLetterDocument = {
      ...(createDocument("COVER_LETTER") as CoverLetterDocument),
      title: "Untitled Cover Letter",
    };
    useCoverLetterStore.setState({ document });

    useCoverLetterStore.getState().updateContent({ jobTitle: " ", companyName: "" });
    expect(useCoverLetterStore.getState().document?.title.trim()).not.toBe("");

    useCoverLetterStore.getState().updateContent({ jobTitle: "y".repeat(400) });
    expect(useCoverLetterStore.getState().document!.title.length).toBeLessThanOrEqual(
      DOCUMENT_TITLE_MAX_LENGTH,
    );
  });

  it("S-405 a pasted long title is kept to the server's limit by every rename path", () => {
    const long = "z".repeat(300);

    // The library's Rename modal.
    const created = createDocument("RESUME");
    expect(renameDocument("RESUME", created.id, long)?.document.title).toHaveLength(
      DOCUMENT_TITLE_MAX_LENGTH,
    );

    // The editors' inline rename.
    useResumeStore.setState({
      resume: normalizeResumeData({ ...structuredClone(defaultResume), id: "resume-a" }),
    });
    useResumeStore.getState().updateTitle(long);
    expect(useResumeStore.getState().resume.title).toHaveLength(DOCUMENT_TITLE_MAX_LENGTH);

    useCoverLetterStore.setState({
      document: createDocument("COVER_LETTER") as CoverLetterDocument,
    });
    useCoverLetterStore.getState().updateTitle(long);
    expect(useCoverLetterStore.getState().document?.title).toHaveLength(DOCUMENT_TITLE_MAX_LENGTH);

    // And neither input takes more than that in the first place. They render only once opened
    // (a modal, an inline rename), which a server render cannot do, so their source is read.
    for (const file of [
      "components/modals/RenameDocumentModal.tsx",
      "features/documents/editor/toolbar/ToolbarHeader.tsx",
    ]) {
      expect(readFileSync(path.join(studioRoot, file), "utf8")).toContain(
        "maxLength={DOCUMENT_TITLE_MAX_LENGTH}",
      );
    }
  });
});

describe("dates the resume prints", () => {
  it("S-413 an end date before the start date is pointed out", () => {
    expect(endBeforeStartError("2023-02", "2021-05")).toMatch(/before/i);
    expect(endBeforeStartError("2021-05", "2023-02")).toBeUndefined();
    expect(endBeforeStartError("2021-05", "")).toBeUndefined();
    expect(endBeforeStartError("", "2021-05")).toBeUndefined();

    expect(
      validateEducation({
        ...defaultResume.education[0],
        startDate: "2020",
        endDate: "2018",
        current: false,
      }).endDate,
    ).toMatch(/before/i);
  });
});

describe("destructive actions land on the document they were chosen for", () => {
  it("S-407 a reset confirmed on one resume never replaces another that opened meanwhile", () => {
    useResumeStore.setState({
      resume: normalizeResumeData({ ...structuredClone(defaultResume), id: "resume-b" }),
    });
    const before = useResumeStore.getState().resume;

    const result = useResumeStore.getState().resetResume(undefined, "resume-a");

    expect(result).toBeNull();
    expect(useResumeStore.getState().resume).toBe(before);
  });

  it("S-407 the same holds for a cover letter", () => {
    const document = createDocument("COVER_LETTER") as CoverLetterDocument;
    const typed: CoverLetterDocument = {
      ...document,
      content: { ...(document.content as CoverLetterContent), body: "Kept" },
    };
    useCoverLetterStore.setState({ document: typed });

    expect(useCoverLetterStore.getState().resetDocument(undefined, "another-letter")).toBe(false);
    expect(useCoverLetterStore.getState().document?.content.body).toBe("Kept");
  });

  it("S-408 leaving asks first while the latest edits could not be saved", () => {
    expect(leavingLosesEdits(getSaveFailureMessage("quota-exceeded"))).toBe(true);
    expect(leavingLosesEdits(getSaveFailureMessage("unknown"))).toBe(true);
    expect(leavingLosesEdits(SAVE_PERSISTED_MESSAGE)).toBe(false);
    expect(leavingLosesEdits(SAVE_QUEUED_MESSAGE)).toBe(false);
  });

  it("S-409 the empty library and first-run guide can restore a backup", async () => {
    const { CreateDocumentActions } =
      await import("@/app/(main)/(dashboard)/documents/components/CreateDocumentActions");

    const html = renderToStaticMarkup(<CreateDocumentActions showImport />);

    expect(html).toContain("Restore a backup");
  });
});
