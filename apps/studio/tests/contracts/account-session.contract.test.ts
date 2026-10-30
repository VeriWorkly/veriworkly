import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { join } from "node:path";

import type { ConvertedResume } from "@/features/ats/types";

import type { BillingSummary } from "@/features/billing/types";
import type { BaseDocument } from "@/features/documents/core/types";
import type { ResumeData } from "@/types/resume";

import { buildWorkspaceBackup, signOutCurrentUser } from "@/features/auth/services/current-user";
import { buildAccountBackup } from "@/features/profile/services/account-backup";
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
  createAccountDocumentLookup,
  findUnclaimedDocuments,
  resolveUnclaimedDocuments,
  setWorkspaceUser,
  settleWorkspaceOwnership,
} from "@/features/documents/services/workspace-owner";
import {
  getWorkspaceSyncTelemetry,
  hydrateAllDocumentsFromCloud,
  hydrateCloudDocumentByIdToLocalStorage,
  keepDocumentLocalOnly,
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
import { SyncEngine } from "@/features/documents/services/sync-engine";
import { MASTER_PROFILE_STORAGE_KEY } from "@/lib/constants";
import { createLocalStorageMock } from "@/tests/utils/local-storage";

// lib/constants reads the backend URL when it is first imported.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL ||= "http://localhost:8080/api/v1";
});

/**
 * The documents list as the server answers it: the old single reply when no `limit` is sent,
 * otherwise `limit` rows from the offset carried in `cursor`, with `nextCursor` and `total`.
 */
function documentListReply(rows: unknown[], url: string) {
  const params = new URL(url).searchParams;
  // The server pages every request, 20 by default (V-422).
  const limit = params.get("limit") ?? "20";

  const from = Number(params.get("cursor") ?? 0);
  const to = from + Number(limit);

  return Response.json({
    data: rows.slice(from, to),
    deleted: [],
    serverTime: "2026-10-27T00:00:00.000Z",
    nextCursor: to < rows.length ? String(to) : null,
    total: rows.length,
  });
}

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
 * creates (after `createGate`, when given), `DELETE` succeeds. Every call is recorded, with
 * its body.
 */
function serveDocumentsApi(accountIds: string[], createGate?: Promise<void>) {
  const calls: Array<{ method: string; url: string; body: string }> = [];
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
      calls.push({ method, url, body: typeof init?.body === "string" ? init.body : "" });

      if (method === "GET") {
        return documentListReply(accountIds.map(row), url);
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

  it("S-283: guest documents join the account only once the user agrees", async () => {
    // The device already has an owner, whose session then ended; a guest works on it.
    signIn("user-a");
    setWorkspaceUser(null);
    const guestDocument = createDocument("COVER_LETTER");
    serveDocumentsApi([]);

    expect(signIn("user-b")).toBe(false);
    expect(canWorkspaceReachCloud()).toBe(false);

    const unclaimed = await findUnclaimedDocuments("user-b");
    expect(unclaimed).toMatchObject({ documents: [{ id: guestDocument.id }] });

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
    expect(unclaimed).toMatchObject({ documents: [{ id: guestDocument.id }] });

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

  /**
   * The account's metadata list as the paging server walks it: oldest change first when
   * `updatedSince` is sent, newest first otherwise, resuming strictly after the cursor's row.
   * Rows can be edited between pages (`onPage`); tombstones come with the first sync page.
   */
  function serveOrderedAccount(
    rows: Array<{ id: string; updatedAt: string }>,
    options: { deleted?: string[]; onPage?: (page: number) => void } = {},
  ) {
    const calls: URLSearchParams[] = [];
    const sortKey = (row: { id: string; updatedAt: string }) => `${row.updatedAt}|${row.id}`;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if ((init?.method ?? "GET") !== "GET") return new Response(null, { status: 204 });

        const params = new URL(String(url)).searchParams;
        calls.push(params);

        const ascending = params.has("updatedSince");
        const limit = Number(params.get("limit"));
        const after = params.get("cursor");
        const ordered = [...rows].sort((left, right) =>
          ascending
            ? sortKey(left).localeCompare(sortKey(right))
            : sortKey(right).localeCompare(sortKey(left)),
        );
        const rest =
          after === null
            ? ordered
            : ordered.filter((row) => (ascending ? sortKey(row) > after : sortKey(row) < after));
        const pageRows = rest.slice(0, limit);
        const reply = Response.json({
          data: pageRows.map((row) => ({ ...row, type: "RESUME", title: row.id, revision: 1 })),
          deleted:
            ascending && after === null
              ? (options.deleted ?? []).map((id) => ({ id, deletedAt: "2026-10-20T00:00:00.000Z" }))
              : [],
          serverTime: "2026-10-27T00:00:00.000Z",
          nextCursor: rest.length > limit ? sortKey(pageRows[pageRows.length - 1]) : null,
          total: rows.length,
        });

        options.onPage?.(calls.length);
        return reply;
      }),
    );

    return calls;
  }

  /** `count` account rows, one minute apart, oldest first. */
  function accountRows(count: number) {
    return Array.from({ length: count }, (_, index) => ({
      id: `cloud-${String(index).padStart(3, "0")}`,
      updatedAt: new Date(Date.parse("2026-10-01T00:00:00.000Z") + index * 60_000).toISOString(),
    }));
  }

  function linkedCopy(cloudId?: string) {
    const copy = createDocument("RESUME");
    getWorkspaceStorage("RESUME").patchSync(copy.id, {
      enabled: true,
      status: "synced",
      cloudDocumentId: cloudId ?? copy.id,
    });
    return copy;
  }

  it("Part H: the account's own copy is found even when it is edited elsewhere mid-walk", async () => {
    const own = linkedCopy();
    const rows = accountRows(120);
    // The 61st oldest: on the second page either way the list is walked.
    rows[60] = { ...rows[60], id: own.id };

    const calls = serveOrderedAccount(rows, {
      // Edited on another device after the first page: it becomes the newest row.
      onPage: (page) => {
        if (page === 1) rows[60] = { id: own.id, updatedAt: "2026-10-27T00:00:00.000Z" };
      },
    });

    expect(signIn("user-b")).toBe(false);
    expect(await findUnclaimedDocuments("user-b")).toBeNull();
    expect(calls.every((params) => params.get("updatedSince") === "1970-01-01T00:00:00.000Z")).toBe(
      true,
    );
    expect(calls.every((params) => params.get("includeContent") === null)).toBe(true);
    expect(calls.map((params) => params.get("limit"))).toEqual(["50", "50", "50"]);
  });

  it("Part H: a copy of a document the account deleted is still the account's", async () => {
    const own = linkedCopy();
    serveOrderedAccount(accountRows(3), { deleted: [own.id] });

    expect(signIn("user-b")).toBe(false);
    expect(await findUnclaimedDocuments("user-b")).toBeNull();
  });

  it("Part H: the walk stops at the page where the last wanted id turns up", async () => {
    const own = linkedCopy();
    const rows = accountRows(150);
    rows[10] = { ...rows[10], id: own.id };
    const calls = serveOrderedAccount(rows);

    expect(signIn("user-b")).toBe(false);
    expect(await findUnclaimedDocuments("user-b")).toBeNull();
    expect(calls).toHaveLength(1);
  });

  it("Part H: one settle lists the account once, however often it asks", async () => {
    linkedCopy("another-accounts-document");
    const calls = serveOrderedAccount(accountRows(60));
    const lookup = createAccountDocumentLookup();

    expect(signIn("user-b")).toBe(false);
    expect(await findUnclaimedDocuments("user-b", lookup)).toMatchObject({
      cloudCopyMissing: true,
    });
    expect(calls).toHaveLength(2);

    expect(await findUnclaimedDocuments("user-b", lookup)).toMatchObject({
      cloudCopyMissing: true,
    });
    expect(calls).toHaveLength(2);
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

describe("S-372: another account's documents stay on the device, hidden for it", () => {
  beforeEach(() => {
    stubBrowser("app.veriworkly.com");
    vi.stubGlobal("navigator", {});
  });

  afterEach(() => {
    setWorkspaceUser(null);
    vi.unstubAllGlobals();
  });

  function signIn(userId: string) {
    setWorkspaceUser(userId);
    return claimWorkspaceIfUncontested(userId);
  }

  /** User A's documents, left behind by a session that expired without a sign-out. */
  function leaveAccountDocuments() {
    expect(signIn("user-a")).toBe(true);

    const pending = createDocument("RESUME");
    getWorkspaceStorage("RESUME").patchSync(pending.id, { enabled: true, status: "pending" });

    const linked = createDocument("RESUME");
    getWorkspaceStorage("RESUME").patchSync(linked.id, {
      enabled: true,
      status: "synced",
      cloudDocumentId: linked.id,
      revision: 3,
    });

    // User A kept this one off the cloud.
    const localOnly = createDocument("COVER_LETTER");

    return { pending, linked, localOnly };
  }

  function storedSync(type: "RESUME" | "COVER_LETTER", id: string) {
    return getWorkspaceStorage(type).loadById(id)?.sync;
  }

  it("S-372: the next account is not asked about them, and its sync is not held back", async () => {
    const left = leaveAccountDocuments();
    const calls = serveDocumentsApi([]);

    expect(signIn("user-b")).toBe(true);
    expect(await findUnclaimedDocuments("user-b")).toBeNull();
    expect(canWorkspaceReachCloud()).toBe(true);
    // User A's linked copy is not looked for in user B's account: it is not B's to prove.
    expect(calls).toEqual([]);

    expect(listDocuments()).toEqual([]);
    expect(loadDocumentById("RESUME", left.pending.id)).toBeNull();
    expect(loadDocumentById("COVER_LETTER", left.localOnly.id)).toBeNull();
    expect(JSON.parse(buildWorkspaceBackup(listDocuments()).json).documents).toEqual([]);
  });

  it("S-372: the next account's sync never sends them to the documents API", async () => {
    const left = leaveAccountDocuments();
    const before = {
      pending: storedSync("RESUME", left.pending.id),
      linked: storedSync("RESUME", left.linked.id),
      localOnly: storedSync("COVER_LETTER", left.localOnly.id),
    };

    signIn("user-b");
    const own = createDocument("RESUME");
    const calls = serveDocumentsApi([]);

    // The sign-in's bulk toggle, then every way a sync can start.
    setAllDocumentsSyncEnabled(true);
    await syncAllPendingDocuments();
    expect((await syncDocumentNow("RESUME", left.pending.id)).ok).toBe(false);
    expect((await keepDocumentLocalOnly("RESUME", left.linked.id)).ok).toBe(false);
    expect((await hydrateCloudDocumentByIdToLocalStorage("RESUME", left.linked.id)).ok).toBe(false);
    await expect(deleteDocumentEverywhere("RESUME", left.linked)).rejects.toThrow();

    // Only user B's own document went out, and nothing of user A's in any URL or body.
    expect(calls.map((call) => call.method)).toEqual(["POST"]);
    expect(calls.map((call) => (JSON.parse(call.body) as { id: string }).id)).toEqual([own.id]);
    for (const doc of Object.values(left)) {
      expect(calls.some((call) => call.url.includes(doc.id) || call.body.includes(doc.id))).toBe(
        false,
      );
    }
    expect(storedSync("RESUME", own.id)?.status).toBe("synced");

    expect(storedSync("RESUME", left.pending.id)).toEqual(before.pending);
    expect(storedSync("RESUME", left.linked.id)).toEqual(before.linked);
    expect(storedSync("COVER_LETTER", left.localOnly.id)).toEqual(before.localOnly);
  });

  it("S-372: a pull into the next account never writes over one of them with the same id", async () => {
    const left = leaveAccountDocuments();
    const stored = getWorkspaceStorage("RESUME").loadById(left.linked.id)!;

    signIn("user-b");
    const impostor = { ...stored, title: "From user B's cloud" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const rows =
          new URL(url).searchParams.get("type") === "RESUME"
            ? [
                {
                  id: impostor.id,
                  type: "RESUME",
                  title: impostor.title,
                  content: impostor,
                  revision: 9,
                  templateId: "template",
                  visibility: "PRIVATE",
                  lastSyncedAt: "2026-10-26T00:00:00.000Z",
                  updatedAt: "2026-10-26T00:00:00.000Z",
                  createdAt: "2026-10-26T00:00:00.000Z",
                },
              ]
            : [];

        return documentListReply(rows, url);
      }),
    );

    await hydrateAllDocumentsFromCloud({ force: true });

    expect(getWorkspaceStorage("RESUME").loadById(left.linked.id)?.title).toBe(stored.title);
    expect(storedSync("RESUME", left.linked.id)?.revision).toBe(3);
    expect(listDocuments()).toEqual([]);
  });

  it("S-372: the account that left them sees them again when it signs back in", () => {
    const left = leaveAccountDocuments();

    signIn("user-b");
    const own = createDocument("RESUME");

    expect(signIn("user-a")).toBe(true);
    expect(canWorkspaceReachCloud()).toBe(true);
    expect(
      listDocuments()
        .map((meta) => meta.id)
        .sort(),
    ).toEqual([left.pending.id, left.linked.id, left.localOnly.id].sort());
    expect(loadDocumentById("RESUME", own.id)).toBeNull();
  });

  it("S-372: signing out removes the leaving account's documents and keeps the other account's", async () => {
    const left = leaveAccountDocuments();

    signIn("user-b");
    const own = createDocument("RESUME");
    localStorage.setItem(MASTER_PROFILE_STORAGE_KEY, "{}");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );

    await signOutCurrentUser();

    expect(getWorkspaceStorage("RESUME").loadById(own.id)).toBeNull();
    expect(localStorage.getItem(MASTER_PROFILE_STORAGE_KEY)).toBeNull();
    // Hidden from whoever uses the browser next...
    expect(listDocuments()).toEqual([]);

    // ...and back, as they were, for user A.
    expect(signIn("user-a")).toBe(true);
    expect(
      listDocuments()
        .map((meta) => meta.id)
        .sort(),
    ).toEqual([left.pending.id, left.linked.id, left.localOnly.id].sort());
    expect(storedSync("RESUME", left.linked.id)).toMatchObject({
      status: "synced",
      cloudDocumentId: left.linked.id,
      revision: 3,
    });
  });

  it("S-372: signing out as an account keeps the documents still awaiting an answer", async () => {
    expect(signIn("user-a")).toBe(true);
    const own = createDocument("RESUME");
    const rebuilt = createDocument("RESUME");
    const index = JSON.parse(localStorage.getItem(DOCUMENT_INDEX_STORAGE_KEY)!);
    index.items[`RESUME:${rebuilt.id}`].owner = "unknown:index-rebuilt";
    localStorage.setItem(DOCUMENT_INDEX_STORAGE_KEY, JSON.stringify(index));
    setWorkspaceUser(null);
    const guest = createDocument("COVER_LETTER");

    // User A signs out while both are still unanswered (the question is open in another tab).
    setWorkspaceUser("user-a");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
    await signOutCurrentUser();

    expect(getWorkspaceStorage("RESUME").loadById(own.id)).toBeNull();
    expect(getWorkspaceStorage("RESUME").loadById(rebuilt.id)).not.toBeNull();
    // The guest's is still the guest's; the one of unknown owner stays hidden from a guest.
    expect(listDocuments().map((meta) => meta.id)).toEqual([guest.id]);

    serveDocumentsApi([]);
    expect(signIn("user-a")).toBe(false);
    expect(await findUnclaimedDocuments("user-a")).toMatchObject({
      cloudCopyMissing: false,
      documents: expect.arrayContaining([
        expect.objectContaining({ id: rebuilt.id }),
        expect.objectContaining({ id: guest.id }),
      ]),
    });
  });

  it("S-372: a document recorded as another account's is never offered, even when linked", async () => {
    const left = leaveAccountDocuments();
    serveDocumentsApi([left.linked.id]);

    // Even an account that holds the same id in its cloud does not adopt user A's copy.
    expect(signIn("user-b")).toBe(true);
    expect(await findUnclaimedDocuments("user-b")).toBeNull();
    expect(listDocuments()).toEqual([]);
  });

  it("S-372: a linked copy the account cannot find is put to the user, never hidden", async () => {
    // Written before owners were recorded, and linked to a cloud document since deleted.
    const copy = createDocument("RESUME");
    getWorkspaceStorage("RESUME").patchSync(copy.id, {
      enabled: true,
      status: "synced",
      cloudDocumentId: copy.id,
    });
    const index = JSON.parse(localStorage.getItem(DOCUMENT_INDEX_STORAGE_KEY)!);
    delete index.items[`RESUME:${copy.id}`].owner;
    localStorage.setItem(DOCUMENT_INDEX_STORAGE_KEY, JSON.stringify(index));

    const calls = serveDocumentsApi([]);
    expect(signIn("user-b")).toBe(false);
    const unclaimed = await findUnclaimedDocuments("user-b");
    expect(unclaimed).toEqual({
      cloudCopyMissing: true,
      documents: [expect.objectContaining({ id: copy.id })],
    });
    expect(canWorkspaceReachCloud()).toBe(false);

    // It cannot be added: the id belongs to a cloud document this account does not hold.
    expect(() => resolveUnclaimedDocuments("user-b", unclaimed!, "add", true)).toThrow();

    resolveUnclaimedDocuments("user-b", unclaimed!, "keep", true);

    // Kept under a fresh id, on this device only, whatever bulk toggle the sign-in applies.
    expect(canWorkspaceReachCloud()).toBe(true);
    const [kept] = listDocuments();
    expect(kept.id).not.toBe(copy.id);
    setAllDocumentsSyncEnabled(true);
    await syncAllPendingDocuments();
    expect(loadDocumentById("RESUME", kept.id)?.sync).toMatchObject({
      enabled: false,
      status: "local-only",
      cloudDocumentId: null,
    });
    expect(calls.filter((call) => call.method !== "GET")).toEqual([]);
  });

  it("S-372: the next account's last backup times are its own", () => {
    const left = leaveAccountDocuments();
    SyncEngine.updateTelemetry(
      left.linked.id,
      { lastAttemptAt: "2026-10-01T00:00:00.000Z", lastSuccessAt: "2026-10-01T00:00:00.000Z" },
      "RESUME",
    );

    signIn("user-b");

    expect(getWorkspaceSyncTelemetry()).toEqual({ lastAttemptAt: null, lastSuccessAt: null });
    expect(getWorkspaceSyncTelemetry("RESUME")).toEqual({
      lastAttemptAt: null,
      lastSuccessAt: null,
    });

    signIn("user-a");
    expect(getWorkspaceSyncTelemetry().lastSuccessAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("S-372: the sign-in dialog cannot show, download or keep another account's documents", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      join(__dirname, "../../features/auth/components/UnclaimedDocumentsDialog.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(/another account|onDownloadBackup|origin/);
  });
});

describe("S-239: sign-in starts the backup workers", () => {
  beforeEach(() => {
    vi.resetModules();
    stubBrowser("app.veriworkly.com");
    vi.stubGlobal("navigator", {});
  });

  afterEach(() => {
    vi.doUnmock("@/features/documents/services/document-sync");
    vi.doUnmock("sonner");
    vi.doUnmock("@/features/auth/components/UnclaimedDocumentsDialog");
    vi.unstubAllGlobals();
  });

  async function loadSession() {
    const startAllDocumentSyncWorkers = vi.fn();
    vi.doMock("@/features/documents/services/document-sync", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/features/documents/services/document-sync")>()),
      startAllDocumentSyncWorkers,
    }));
    // Its stylesheet is injected into a real document on import.
    vi.doMock("sonner", () => ({ toast: { dismiss: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
    vi.doMock("@/features/auth/components/UnclaimedDocumentsDialog", () => ({
      UnclaimedDocumentsDialog: () => null,
    }));
    const { startWorkspaceSession } = await import("@/providers/auth-provider");

    return { startWorkspaceSession, startAllDocumentSyncWorkers };
  }

  const user = { id: "user-a", email: "a@example.com", autoSyncEnabled: true };

  it("S-239: a signed-in user's workers start at once, before any editor opens", async () => {
    const { startWorkspaceSession, startAllDocumentSyncWorkers } = await loadSession();
    const setUser = vi.fn();

    expect(startWorkspaceSession(user, setUser, vi.fn())).toBeNull();

    expect(setUser).toHaveBeenCalledWith(user);
    expect(startAllDocumentSyncWorkers).toHaveBeenCalledWith({ enabled: true });
  });

  it("S-239: a guest's documents on the device hold every worker until the user chooses", async () => {
    const { startWorkspaceSession, startAllDocumentSyncWorkers } = await loadSession();
    // The same module instances auth-provider loaded (the registry was reset above).
    const owner = await import("@/features/documents/services/workspace-owner");
    const workspace = await import("@/features/documents/services/document-workspace-service");

    owner.setWorkspaceUser("user-b");
    expect(owner.claimWorkspaceIfUncontested("user-b")).toBe(true);
    owner.setWorkspaceUser(null);
    workspace.createDocument("RESUME");
    // Nothing may start while the question about the guest's document is unanswered.
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );

    const setUser = vi.fn();
    const settler = startWorkspaceSession(user, setUser, vi.fn());

    try {
      expect(settler).not.toBeNull();
      expect(setUser).toHaveBeenCalledWith(user);
      expect(startAllDocumentSyncWorkers).toHaveBeenCalledWith({ enabled: false });
      expect(startAllDocumentSyncWorkers).not.toHaveBeenCalledWith({ enabled: true });
    } finally {
      settler?.cancel();
      owner.setWorkspaceUser(null);
    }
  });

  it("S-372: another account's documents on the device hold no worker back", async () => {
    const { startWorkspaceSession, startAllDocumentSyncWorkers } = await loadSession();
    const owner = await import("@/features/documents/services/workspace-owner");
    const workspace = await import("@/features/documents/services/document-workspace-service");

    owner.setWorkspaceUser("user-b");
    expect(owner.claimWorkspaceIfUncontested("user-b")).toBe(true);
    workspace.createDocument("RESUME");

    try {
      expect(startWorkspaceSession(user, vi.fn(), vi.fn())).toBeNull();
      expect(startAllDocumentSyncWorkers).toHaveBeenCalledWith({ enabled: true });
    } finally {
      owner.setWorkspaceUser(null);
    }
  });

  it("S-239: a guest's workers start switched off", async () => {
    const { startWorkspaceSession, startAllDocumentSyncWorkers } = await loadSession();

    startWorkspaceSession(null, vi.fn(), vi.fn());

    expect(startAllDocumentSyncWorkers).toHaveBeenCalledWith({ enabled: false });
    expect(startAllDocumentSyncWorkers).not.toHaveBeenCalledWith({ enabled: true });
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
    // The stored copy is the one created before the edit; the pending edit never landed.
    expect(workspace.loadDocumentById("COVER_LETTER", document.id)?.content).toEqual(
      document.content,
    );
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

  it("S-320 (b): a sign-in as another account in another tab keeps this tab's typing, drops its syncs and tells it to leave", async () => {
    const workspace = await loadWorkspace(true);
    const { setWorkspaceUser } = await import("@/features/documents/services/workspace-owner");
    const { getWorkspaceEpoch } = await import("@/features/documents/services/workspace-epoch");
    setWorkspaceUser("user-a");

    const onSwitched = vi.fn();
    workspace.subscribeToAccountSwitches(onSwitched);

    const document = workspace.createDocument("COVER_LETTER");
    const typed = { ...(document.content as object), senderName: "Typed before the switch" };
    const updatedAt = new Date(Date.parse(document.updatedAt) + 1000).toISOString();
    workspace.saveDocument({ ...document, content: typed, updatedAt }, { debounceMs: 300 });

    const otherTab = new FakeChannel("veriworkly:workspace");
    otherTab.postMessage("signed-in:user-a");
    expect(onSwitched).not.toHaveBeenCalled();

    const epoch = getWorkspaceEpoch();
    otherTab.postMessage("signed-in:user-b");

    expect(onSwitched).toHaveBeenCalledOnce();
    expect(getWorkspaceEpoch()).toBe(epoch + 1);
    expect(workspace.loadDocumentById("COVER_LETTER", document.id)?.content).toEqual(typed);
  });

  it("S-320 (b): a sign-in is announced to the other tabs, never to its own", async () => {
    const workspace = await loadWorkspace(true);
    const ownTab = vi.fn();
    workspace.subscribeToAccountSwitches(ownTab);

    const otherTab = vi.fn();
    new FakeChannel("veriworkly:workspace").addEventListener("message", otherTab);

    workspace.announceSignedIn("user-b");

    expect(otherTab).toHaveBeenCalledWith({ data: "signed-in:user-b" });
    expect(ownTab).not.toHaveBeenCalled();
  });

  it("S-320 (b): without BroadcastChannel the storage event carries the sign-in", async () => {
    const workspace = await loadWorkspace(false);
    const onSwitched = vi.fn();
    workspace.subscribeToAccountSwitches(onSwitched);

    workspace.announceSignedIn("user-b");
    expect(localStorage.setItem).toHaveBeenCalledWith("veriworkly:workspace-signed-in", "user-b");

    const storageListener = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([name]) => name === "storage")![1] as (event: unknown) => void;
    storageListener({ key: "veriworkly:workspace-signed-in", newValue: "user-b" });

    expect(onSwitched).toHaveBeenCalledOnce();
  });

  it("S-320 (b): a tab back in focus uploads only while the session is still its account's", async () => {
    const workspace = await loadWorkspace(true);
    const owner = await import("@/features/documents/services/workspace-owner");
    const sync = await import("@/features/documents/services/document-sync");

    vi.stubGlobal("navigator", {});
    const timers: Array<() => void> = [];
    Object.assign(window, {
      setTimeout: (callback: () => void) => timers.push(callback),
      clearTimeout: () => {},
    });

    let sessionUserId = "user-b";
    const calls: Array<{ method: string; url: string }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const method = init?.method ?? "GET";
        calls.push({ method, url });

        if (url.endsWith("/users/me")) {
          return Response.json({ data: { id: sessionUserId, email: "b@example.com" } });
        }
        if (method === "POST") {
          const { id } = JSON.parse(String(init?.body)) as { id: string };
          return Response.json(
            {
              data: {
                id,
                type: "RESUME",
                title: id,
                templateId: "template",
                visibility: "PRIVATE",
                revision: 1,
                lastSyncedAt: "2026-10-27T00:00:00.000Z",
                updatedAt: "2026-10-27T00:00:00.000Z",
                createdAt: "2026-10-27T00:00:00.000Z",
              },
            },
            { status: 201 },
          );
        }

        return documentListReply([], url);
      }),
    );

    owner.setWorkspaceUser("user-a");
    expect(owner.claimWorkspaceIfUncontested("user-a")).toBe(true);
    sync.startAllDocumentSyncWorkers({ enabled: true });
    workspace.createDocument("RESUME");
    sync.setAllDocumentsSyncEnabled(true);

    const onSwitched = vi.fn();
    workspace.subscribeToAccountSwitches(onSwitched);

    const focus = async () => {
      for (const [name, listener] of vi.mocked(window.addEventListener).mock.calls) {
        if (name === "focus") (listener as (event: Event) => void)({ type: "focus" } as Event);
      }
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
      while (timers.length > 0) timers.shift()!();
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    };

    // Another tab signed in as user B: this tab still shows user A.
    await focus();
    expect(calls.filter((call) => call.url.endsWith("/users/me"))).toHaveLength(1);
    expect(calls.filter((call) => call.method === "POST")).toEqual([]);
    expect(onSwitched).toHaveBeenCalledOnce();

    sessionUserId = "user-a";
    await focus();
    await vi.waitFor(() => expect(calls.filter((call) => call.method === "POST")).toHaveLength(1));
  });

  it("S-320 (b): the worker asks whose session it is right before an upload, focus or not", async () => {
    const workspace = await loadWorkspace(true);
    const owner = await import("@/features/documents/services/workspace-owner");
    const sync = await import("@/features/documents/services/document-sync");

    vi.stubGlobal("navigator", {});
    const timers: Array<() => void> = [];
    Object.assign(window, {
      setTimeout: (callback: () => void) => timers.push(callback),
      clearTimeout: () => {},
    });

    const calls: Array<{ method: string; url: string }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ method: init?.method ?? "GET", url });
        // Another tab signed in as user B; no broadcast reached this one.
        if (url.endsWith("/users/me")) {
          return Response.json({ data: { id: "user-b", email: "b@example.com" } });
        }
        return documentListReply([], url);
      }),
    );

    owner.setWorkspaceUser("user-a");
    expect(owner.claimWorkspaceIfUncontested("user-a")).toBe(true);
    sync.startAllDocumentSyncWorkers({ enabled: true });
    const onSwitched = vi.fn();
    workspace.subscribeToAccountSwitches(onSwitched);

    // An edit queues the upload; only the worker's own timers run it.
    workspace.createDocument("RESUME");
    sync.setAllDocumentsSyncEnabled(true);
    const { DOCUMENT_STORAGE_UPDATED_EVENT } =
      await import("@/features/documents/services/storage-keys");
    for (const [name, listener] of vi.mocked(window.addEventListener).mock.calls) {
      if (name === DOCUMENT_STORAGE_UPDATED_EVENT) {
        (listener as (event: Event) => void)({ type: name } as Event);
      }
    }
    for (let round = 0; round < 5; round += 1) {
      while (timers.length > 0) timers.shift()!();
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    }

    await vi.waitFor(() => expect(onSwitched).toHaveBeenCalled());
    expect(calls.some((call) => call.url.endsWith("/users/me"))).toBe(true);
    expect(calls.filter((call) => call.method !== "GET")).toEqual([]);
  });

  it("S-320 (b): an expired session is 'not confirmed', never a trip to /login", async () => {
    const owner = await import("@/features/documents/services/workspace-owner");
    const replace = vi.fn();
    Object.assign(window, { location: { ...window.location, pathname: "/editor", replace } });

    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        return Response.json({ message: "Unauthorized" }, { status: 401 });
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    owner.setWorkspaceUser("user-a");

    // Settles, and false: the worker backs off and asks again later.
    await expect(owner.confirmSessionIsViewer()).resolves.toBe(false);
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));

    expect(replace).not.toHaveBeenCalled();
    expect(calls.filter((url) => url.endsWith("/auth/sign-out"))).toEqual([]);

    // Nothing is left in flight: the next check asks again.
    await expect(owner.confirmSessionIsViewer()).resolves.toBe(false);
    expect(calls.filter((url) => url.endsWith("/users/me"))).toHaveLength(2);
  });

  it("S-320 (b): a check the server never answers gives up, and the next one asks again", async () => {
    const owner = await import("@/features/documents/services/workspace-owner");
    const timers: Array<{ callback: () => void; delay: number }> = [];
    Object.assign(window, {
      setTimeout: (callback: () => void, delay: number) => timers.push({ callback, delay }),
      clearTimeout: () => {},
    });

    let requests = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            requests += 1;
            // A dropped connection: nothing comes back until the request is aborted.
            init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          }),
      ),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    owner.setWorkspaceUser("user-a");

    const first = owner.confirmSessionIsViewer();
    // Concurrent callers share the request in flight.
    expect(owner.confirmSessionIsViewer()).toBe(first);
    expect(requests).toBe(1);

    const timeout = timers.find((timer) => timer.delay === owner.SESSION_CHECK_TIMEOUT_MS);
    expect(timeout, "the check has no deadline").toBeDefined();
    timeout!.callback();

    await expect(first).resolves.toBe(false);

    void owner.confirmSessionIsViewer();
    expect(requests).toBe(2);
  });

  it("S-320 (b): switching away from the tab asks nothing; coming back asks once", async () => {
    await loadWorkspace(true);
    const owner = await import("@/features/documents/services/workspace-owner");
    const sync = await import("@/features/documents/services/document-sync");

    vi.stubGlobal("navigator", {});
    let visibilityState: DocumentVisibilityState = "visible";
    vi.stubGlobal("document", {
      cookie: "",
      get visibilityState() {
        return visibilityState;
      },
    });

    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        if (url.endsWith("/users/me")) {
          return Response.json({ data: { id: "user-a", email: "a@example.com" } });
        }
        return documentListReply([], url);
      }),
    );

    owner.setWorkspaceUser("user-a");
    expect(owner.claimWorkspaceIfUncontested("user-a")).toBe(true);
    sync.startAllDocumentSyncWorkers({ enabled: true });

    const visibilityChange = async () => {
      for (const [name, listener] of vi.mocked(window.addEventListener).mock.calls) {
        if (name === "visibilitychange") {
          (listener as (event: Event) => void)({ type: "visibilitychange" } as Event);
        }
      }
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    };
    const sessionChecks = () => calls.filter((url) => url.endsWith("/users/me")).length;

    visibilityState = "hidden";
    await visibilityChange();
    expect(sessionChecks()).toBe(0);

    visibilityState = "visible";
    await visibilityChange();
    // One per worker would be one per document type; they share the request in flight.
    expect(sessionChecks()).toBe(1);
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

  it("S-347: the delete dialog promises no version histories that do not exist", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      join(__dirname, "../../features/profile/components/DeleteAccountModal.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(/version histor/i);
    expect(source).toContain("downloadAccountBackup");
  });

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

describe("S-347: the account backup made before deleting the account", () => {
  beforeEach(() => {
    stubBrowser("app.veriworkly.com");
    vi.stubGlobal("navigator", {});
  });

  afterEach(() => {
    setWorkspaceUser(null);
    clearWorkspaceStorage();
    vi.unstubAllGlobals();
  });

  type Row = ReturnType<typeof cloudRecord>;

  /** A full stored document, as the server keeps it in `content`. */
  function cloudRecord(
    document: Pick<BaseDocument, "id" | "type" | "title">,
    revision: number,
    content: unknown = document,
  ) {
    return {
      id: document.id,
      type: document.type as string,
      title: document.title,
      content,
      templateId: "template",
      visibility: "PRIVATE",
      revision,
      lastSyncedAt: "2026-10-26T00:00:00.000Z",
      updatedAt: "2026-10-26T00:00:00.000Z",
      createdAt: "2026-10-26T00:00:00.000Z",
    };
  }

  /**
   * The documents list as the server answers it: filtered by `type` when asked, every
   * type (portfolios included) when not. No Master Profile yet.
   */
  function serveAccount(records: Row[] | "offline", options: { failCursor?: string } = {}) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const address = new URL(String(url));

        if (address.pathname.endsWith("/documents")) {
          if (records === "offline") throw new TypeError("Failed to fetch");
          if (options.failCursor && address.searchParams.get("cursor") === options.failCursor) {
            return Response.json({ message: "Service unavailable" }, { status: 503 });
          }
          const type = address.searchParams.get("type");
          const data = type ? records.filter((record) => record.type === type) : records;
          return documentListReply(data, String(url));
        }

        return Response.json({ message: "Not found" }, { status: 404 });
      }),
    );
  }

  function titled(title: string) {
    const document = createDocument("RESUME");
    const content = document.content as ResumeData;
    saveDocument({ ...document, title, content: { ...content, title } }, { flush: true });
    return loadDocumentById("RESUME", document.id)!;
  }

  function linkAs(document: BaseDocument, status: string, revision: number) {
    getWorkspaceStorage("RESUME").patchSync(document.id, {
      enabled: true,
      status,
      cloudDocumentId: document.id,
      revision,
    } as never);
  }

  async function backup() {
    return buildAccountBackup();
  }

  async function backupTitles() {
    const result = await backup();
    if (!result.ok) throw new Error(result.message);
    return (JSON.parse(result.json).documents as BaseDocument[]).map((document) => document.title);
  }

  it("S-347: a newer cloud revision replaces a synced copy; local-only and cloud-only are both kept", async () => {
    const linked = titled("Old title");
    linkAs(linked, "synced", 1);
    titled("Only on this device");
    const cloudOnly = { ...titled("Only in the cloud") };
    deleteDocument("RESUME", cloudOnly.id);

    serveAccount([cloudRecord({ ...linked, title: "New title" }, 2), cloudRecord(cloudOnly, 1)]);

    const titles = await backupTitles();

    expect(titles).toEqual(
      expect.arrayContaining(["New title", "Only on this device", "Only in the cloud"]),
    );
    expect(titles).not.toContain("Old title");
  });

  it("S-347: a portfolio in the account does not fail the backup", async () => {
    titled("My resume");
    serveAccount([
      cloudRecord({ id: "portfolio-1", type: "PORTFOLIO" as never, title: "My site" }, 1, {
        sections: [],
      }),
    ]);

    expect(await backupTitles()).toEqual(["My resume"]);
  });

  it("S-347: unsent edits beside a newer cloud revision keep both copies", async () => {
    const pending = titled("Edited here");
    linkAs(pending, "pending", 1);
    serveAccount([cloudRecord({ ...pending, title: "Edited elsewhere" }, 2)]);

    expect(await backupTitles()).toEqual(
      expect.arrayContaining(["Edited here", "Edited elsewhere (cloud version)"]),
    );
  });

  it("S-347: a document in conflict keeps both versions", async () => {
    const conflicted = titled("Mine");
    linkAs(conflicted, "conflicted", 1);
    serveAccount([cloudRecord({ ...conflicted, title: "Theirs" }, 1)]);

    expect(await backupTitles()).toEqual(
      expect.arrayContaining(["Mine", "Theirs (cloud version)"]),
    );
  });

  function manyCloudRecords(count: number) {
    return Array.from({ length: count }, (_, index) => {
      const document = createDocument("RESUME");
      deleteDocument("RESUME", document.id);
      return cloudRecord({ ...document, title: `R${index}` }, 1);
    });
  }

  it("Part H: the backup walks every page of the account, 20 bodies at a time", async () => {
    serveAccount(manyCloudRecords(45));

    const titles = await backupTitles();

    expect(titles).toHaveLength(45);
    expect(titles).toEqual(expect.arrayContaining(["R0", "R20", "R44"]));
    const resumeCalls = vi
      .mocked(fetch)
      .mock.calls.map(([url]) => new URL(String(url)).searchParams)
      .filter((params) => params.get("type") === "RESUME");
    expect(resumeCalls.map((params) => [params.get("limit"), params.get("cursor")])).toEqual([
      ["20", null],
      ["20", "20"],
      ["20", "40"],
    ]);
  });

  it("V-422: every page of a large account is in the backup", async () => {
    // 520 resumes, 26 pages of 20: every one is in the backup.
    serveAccount(
      Array.from({ length: 520 }, (_, index) =>
        cloudRecord({ id: `r-${index}`, type: "RESUME", title: `R${index}` }, 1),
      ),
    );
    expect(await backupTitles()).toHaveLength(520);
  });

  it("Part H: a page that fails part way makes no backup at all", async () => {
    serveAccount(manyCloudRecords(45), { failCursor: "40" });

    const result = await backup();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/could not be loaded: Service unavailable/);
  });

  it("S-347: on a device holding another account's documents, the account's cloud documents are still in it", async () => {
    setWorkspaceUser("user-a");
    claimWorkspaceIfUncontested("user-a");
    titled("User A's resume");
    setWorkspaceUser("user-b");
    // User A's documents stay on the device without holding user B's sync back (S-372).
    expect(canWorkspaceReachCloud()).toBe(true);

    const accountDocument = { ...titled("User B's resume") };
    deleteDocument("RESUME", accountDocument.id);
    serveAccount([cloudRecord(accountDocument, 1)]);

    const titles = await backupTitles();

    expect(titles).toContain("User B's resume");
    expect(titles).not.toContain("User A's resume");
  });

  it("S-347: a document whose owner was lost with the index is left out", async () => {
    setWorkspaceUser("user-a");
    claimWorkspaceIfUncontested("user-a");
    const orphan = titled("Owner unknown");
    titled("Mine for sure");
    const index = JSON.parse(localStorage.getItem(DOCUMENT_INDEX_STORAGE_KEY)!);
    index.items[`RESUME:${orphan.id}`].owner = "unknown:index-rebuilt";
    localStorage.setItem(DOCUMENT_INDEX_STORAGE_KEY, JSON.stringify(index));
    // The app shows it to its device owner, but the backup does not adopt it.
    expect(listDocuments().map((meta) => meta.title)).toContain("Owner unknown");
    serveAccount([]);

    const titles = await backupTitles();

    expect(titles).toContain("Mine for sure");
    expect(titles).not.toContain("Owner unknown");
  });

  it("S-347: a cloud document that cannot be read stops the backup and is named", async () => {
    const broken = titled("Broken CV");
    serveAccount([cloudRecord(broken, 1, "not a document")]);

    const result = await backup();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("Broken CV");
  });

  it("S-347: offline, no account backup is made, and the device-only copy still is", async () => {
    titled("Offline resume");
    serveAccount("offline");

    const result = await backup();

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.message).toMatch(/could not be loaded/);
    expect(JSON.parse(buildWorkspaceBackup(listDocuments()).json).documents[0].title).toBe(
      "Offline resume",
    );
  });
});
