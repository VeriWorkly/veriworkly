import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ConvertedResume } from "@/features/ats/types";

import type { BillingSummary } from "@/features/billing/types";
import type { BaseDocument } from "@/features/documents/core/types";
import type { ResumeData } from "@/types/resume";

import { buildWorkspaceBackup, signOutCurrentUser } from "@/features/auth/services/current-user";
import {
  purchaseFingerprint,
  recordPurchaseBaseline,
  rememberPurchaseBaseline,
  takePurchaseBaseline,
} from "@/features/billing/purchase-baseline";
import { importJsonFile } from "@/features/documents/services/import-service";
import { buildResumeFromConversion, toHttpUrl, toMonthDate } from "@/features/ats/converted-resume";
import {
  createDocument,
  listDocuments,
  loadDocumentById,
  saveDocument,
  clearWorkspaceStorage,
} from "@/features/documents/services/document-workspace-service";
import {
  isHttpUrl,
  isMonthDate,
  isYearDate,
} from "@/features/resume/schemas/resume-validation-rules";
import {
  canWorkspaceReachCloud,
  claimWorkspaceIfUncontested,
  findUnclaimedDocuments,
  resolveUnclaimedDocuments,
  setWorkspaceUser,
  settleWorkspaceOwnership,
} from "@/features/documents/services/workspace-owner";
import {
  setAllDocumentsSyncEnabled,
  syncAllPendingDocuments,
  syncDocumentNow,
} from "@/features/documents/services/document-sync";
import {
  deleteDocument,
  deleteDocumentEverywhere,
  getWorkspaceStorage,
  prepareWorkspaceStorage,
  readRecoveredEdits,
  rekeyDocument,
  saveRecoveredEdits,
  subscribeToIndexRebuilds,
} from "@/features/documents/services/document-workspace-service";
import { DOCUMENT_INDEX_STORAGE_KEY } from "@/features/documents/services/storage-keys";
import { MASTER_PROFILE_STORAGE_KEY } from "@/lib/constants";
import { createLocalStorageMock } from "@/tests/utils/local-storage";

// lib/constants reads the backend URL when it is first imported.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL ||= "http://localhost:8080/api/v1";
});

function stubBrowser(hostname: string) {
  const localStorageMock = createLocalStorageMock();
  const cookieWrites: string[] = [];

  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("window", {
    localStorage: localStorageMock,
    location: { hostname, protocol: "https:" },
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal("document", {
    get cookie() {
      return "";
    },
    set cookie(value: string) {
      cookieWrites.push(value);
    },
  });

  return { localStorageMock, cookieWrites };
}

describe("sign-out clears this device only once the server agrees", () => {
  let cookieWrites: string[];

  beforeEach(() => {
    ({ cookieWrites } = stubBrowser("app.veriworkly.com"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("S-011: a confirmed sign-out removes every document and expires the guest cookie on both domains", async () => {
    createDocument("RESUME");
    createDocument("COVER_LETTER");
    expect(listDocuments()).toHaveLength(2);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );

    await signOutCurrentUser();

    expect(listDocuments()).toHaveLength(0);
    expect(localStorage.length).toBe(0);
    expect(cookieWrites).toContainEqual(
      expect.stringMatching(/^veriworkly-guest-mode=;.*max-age=0(?!.*domain=)/),
    );
    expect(cookieWrites).toContainEqual(
      expect.stringMatching(/^veriworkly-guest-mode=;.*max-age=0.*domain=\.veriworkly\.com/),
    );
  });

  it("S-131: a failed sign-out throws and keeps the local documents", async () => {
    createDocument("RESUME");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );

    await expect(signOutCurrentUser()).rejects.toThrow(/still signed in/);
    expect(listDocuments()).toHaveLength(1);
    expect(cookieWrites).toHaveLength(0);
  });

  it("S-131: an already-expired session (401) still clears the device", async () => {
    createDocument("RESUME");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 401 })),
    );

    await signOutCurrentUser();

    expect(listDocuments()).toHaveLength(0);
  });
});

/**
 * Answers the documents API like the server: `GET /documents` lists `accountIds`, `POST`
 * creates (after `createGate`, when given), `DELETE` succeeds. Every call is recorded.
 */
function serveDocumentsApi(accountIds: string[], createGate?: Promise<void>) {
  const calls: Array<{ method: string; url: string }> = [];
  const row = (id: string) => ({
    id,
    type: "RESUME",
    title: id,
    templateId: "template",
    visibility: "PRIVATE",
    revision: 1,
    lastSyncedAt: "2026-10-26T00:00:00.000Z",
    updatedAt: "2026-10-26T00:00:00.000Z",
    createdAt: "2026-10-26T00:00:00.000Z",
  });

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push({ method, url });

      if (method === "GET") {
        return Response.json({ data: accountIds.map(row), deleted: [], serverTime: null });
      }

      if (method === "POST") {
        await createGate;
        const { id } = JSON.parse(String(init?.body)) as { id: string };
        return Response.json({ data: row(id) }, { status: 201 });
      }

      return new Response(null, { status: 204 });
    }),
  );

  return calls;
}

describe("S-283: a device's documents belong to the account that made them", () => {
  beforeEach(() => {
    stubBrowser("app.veriworkly.com");
    vi.stubGlobal("navigator", {});
  });

  afterEach(() => {
    setWorkspaceUser(null);
    vi.unstubAllGlobals();
  });

  /** What signing out does to the workspace, without the network call. */
  function signOutDevice() {
    setWorkspaceUser(null);
    clearWorkspaceStorage();
  }

  function signIn(userId: string) {
    setWorkspaceUser(userId);
    return claimWorkspaceIfUncontested(userId);
  }

  it("S-283: another account's documents are not uploaded to the next account before it chooses", async () => {
    expect(signIn("user-a")).toBe(true);
    const left = createDocument("RESUME");
    setAllDocumentsSyncEnabled(true);

    // User A's session expires without a sign-out; user B signs in on the same browser.
    const calls = serveDocumentsApi([]);
    expect(signIn("user-b")).toBe(false);
    expect(canWorkspaceReachCloud()).toBe(false);
    expect(listDocuments()).toEqual([]);

    expect((await syncDocumentNow("RESUME", left.id)).ok).toBe(false);
    await syncAllPendingDocuments();
    expect(calls.filter((call) => call.method !== "GET")).toEqual([]);

    const unclaimed = await findUnclaimedDocuments("user-b");
    expect(unclaimed).toMatchObject({ origin: "account", documents: [{ id: left.id }] });

    resolveUnclaimedDocuments("user-b", unclaimed!, "keep", false);

    // Kept documents stay on this device only, whatever bulk toggle the sign-in applies.
    expect(canWorkspaceReachCloud()).toBe(true);
    setAllDocumentsSyncEnabled(true);
    await syncAllPendingDocuments();

    // Under a fresh id: a later manual backup creates a new cloud document, never user A's.
    const [kept] = listDocuments();
    expect(kept.id).not.toBe(left.id);
    expect(loadDocumentById("RESUME", kept.id)?.sync).toMatchObject({
      enabled: false,
      status: "local-only",
      cloudDocumentId: null,
    });
    expect(calls.filter((call) => call.method !== "GET")).toEqual([]);
  });

  it("S-283: removing another account's documents clears them from this device", async () => {
    signIn("user-a");
    createDocument("RESUME");
    createDocument("COVER_LETTER");
    serveDocumentsApi([]);

    signIn("user-b");
    const unclaimed = await findUnclaimedDocuments("user-b");
    resolveUnclaimedDocuments("user-b", unclaimed!, "remove", false);

    expect(listDocuments()).toHaveLength(0);
    expect(canWorkspaceReachCloud()).toBe(true);
  });

  it("S-283: guest documents join the account only once the user agrees", async () => {
    // The device already has an owner, whose session then ended; a guest works on it.
    signIn("user-a");
    setWorkspaceUser(null);
    const guestDocument = createDocument("COVER_LETTER");
    serveDocumentsApi([]);

    expect(signIn("user-b")).toBe(false);
    expect(canWorkspaceReachCloud()).toBe(false);

    const unclaimed = await findUnclaimedDocuments("user-b");
    expect(unclaimed).toMatchObject({ origin: "guest", documents: [{ id: guestDocument.id }] });

    resolveUnclaimedDocuments("user-b", unclaimed!, "add", false);

    expect(canWorkspaceReachCloud()).toBe(true);
    expect(listDocuments().map((meta) => meta.id)).toEqual([guestDocument.id]);
  });

  it("S-283: the first sign-in after owners were introduced adopts this device's documents silently", () => {
    // Written before owners were recorded: no device owner, and entries with no owner field.
    const legacy = createDocument("RESUME");
    const index = JSON.parse(localStorage.getItem(DOCUMENT_INDEX_STORAGE_KEY)!);
    delete index.items[`RESUME:${legacy.id}`].owner;
    localStorage.setItem(DOCUMENT_INDEX_STORAGE_KEY, JSON.stringify(index));

    expect(signIn("user-a")).toBe(true);
    expect(canWorkspaceReachCloud()).toBe(true);
    expect(listDocuments().map((meta) => meta.id)).toEqual([legacy.id]);
  });

  it("S-283: a guest's documents made after a sign-out are asked about, never adopted silently", async () => {
    signIn("user-a");
    signOutDevice();
    const guestDocument = createDocument("RESUME");
    serveDocumentsApi([]);

    expect(signIn("user-b")).toBe(false);
    expect(listDocuments()).toEqual([]);
    expect(await findUnclaimedDocuments("user-b")).toMatchObject({
      origin: "guest",
      documents: [{ id: guestDocument.id }],
    });
  });

  it("S-283: claiming a device keeps the Master Profile unless another account had it", () => {
    localStorage.setItem(MASTER_PROFILE_STORAGE_KEY, "{}");

    signIn("user-a");
    expect(localStorage.getItem(MASTER_PROFILE_STORAGE_KEY)).toBe("{}");

    // An empty device that user A owned, now claimed by user B: A's cached profile goes.
    signIn("user-b");
    expect(localStorage.getItem(MASTER_PROFILE_STORAGE_KEY)).toBeNull();
  });

  it("S-283: adding guest documents never turns off backup on the account's own", async () => {
    signIn("user-a");
    const own = createDocument("RESUME");
    getWorkspaceStorage("RESUME").patchSync(own.id, { enabled: true, status: "pending" });

    setWorkspaceUser(null);
    const guestDocument = createDocument("COVER_LETTER");
    serveDocumentsApi([]);

    signIn("user-a");
    const unclaimed = await findUnclaimedDocuments("user-a");
    resolveUnclaimedDocuments("user-a", unclaimed!, "add", true);

    expect(loadDocumentById("RESUME", own.id)?.sync.enabled).toBe(true);
    expect(loadDocumentById("COVER_LETTER", guestDocument.id)?.sync).toMatchObject({
      enabled: true,
      status: "pending",
    });
  });

  it("S-283: when the account's documents cannot be listed, nothing is asked and nothing syncs", async () => {
    const linked = createDocument("RESUME");
    getWorkspaceStorage("RESUME").patchSync(linked.id, {
      enabled: true,
      status: "synced",
      cloudDocumentId: linked.id,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 503 })),
    );

    expect(signIn("user-a")).toBe(false);
    await expect(findUnclaimedDocuments("user-a")).rejects.toThrow();
    expect(canWorkspaceReachCloud()).toBe(false);
  });

  it("S-283: a lookup that keeps failing says backup is paused, and a retry that works clears it", async () => {
    const linked = createDocument("RESUME");
    getWorkspaceStorage("RESUME").patchSync(linked.id, {
      enabled: true,
      status: "synced",
      cloudDocumentId: linked.id,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 503 })),
    );

    const scheduled: Array<() => void> = [];
    const onPaused = vi.fn();
    const onSettled = vi.fn();
    setWorkspaceUser("user-a");

    const settler = settleWorkspaceOwnership(
      "user-a",
      { onUnclaimed: vi.fn(), onSettled, onPaused },
      (retry) => {
        scheduled.push(retry);
        return () => {};
      },
    );

    await vi.waitFor(() => expect(scheduled).toHaveLength(1));
    // One failure is retried quietly.
    expect(onPaused).not.toHaveBeenCalled();

    scheduled[0]();
    await vi.waitFor(() => expect(onPaused).toHaveBeenLastCalledWith(true));
    expect(onSettled).not.toHaveBeenCalled();

    serveDocumentsApi([linked.id]);
    settler.retryNow();

    await vi.waitFor(() => expect(onSettled).toHaveBeenCalledOnce());
    expect(onPaused).toHaveBeenLastCalledWith(false);
    expect(canWorkspaceReachCloud()).toBe(true);
  });

  it("S-283: documents rebuilt from a corrupt index are asked about, never adopted silently", async () => {
    signIn("user-a");
    const document = createDocument("RESUME");
    const onRebuilt = vi.fn();
    const unsubscribe = subscribeToIndexRebuilds(onRebuilt);

    localStorage.setItem(DOCUMENT_INDEX_STORAGE_KEY, "{not json");
    prepareWorkspaceStorage();
    unsubscribe();

    // Announced, so a signed-in session asks now instead of pausing backup until a reload.
    expect(onRebuilt).toHaveBeenCalledOnce();

    // Whose it is was lost with the index: shown to the device's owner, never to a guest...
    expect(listDocuments().map((meta) => meta.id)).toEqual([document.id]);
    setWorkspaceUser(null);
    expect(listDocuments()).toEqual([]);

    // ...and put to the next sign-in as a question, not adopted without asking.
    serveDocumentsApi([]);
    expect(signIn("user-a")).toBe(false);
    expect(canWorkspaceReachCloud()).toBe(false);
    expect(await findUnclaimedDocuments("user-a")).toMatchObject({
      origin: "guest",
      documents: [{ id: document.id }],
    });
  });

  it("recovered edits follow their document: removed with it, moved with a re-key", () => {
    const removed = createDocument("COVER_LETTER");
    saveRecoveredEdits("COVER_LETTER", removed.id, { held: true });
    deleteDocument("COVER_LETTER", removed.id);
    expect(readRecoveredEdits("COVER_LETTER", removed.id)).toBeNull();

    const moved = createDocument("COVER_LETTER");
    saveRecoveredEdits("COVER_LETTER", moved.id, { held: true });
    const next = rekeyDocument("COVER_LETTER", moved.id)!;

    expect(readRecoveredEdits("COVER_LETTER", moved.id)).toBeNull();
    expect(readRecoveredEdits("COVER_LETTER", next.id)?.document).toEqual({ held: true });
  });

  it("S-283: a guest never sees the documents a signed-in account left on the device", async () => {
    signIn("user-a");
    const accountDocument = createDocument("RESUME");

    // User A's session expires; someone continues as a guest.
    setWorkspaceUser(null);

    expect(listDocuments()).toEqual([]);
    expect(loadDocumentById("RESUME", accountDocument.id)).toBeNull();
    expect(JSON.parse(buildWorkspaceBackup(listDocuments()).json).documents).toEqual([]);

    const guestDocument = createDocument("RESUME");
    expect(listDocuments().map((meta) => meta.id)).toEqual([guestDocument.id]);

    // User A signs in again: their document is back, the guest's is offered, not adopted.
    serveDocumentsApi([]);
    expect(signIn("user-a")).toBe(false);
    expect(listDocuments().map((meta) => meta.id)).toEqual([accountDocument.id]);

    const unclaimed = await findUnclaimedDocuments("user-a");
    expect(unclaimed).toMatchObject({ origin: "guest", documents: [{ id: guestDocument.id }] });

    resolveUnclaimedDocuments("user-a", unclaimed!, "add", false);
    expect(listDocuments()).toHaveLength(2);
    expect(canWorkspaceReachCloud()).toBe(true);
  });

  it("S-283: a copy of the account's own cloud document is claimed without asking", async () => {
    const own = createDocument("RESUME");
    getWorkspaceStorage("RESUME").patchSync(own.id, {
      enabled: true,
      status: "synced",
      cloudDocumentId: own.id,
    });
    serveDocumentsApi([own.id]);

    expect(signIn("user-b")).toBe(false);
    expect(await findUnclaimedDocuments("user-b")).toBeNull();
    expect(canWorkspaceReachCloud()).toBe(true);
  });

  it("S-283: an empty device belongs to whoever signs in next", () => {
    expect(signIn("user-a")).toBe(true);

    // Signed out: the device is empty again, so the next account claims it without asking.
    clearWorkspaceStorage();
    expect(signIn("user-b")).toBe(true);
    expect(canWorkspaceReachCloud()).toBe(true);
  });

  it("S-318: deleting a document whose first upload is in flight deletes the copy it creates", async () => {
    signIn("user-a");
    const document = createDocument("RESUME");
    setAllDocumentsSyncEnabled(true);

    let releaseCreate: () => void = () => {};
    const calls = serveDocumentsApi(
      [],
      new Promise<void>((resolve) => {
        releaseCreate = resolve;
      }),
    );

    const sync = syncDocumentNow("RESUME", document.id);
    const removal = deleteDocumentEverywhere("RESUME", document);
    releaseCreate();
    await Promise.all([sync, removal]);

    expect(calls.map((call) => call.method)).toEqual(["POST", "DELETE"]);
    expect(listDocuments()).toHaveLength(0);
  });
});

describe("S-320: a clear in one tab reaches the others", () => {
  type Listener = (event: { data: unknown }) => void;

  class FakeChannel {
    static open: FakeChannel[] = [];
    listeners: Listener[] = [];

    constructor(readonly name: string) {
      FakeChannel.open.push(this);
    }

    postMessage(data: unknown) {
      for (const peer of FakeChannel.open) {
        if (peer !== this && peer.name === this.name) peer.listeners.forEach((l) => l({ data }));
      }
    }

    addEventListener(_type: string, listener: Listener) {
      this.listeners.push(listener);
    }

    removeEventListener(_type: string, listener: Listener) {
      this.listeners = this.listeners.filter((l) => l !== listener);
    }
  }

  beforeEach(() => {
    vi.resetModules();
    FakeChannel.open = [];
    stubBrowser("app.veriworkly.com");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function loadWorkspace(withChannel: boolean) {
    if (withChannel)
      (window as unknown as { BroadcastChannel: unknown }).BroadcastChannel = FakeChannel;
    return import("@/features/documents/services/document-workspace-service");
  }

  it("S-320: another tab's clear drops this tab's pending autosave and tells it to leave", async () => {
    const workspace = await loadWorkspace(true);
    const onCleared = vi.fn();
    workspace.subscribeToWorkspaceClears(onCleared);

    const document = workspace.createDocument("COVER_LETTER");
    const typed = { ...(document.content as object), senderName: "Typed before sign-out" };
    const updatedAt = new Date(Date.parse(document.updatedAt) + 1000).toISOString();
    workspace.saveDocument({ ...document, content: typed, updatedAt }, { debounceMs: 300 });

    new FakeChannel("veriworkly:workspace").postMessage("workspace-cleared");
    workspace.flushPendingSaves();

    expect(onCleared).toHaveBeenCalledOnce();
    const stored = workspace.loadDocumentById("COVER_LETTER", document.id)?.content;
    expect((stored as { senderName?: string }).senderName).not.toBe("Typed before sign-out");
  });

  it("S-320: a clear is announced to the other tabs, never to its own", async () => {
    const workspace = await loadWorkspace(true);
    const ownTab = vi.fn();
    workspace.subscribeToWorkspaceClears(ownTab);

    const otherTab = vi.fn();
    new FakeChannel("veriworkly:workspace").addEventListener("message", otherTab);

    workspace.clearWorkspaceStorage();

    expect(otherTab).toHaveBeenCalledWith({ data: "workspace-cleared" });
    expect(ownTab).not.toHaveBeenCalled();
  });

  it("S-320: without BroadcastChannel the storage event carries the clear", async () => {
    const workspace = await loadWorkspace(false);
    const onCleared = vi.fn();
    workspace.subscribeToWorkspaceClears(onCleared);

    workspace.clearWorkspaceStorage();
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "veriworkly:workspace-cleared",
      expect.any(String),
    );

    const storageListener = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([name]) => name === "storage")![1] as (event: unknown) => void;
    storageListener({ key: "veriworkly:workspace-cleared", newValue: "1" });

    expect(onCleared).toHaveBeenCalledOnce();
  });
});

function aiConversion(): ConvertedResume {
  return {
    basics: {
      fullName: "Jordan Lee",
      role: "Data Analyst",
      headline: "",
      email: "jordan@example.com",
      phone: "555 0100",
      location: "Austin, TX",
    },
    links: [{ label: "LinkedIn", url: "linkedin.com/in/jordanlee" }],
    summary: "Analyst.",
    experience: [
      {
        company: "Acme",
        role: "Analyst",
        location: "",
        startDate: "Jan 2020",
        endDate: "Present",
        current: false,
        summary: "",
        highlights: ["Built reports"],
      },
      {
        company: "Globex",
        role: "Intern",
        location: "",
        startDate: "June 2018",
        endDate: "12/2019",
        current: false,
        summary: "",
        highlights: [],
      },
    ],
    education: [
      {
        school: "State University",
        degree: "BSc",
        field: "Statistics",
        startDate: "Sept 2014",
        endDate: "May 2018",
        current: false,
        summary: "",
      },
    ],
    projects: [
      {
        name: "Dashboard",
        role: "",
        link: "github.com/jordan/dashboard",
        summary: "",
        highlights: [],
        skills: [],
      },
    ],
    skills: [{ name: "Tools", keywords: ["SQL"] }],
  };
}

describe("one backup file before local data is cleared", () => {
  beforeEach(() => {
    stubBrowser("app.veriworkly.com");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function seedWorkspace() {
    const resume = createDocument("RESUME");
    const letter = createDocument("COVER_LETTER");
    const content = resume.content as ResumeData;

    saveDocument(
      {
        ...resume,
        title: "Backend roles",
        content: { ...content, basics: { ...content.basics, fullName: "Priya Raman" } },
      },
      { flush: true },
    );
    saveDocument({ ...letter, title: "Globex application" }, { flush: true });
  }

  function backupFile(json: string) {
    return new File([json], "veriworkly-backup-2026-10-26.json", { type: "application/json" });
  }

  it("S-217: the backup is one dated file of full documents, detached from the cloud", () => {
    seedWorkspace();

    const backup = buildWorkspaceBackup(listDocuments(), new Date("2026-10-26T12:00:00Z"));
    const parsed = JSON.parse(backup.json);

    expect(backup.fileName).toBe("veriworkly-backup-2026-10-26.json");
    expect(parsed).toMatchObject({ format: "veriworkly-backup", version: 1 });
    expect(parsed.documents.map((item: { type: string }) => item.type).sort()).toEqual([
      "COVER_LETTER",
      "RESUME",
    ]);
    expect(
      parsed.documents.every(
        (item: { sync: { cloudDocumentId: unknown } }) => item.sync.cloudDocumentId === null,
      ),
    ).toBe(true);
  });

  it("S-217: importing the backup restores the same titles, types and content", async () => {
    seedWorkspace();
    const before = listDocuments().map((meta) => loadDocumentById(meta.type, meta.id)!);
    const backup = buildWorkspaceBackup(listDocuments());

    clearWorkspaceStorage();
    const outcome = await importJsonFile("COVER_LETTER", backupFile(backup.json), async () => null);

    expect(outcome).toMatchObject({ kind: "backup", skipped: 0, saved: { ok: true } });

    const after = listDocuments().map((meta) => loadDocumentById(meta.type, meta.id)!);
    const shape = (documents: BaseDocument[]) =>
      documents
        .map((item) => ({ type: item.type, title: item.title, templateId: item.templateId }))
        .sort((a, b) => a.type.localeCompare(b.type));

    expect(shape(after)).toEqual(shape(before));
    const restoredResume = after.find((item) => item.type === "RESUME")!.content as ResumeData;
    expect(restoredResume.basics.fullName).toBe("Priya Raman");
    // Same content apart from the identity the restored copy was given: nothing added,
    // including sample data, and nothing lost.
    const content = (documents: BaseDocument[], type: string) => {
      const { id, sync, updatedAt, ...rest } = documents.find((item) => item.type === type)!
        .content as Record<string, unknown>;
      void [id, sync, updatedAt];
      return rest;
    };
    expect(content(after, "RESUME")).toEqual(content(before, "RESUME"));
    expect(content(after, "COVER_LETTER")).toEqual(content(before, "COVER_LETTER"));
  });

  it("S-217: a free workspace restores what fits and reports the rest as skipped", async () => {
    seedWorkspace();
    const backup = buildWorkspaceBackup(listDocuments());

    const outcome = await importJsonFile("RESUME", backupFile(backup.json), async () => 1);

    expect(outcome).toMatchObject({ kind: "backup", skipped: 2 });
    expect(listDocuments()).toHaveLength(2);
  });

  it("S-217: an unreadable document fails the backup instead of being skipped", () => {
    createDocument("RESUME");
    const documents = [...listDocuments(), { ...listDocuments()[0], id: "resume-missing-body" }];

    expect(() => buildWorkspaceBackup(documents)).toThrow(/could not be read/);
  });
});

describe("purchase baseline survives the payment redirect", () => {
  beforeEach(() => {
    const store = new Map<string, string>();

    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const free = {
    plan: "FREE",
    activeProductKeys: [],
    entitlements: [],
    credits: { balance: 0 },
  } as unknown as BillingSummary;

  it("S-155: the baseline is the pre-checkout state and is read once", () => {
    rememberPurchaseBaseline("bundle", free);

    expect(takePurchaseBaseline()).toBe(purchaseFingerprint(free));
    expect(takePurchaseBaseline()).toBeNull();
  });

  it("S-155: a plan that changed before the redirect differs from the baseline", () => {
    rememberPurchaseBaseline("bundle", free);
    const paid = { ...free, plan: "BUNDLE", entitlements: ["ai_credits"] } as BillingSummary;

    expect(purchaseFingerprint(paid)).not.toBe(takePurchaseBaseline());
  });

  it("S-155: the baseline is read fresh from the server, not from the rendered page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ success: true, data: free }), { status: 200 }),
      ),
    );

    await recordPurchaseBaseline("credit_pack_250");

    expect(takePurchaseBaseline()).toBe(purchaseFingerprint(free));
  });

  it("S-155: a failed read stores no baseline, dropping any stale one", async () => {
    rememberPurchaseBaseline("bundle", free);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );

    await recordPurchaseBaseline("credit_pack_250");

    expect(takePurchaseBaseline()).toBeNull();
  });
});

describe("ATS draft: AI output becomes a resume the strict path accepts", () => {
  it("S-119: coerces links and month-name dates instead of discarding them", () => {
    expect(toHttpUrl("linkedin.com/in/x")).toBe("https://linkedin.com/in/x");
    expect(toHttpUrl("http://x.dev")).toBe("http://x.dev");
    expect(toMonthDate("Jan 2020")).toBe("2020-01");
    expect(toMonthDate("September 2021")).toBe("2021-09");
    expect(toMonthDate("3/2019")).toBe("2019-03");
    expect(toMonthDate("2020-1")).toBe("2020-01");
    expect(toMonthDate("2020")).toBe("");

    const resume = buildResumeFromConversion(aiConversion(), "resume-ats");

    expect(resume.links.items[0].url).toBe("https://linkedin.com/in/jordanlee");
    expect(resume.experience[0]).toMatchObject({
      startDate: "2020-01",
      endDate: "",
      current: true,
    });
    expect(resume.experience[1]).toMatchObject({ startDate: "2018-06", endDate: "2019-12" });
    expect(resume.education[0]).toMatchObject({ startDate: "2014", endDate: "2018" });
    expect(resume.projects[0].link).toBe("https://github.com/jordan/dashboard");
    expect(resume.basics.phone).toBe("555 0100");
  });

  it("S-119: normalises over the empty resume, not sample content", () => {
    const resume = buildResumeFromConversion(aiConversion(), "resume-ats");
    const serialized = JSON.stringify(resume).toLowerCase();

    expect(serialized).not.toMatch(/veriworkly user|alex morgan|example\.com\/alex/);
    expect(resume.id).toBe("resume-ats");
    expect(resume.languages).toEqual([]);
  });

  it("S-119: every link and date the draft carries passes the strict field rules", () => {
    const resume = buildResumeFromConversion(aiConversion(), "resume-ats");
    const urls = [
      ...resume.links.items.map((item) => item.url),
      ...resume.projects.map((item) => item.link),
    ];

    expect(urls.every((url) => url && isHttpUrl(url))).toBe(true);
    expect(
      resume.experience.every((item) => isMonthDate(item.startDate) && isMonthDate(item.endDate)),
    ).toBe(true);
    expect(
      resume.education.every((item) => isYearDate(item.startDate) && isYearDate(item.endDate)),
    ).toBe(true);
  });

  it("S-175: projects carry no hard-coded link label", () => {
    const resume = buildResumeFromConversion(aiConversion(), "resume-ats");

    expect(resume.projects[0].linkLabel).not.toBe("Link");
  });
});
