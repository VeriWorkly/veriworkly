import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SyncEngine } from "@/features/documents/services/sync-engine";
import { LocalStorageService } from "@/features/documents/services/local-storage-service";
import { DocumentSyncService } from "@/features/documents/services/document-sync-service";
import { clearWorkspaceStorage } from "@/features/documents/services/document-workspace-service";
import {
  countPendingCloudDocuments,
  getCloudPullState,
  hydrateAllDocumentsFromCloud,
} from "@/features/documents/services/document-sync";
import {
  DocumentApi,
  DocumentApiError,
  type CloudDocument,
} from "@/features/documents/services/document-api";
import type { BaseDocument } from "@/features/documents/core/types";
import { createLocalStorageMock } from "@/tests/utils/local-storage";

vi.mock("@/features/documents/services/document-api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/documents/services/document-api")>();

  return {
    ...actual,
    DocumentApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  };
});

describe("sync engine contract", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
    vi.stubGlobal("window", {
      localStorage: globalThis.localStorage,
      dispatchEvent: vi.fn(),
    });
  });

  it("keeps outbox entries isolated by document scope", () => {
    SyncEngine.upsertOutboxItem("shared-id", {}, "RESUME");
    SyncEngine.upsertOutboxItem("shared-id", {}, "COVER_LETTER");

    const resumeOutbox = SyncEngine.getOutbox("RESUME");
    const coverLetterOutbox = SyncEngine.getOutbox("COVER_LETTER");

    expect(Object.keys(resumeOutbox)).toEqual(["RESUME:shared-id"]);
    expect(Object.keys(coverLetterOutbox)).toEqual(["COVER_LETTER:shared-id"]);
    expect(resumeOutbox["RESUME:shared-id"].scope).toBe("RESUME");
    expect(coverLetterOutbox["COVER_LETTER:shared-id"].scope).toBe("COVER_LETTER");

    SyncEngine.removeOutboxItem("shared-id", "RESUME");

    expect(SyncEngine.getOutbox("RESUME")).toEqual({});
    expect(Object.keys(SyncEngine.getOutbox("COVER_LETTER"))).toEqual(["COVER_LETTER:shared-id"]);
  });

  it("keeps telemetry isolated by document scope", () => {
    SyncEngine.updateTelemetry(
      "shared-id",
      { lastAttemptAt: "2026-05-24T01:00:00.000Z" },
      "RESUME",
    );
    SyncEngine.updateTelemetry(
      "shared-id",
      { lastAttemptAt: "2026-05-24T02:00:00.000Z" },
      "COVER_LETTER",
    );

    expect(SyncEngine.getTelemetry("shared-id", "RESUME").lastAttemptAt).toBe(
      "2026-05-24T01:00:00.000Z",
    );
    expect(SyncEngine.getTelemetry("shared-id", "COVER_LETTER").lastAttemptAt).toBe(
      "2026-05-24T02:00:00.000Z",
    );
  });

  it("S-017: an outbox write under quota pressure returns a failure instead of throwing", () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    });

    expect(SyncEngine.upsertOutboxItem("doc", {}, "RESUME")).toEqual({
      ok: false,
      reason: "quota-exceeded",
    });
    expect(SyncEngine.updateTelemetry("doc", { lastAttemptAt: "x" }, "RESUME").ok).toBe(false);
  });
});

const UPDATED_EVENT = "veriworkly:docs-storage-updated";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseDoc(input: unknown): BaseDocument | null {
  if (!isRecord(input) || typeof input.id !== "string" || !isRecord(input.sync)) return null;
  return structuredClone(input) as unknown as BaseDocument;
}

function createDoc(id: string, overrides: Partial<BaseDocument["sync"]> = {}, text = "hello") {
  return {
    id,
    type: "RESUME",
    title: `Doc ${id}`,
    templateId: "template",
    content: { text },
    updatedAt: "2026-10-01T00:00:00.000Z",
    sync: {
      enabled: true,
      status: "pending",
      cloudDocumentId: null,
      lastSyncedAt: null,
      revision: 1,
      ...overrides,
    },
  } as BaseDocument;
}

function cloudRow(id: string, revision: number, content?: unknown): CloudDocument {
  return {
    id,
    type: "RESUME",
    title: `Doc ${id}`,
    content,
    templateId: "template",
    visibility: "PRIVATE",
    revision,
    lastSyncedAt: "2026-10-02T00:00:00.000Z",
    updatedAt: "2026-10-02T00:00:00.000Z",
    createdAt: "2026-10-01T00:00:00.000Z",
  };
}

function createSyncHarness(options: { canReachCloud?: () => boolean } = {}) {
  const localStorageMock = createLocalStorageMock();
  const listeners = new Map<string, Array<(event: Event) => void>>();

  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("window", {
    localStorage: localStorageMock,
    setTimeout: vi.fn(() => 1),
    clearTimeout: vi.fn(),
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn((name: string, listener: (event: Event) => void) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener]);
    }),
    removeEventListener: vi.fn(),
  });

  const storage = new LocalStorageService<BaseDocument>({
    scope: "RESUME",
    documentKey: (id) => `veriworkly:docs:v3:doc:resume:${id}`,
    documentKeyPrefix: "veriworkly:docs:v3:doc:resume:",
    legacyCollectionKey: "veriworkly:docs:v2:resume",
    updatedEventName: UPDATED_EVENT,
    parseItem: parseDoc,
    cloudContentRevision: (id) => SyncEngine.getCloudContentRevision(id, "RESUME"),
    toIndexEntry: (item) => ({
      id: item.id,
      type: "RESUME",
      title: item.title,
      templateId: item.templateId,
      description: "",
      updatedAt: item.updatedAt,
      sync: item.sync,
    }),
  });

  const removeLocal = vi.fn((id: string) => {
    storage.delete(id);
  });
  const flushPendingEdits = vi.fn((id: string) => {
    void id;
  });
  const rekeyLocal = vi.fn((id: string) => {
    const current = storage.loadById(id);
    if (!current) return null;

    const moved = {
      ...current,
      id: `${id}-rekeyed`,
      sync: {
        ...current.sync,
        enabled: true,
        status: "pending",
        cloudDocumentId: null,
        revision: 1,
      },
    } as BaseDocument;

    if (!storage.persist(moved).ok) return null;
    storage.delete(id);
    return moved;
  });

  const service = new DocumentSyncService<BaseDocument>({
    documentType: "RESUME",
    localStorage: storage,
    updatedEventName: UPDATED_EVENT,
    parseItem: parseDoc,
    getDocumentTitle: (item) => item.title,
    removeLocal,
    flushPendingEdits,
    rekeyLocal,
    canReachCloud: options.canReachCloud,
  });

  const emit = (name: string) => {
    for (const listener of listeners.get(name) ?? []) listener({ type: name } as Event);
  };

  /** Stored state for a test, written as storage itself writes it (not as an editor save). */
  const seed = (doc: BaseDocument) => {
    storage.persistMany([doc]);
  };

  return { storage, service, removeLocal, flushPendingEdits, rekeyLocal, emit, seed };
}

describe("document sync service contract", () => {
  beforeEach(() => {
    vi.mocked(DocumentApi.list).mockReset();
    vi.mocked(DocumentApi.get).mockReset();
    vi.mocked(DocumentApi.create).mockReset();
    vi.mocked(DocumentApi.update).mockReset();
    vi.mocked(DocumentApi.delete).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("S-006: two concurrent syncNow calls for one document send exactly one update", async () => {
    const { storage, service, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 }));

    let release: (value: CloudDocument) => void = () => {};
    vi.mocked(DocumentApi.update).mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    const first = service.syncNow("doc-1");
    const second = service.syncNow("doc-1");

    release(cloudRow("doc-1", 3));

    const [a, b] = await Promise.all([first, second]);

    expect(DocumentApi.update).toHaveBeenCalledTimes(1);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(storage.loadById("doc-1")?.sync).toMatchObject({ status: "synced", revision: 3 });
  });

  it("S-173: a document another tab is syncing is not sent twice", async () => {
    const { service, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 }));

    vi.stubGlobal("navigator", {
      locks: {
        request: vi.fn(
          (_name: string, _options: unknown, callback: (lock: unknown) => Promise<unknown>) =>
            callback(null),
        ),
      },
    });

    const result = await service.syncNow("doc-1");

    expect(result).toMatchObject({ ok: false, reason: "in-progress" });
    expect(DocumentApi.update).not.toHaveBeenCalled();
  });

  it("S-007: a failed sync backs off, counts the attempt, and an autosave does not reset it", async () => {
    const { service, emit, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 }));
    service.startWorker({ enabled: true });

    vi.mocked(DocumentApi.update).mockRejectedValue(new TypeError("Failed to fetch"));

    await service.syncNow("doc-1");

    const afterFirst = SyncEngine.getOutboxItem("doc-1", "RESUME");
    expect(afterFirst?.attempts).toBe(1);
    expect(afterFirst?.nextAttemptAt).toBeGreaterThan(Date.now());

    emit(UPDATED_EVENT);

    expect(SyncEngine.getOutboxItem("doc-1", "RESUME")?.nextAttemptAt).toBe(
      afterFirst?.nextAttemptAt,
    );

    await service.syncNow("doc-1");

    const afterSecond = SyncEngine.getOutboxItem("doc-1", "RESUME");
    expect(afterSecond?.attempts).toBe(2);
    expect(afterSecond!.nextAttemptAt - Date.now()).toBeGreaterThan(
      afterFirst!.nextAttemptAt - Date.now(),
    );
  });

  it.each([400, 403, 413])(
    "S-007: a %i rejection is terminal and keeps the server's message",
    async (status) => {
      const { storage, service, seed } = createSyncHarness();
      seed(createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 }));

      vi.mocked(DocumentApi.update).mockRejectedValue(
        new DocumentApiError(status, `Server says ${status}`),
      );

      const result = await service.syncNow("doc-1");

      expect(result.ok).toBe(false);
      expect(result.message).toBe(`Server says ${status}`);
      expect(SyncEngine.getOutboxItem("doc-1", "RESUME")?.state).toBe("failed");
      expect(SyncEngine.getTelemetry("doc-1", "RESUME").lastErrorMessage).toBe(
        `Server says ${status}`,
      );
      expect(storage.loadById("doc-1")?.sync.status).toBe("pending");
    },
  );

  it("S-183: the free-tier 402 is terminal and reported as upgrade-required", async () => {
    const { service, seed } = createSyncHarness();
    seed(createDoc("doc-1"));

    vi.mocked(DocumentApi.create).mockRejectedValue(
      new DocumentApiError(402, "Free users can only have 1 active resume at a time."),
    );

    const result = await service.syncNow("doc-1");

    expect(result).toMatchObject({ ok: false, reason: "upgrade-required" });
    expect(SyncEngine.getOutboxItem("doc-1", "RESUME")?.state).toBe("failed");
  });

  it("S-183: a 409 on update without deletedAt is a revision conflict", async () => {
    const { storage, service, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 }));

    vi.mocked(DocumentApi.update).mockRejectedValue(
      new DocumentApiError(409, "Revision mismatch. Client: 2, Server: 3"),
    );

    const result = await service.syncNow("doc-1");

    expect(result.reason).toBe("conflict");
    expect(storage.loadById("doc-1")?.sync.status).toBe("conflicted");
    expect(SyncEngine.getOutboxItem("doc-1", "RESUME")?.state).toBe("conflicted");
  });

  it("S-316: backing up a conflicted document asks for a choice instead of sending a stale revision", async () => {
    const { service, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", status: "conflicted", revision: 2 }));

    const result = await service.syncNow("doc-1");

    expect(DocumentApi.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, reason: "conflict" });
    expect(result.message).toMatch(/changed on another device/);
    expect(result.message).not.toMatch(/Revision mismatch/);
  });

  it("S-183/S-002: a 200 adopt on create is followed by a PATCH of the content", async () => {
    const { storage, service, seed } = createSyncHarness();
    seed(createDoc("doc-1", {}, "edited locally"));

    vi.mocked(DocumentApi.create).mockResolvedValue({
      document: cloudRow("doc-1", 4),
      created: false,
    });
    vi.mocked(DocumentApi.update).mockResolvedValue(cloudRow("doc-1", 5));

    const result = await service.syncNow("doc-1");

    expect(result.ok).toBe(true);
    expect(DocumentApi.update).toHaveBeenCalledWith(
      "doc-1",
      expect.objectContaining({
        revision: 4,
        content: expect.objectContaining({ content: { text: "edited locally" } }),
      }),
    );
    expect(storage.loadById("doc-1")?.sync).toMatchObject({
      cloudDocumentId: "doc-1",
      revision: 5,
      status: "synced",
    });
  });

  it("S-183: a 409 deletedAt on an unlinked document re-keys it and backs it up as new", async () => {
    const { storage, service, rekeyLocal, seed } = createSyncHarness();
    seed(createDoc("doc-1", { enabled: false, status: "local-only" }, "kept locally"));

    vi.mocked(DocumentApi.create)
      .mockRejectedValueOnce(
        new DocumentApiError(409, "Document was deleted", null, {
          id: "doc-1",
          deletedAt: "2026-10-03T00:00:00.000Z",
        }),
      )
      .mockImplementationOnce(async (input) => ({
        document: cloudRow(input.id!, 1),
        created: true,
      }));

    const result = await service.syncNow("doc-1");

    expect(result.ok).toBe(true);
    expect(rekeyLocal).toHaveBeenCalledWith("doc-1");
    expect(storage.loadById("doc-1")).toBeNull();

    const newId = vi.mocked(DocumentApi.create).mock.calls[1][0].id!;
    expect(newId).not.toBe("doc-1");

    const moved = storage.loadById(newId) as BaseDocument & { content: { text: string } };
    expect(moved.content.text).toBe("kept locally");
    expect(moved.sync).toMatchObject({ status: "synced", cloudDocumentId: newId });
  });

  it("S-183: a 404 on update keeps a pending copy even when its device clock is behind", async () => {
    // updatedAt is earlier than the server's lastSyncedAt; status alone decides.
    const { storage, service, removeLocal, seed } = createSyncHarness();
    seed(
      createDoc("doc-1", {
        cloudDocumentId: "doc-1",
        revision: 2,
        lastSyncedAt: "2026-12-01T00:00:00.000Z",
      }),
    );

    vi.mocked(DocumentApi.update).mockRejectedValue(
      new DocumentApiError(404, "Document not found"),
    );

    const result = await service.syncNow("doc-1");

    expect(result.reason).toBe("deleted-elsewhere");
    expect(removeLocal).not.toHaveBeenCalled();
    expect(storage.loadById("doc-1")?.sync).toMatchObject({
      enabled: false,
      status: "local-only",
      cloudDocumentId: null,
    });
    expect(SyncEngine.isSyncOptedOut("doc-1", "RESUME")).toBe(true);
    expect(SyncEngine.getTelemetry("doc-1", "RESUME").lastErrorReason).toBe("deleted-elsewhere");
    expect(SyncEngine.getOutboxItem("doc-1", "RESUME")).toBeNull();

    // A later sign-in or settings toggle does not re-enable it.
    service.setAllSyncEnabled(true);
    expect(storage.loadById("doc-1")?.sync.enabled).toBe(false);
  });

  it("S-183: a 404 on update of a clean copy removes it", async () => {
    const { storage, service, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", status: "synced", revision: 2 }));

    vi.mocked(DocumentApi.update).mockRejectedValue(
      new DocumentApiError(404, "Document not found"),
    );

    const result = await service.syncNow("doc-1");

    expect(result.reason).toBe("deleted");
    expect(storage.loadById("doc-1")).toBeNull();
  });

  it("a deletion elsewhere keeps typing that was still in the autosave debounce", async () => {
    const { storage, service, flushPendingEdits, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", status: "synced", revision: 2 }));

    // The debounced save lands only when flushed; it is a real edit.
    flushPendingEdits.mockImplementation(() => {
      storage.persist(
        createDoc("doc-1", { cloudDocumentId: "doc-1", status: "synced", revision: 2 }, "typed"),
      );
    });

    vi.mocked(DocumentApi.list).mockResolvedValueOnce({
      documents: [],
      deleted: [{ id: "doc-1", deletedAt: "2026-10-05T00:00:00.000Z" }],
      serverTime: "2026-10-05T00:00:00.000Z",
      nextCursor: null,
      total: null,
    });

    await service.hydrate({ force: true });

    expect(flushPendingEdits).toHaveBeenCalledWith("doc-1");
    const kept = storage.loadById("doc-1") as BaseDocument & { content: { text: string } };
    expect(kept.content.text).toBe("typed");
    expect(kept.sync).toMatchObject({ enabled: false, cloudDocumentId: null });
  });

  it("S-183: a free-plan 402 is retried when the worker starts again", async () => {
    const { service, seed } = createSyncHarness();
    seed(createDoc("doc-1"));

    vi.mocked(DocumentApi.create).mockRejectedValue(
      new DocumentApiError(402, "Free users can only have 1 active resume at a time."),
    );
    await service.syncNow("doc-1");

    expect(SyncEngine.getOutboxItem("doc-1", "RESUME")?.state).toBe("failed");

    service.startWorker({ enabled: true });

    expect(SyncEngine.getOutboxItem("doc-1", "RESUME")).toMatchObject({
      state: "pending",
      attempts: 0,
    });
  });

  it("a slug rename of a document whose sync is off leaves it off", async () => {
    const { storage, service, seed } = createSyncHarness();
    seed(
      createDoc("doc-1", {
        enabled: false,
        status: "local-only",
        cloudDocumentId: "doc-1",
        revision: 2,
      }),
    );
    SyncEngine.setSyncOptedOut("doc-1", true, "RESUME");

    vi.mocked(DocumentApi.update).mockResolvedValue(cloudRow("doc-1", 3));

    const result = await service.syncNow("doc-1", { updateShareSlug: true });

    expect(result.ok).toBe(true);
    expect(storage.loadById("doc-1")?.sync).toMatchObject({
      enabled: false,
      status: "local-only",
      revision: 3,
    });
    expect(SyncEngine.isSyncOptedOut("doc-1", "RESUME")).toBe(true);
  });

  it("a rename that moves the share slug sends it with the sync", async () => {
    const { service, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 }));

    vi.mocked(DocumentApi.update).mockResolvedValue(cloudRow("doc-1", 3));

    await service.syncNow("doc-1", { updateShareSlug: true });

    expect(DocumentApi.update).toHaveBeenCalledWith(
      "doc-1",
      expect.objectContaining({ revision: 2, updateShareSlug: true }),
    );
  });

  it("an editor opened before another device's version was pulled in conflicts instead of overwriting", async () => {
    const { storage, service, seed } = createSyncHarness();
    const opened = createDoc("doc-1", { cloudDocumentId: "doc-1", status: "synced", revision: 2 });
    seed(opened);

    vi.mocked(DocumentApi.list).mockResolvedValueOnce({
      documents: [cloudRow("doc-1", 3, createDoc("doc-1", {}, "from the other device"))],
      deleted: [],
      serverTime: "2026-10-04T00:00:00.000Z",
      nextCursor: null,
      total: null,
    });
    await service.hydrate({ force: true });

    // The editor still holds revision 2 and types on top of it.
    storage.persist({
      ...opened,
      content: { text: "stale editor" },
    } as BaseDocument);

    expect(storage.loadById("doc-1")?.sync.status).toBe("conflicted");
  });

  it("an editor that only missed this device's own sync does not conflict", async () => {
    const { storage, service, seed } = createSyncHarness();
    const opened = createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 });
    seed(opened);

    vi.mocked(DocumentApi.update).mockResolvedValue(cloudRow("doc-1", 3));
    await service.syncNow("doc-1");

    storage.persist({ ...opened, content: { text: "next keystroke" } } as BaseDocument);

    expect(storage.loadById("doc-1")?.sync).toMatchObject({ status: "pending", revision: 3 });
  });

  it("S-121: a sync whose result cannot be stored is not reported as a success", async () => {
    const { service, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 }));

    vi.mocked(DocumentApi.update).mockImplementation(async () => {
      vi.mocked(localStorage.setItem).mockImplementation((key: string) => {
        if (key.startsWith("veriworkly:docs:v3:doc:")) {
          throw new DOMException("Storage quota exceeded", "QuotaExceededError");
        }
      });
      return cloudRow("doc-1", 3);
    });

    const result = await service.syncNow("doc-1");

    expect(result).toMatchObject({ ok: false, reason: "storage" });
  });

  it("keeps an edit made while the sync was in flight pending", async () => {
    const { storage, service, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 }));

    vi.mocked(DocumentApi.update).mockImplementation(async () => {
      storage.persist({
        ...createDoc("doc-1", {}, "typed during the request"),
        updatedAt: "2026-10-05T00:00:00.000Z",
      });
      return cloudRow("doc-1", 3);
    });

    await service.syncNow("doc-1");

    expect(storage.loadById("doc-1")?.sync).toMatchObject({ status: "pending", revision: 3 });
    expect(SyncEngine.getOutboxItem("doc-1", "RESUME")?.state).toBe("pending");
  });

  it("S-005: use-local with a failing GET keeps the cloud linkage", async () => {
    const { storage, service, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 }));
    storage.patchSync("doc-1", { status: "conflicted" });

    vi.mocked(DocumentApi.get).mockRejectedValue(new DocumentApiError(500, "Server error"));

    const result = await service.resolveConflictUseLocal("doc-1");

    expect(result.ok).toBe(false);
    expect(storage.loadById("doc-1")?.sync).toMatchObject({
      cloudDocumentId: "doc-1",
      revision: 2,
      status: "conflicted",
    });
    expect(DocumentApi.update).not.toHaveBeenCalled();
  });

  it("VW-02: loading a cloud-only document twice succeeds both times", async () => {
    // React strict mode runs the editor's load effect twice: the second load finds the copy
    // the first one stored, merges nothing, and must still report the document as loaded.
    const { storage, service } = createSyncHarness();

    vi.mocked(DocumentApi.get).mockResolvedValue(
      cloudRow("cloud-only", 1, createDoc("cloud-only", { status: "synced" })),
    );

    expect((await service.hydrateById("cloud-only")).ok).toBe(true);
    expect((await service.hydrateById("cloud-only")).ok).toBe(true);
    expect(storage.loadById("cloud-only")).not.toBeNull();
  });

  it("S-120: use-cloud with an unreadable cloud copy reports failure", async () => {
    const { storage, service, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 }));
    storage.patchSync("doc-1", { status: "conflicted" });

    vi.mocked(DocumentApi.get).mockResolvedValue(cloudRow("doc-1", 3, { not: "a document" }));

    const result = await service.resolveConflictUseCloud("doc-1");

    expect(result.ok).toBe(false);
    expect(storage.loadById("doc-1")?.sync.status).toBe("conflicted");
  });

  it("S-241: keep-local-only deletes the cloud copy before unlinking", async () => {
    const { storage, service, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 }));

    vi.mocked(DocumentApi.delete).mockResolvedValue(undefined);

    const result = await service.keepLocalOnly("doc-1");

    expect(result.ok).toBe(true);
    expect(DocumentApi.delete).toHaveBeenCalledWith("doc-1");
    expect(storage.loadById("doc-1")?.sync).toMatchObject({
      enabled: false,
      status: "local-only",
      cloudDocumentId: null,
    });
  });

  it("S-241: keep-local-only keeps the linkage when the cloud delete fails", async () => {
    const { storage, service, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 }));

    vi.mocked(DocumentApi.delete).mockRejectedValue(new DocumentApiError(500, "Server error"));

    const result = await service.keepLocalOnly("doc-1");

    expect(result.ok).toBe(false);
    expect(storage.loadById("doc-1")?.sync).toMatchObject({
      enabled: true,
      cloudDocumentId: "doc-1",
    });
  });

  it("S-161: a document kept local survives a bulk sync toggle and a stale editor save", async () => {
    const { storage, service, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 }));
    seed(createDoc("doc-2", { enabled: false, status: "local-only" }));

    vi.mocked(DocumentApi.delete).mockResolvedValue(undefined);
    await service.keepLocalOnly("doc-1");

    service.setAllSyncEnabled(false);
    service.setAllSyncEnabled(true);

    expect(storage.loadById("doc-1")?.sync.enabled).toBe(false);
    expect(storage.loadById("doc-2")?.sync.enabled).toBe(true);

    // An editor still holding the pre-opt-out copy cannot switch sync back on.
    storage.persist(createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 }, "new text"));

    expect(storage.loadById("doc-1")?.sync).toMatchObject({ enabled: false, status: "local-only" });
  });

  it("S-003: hydrate pulls with the server's cursor and applies deletion tombstones", async () => {
    const { storage, service, seed } = createSyncHarness();
    seed(createDoc("linked", { cloudDocumentId: "linked", status: "synced", revision: 2 }));
    seed(createDoc("edited", { cloudDocumentId: "edited", status: "pending", revision: 2 }));
    seed(createDoc("local", {}));

    vi.mocked(DocumentApi.list).mockResolvedValueOnce({
      documents: [cloudRow("remote", 1, createDoc("remote", { status: "synced" }))],
      deleted: [],
      serverTime: "2026-10-04T00:00:00.000Z",
      nextCursor: null,
      total: null,
    });

    const first = await service.hydrate({ force: true });

    expect(first.ok).toBe(true);
    expect(storage.loadById("remote")?.sync).toMatchObject({
      cloudDocumentId: "remote",
      status: "synced",
    });

    vi.mocked(DocumentApi.list).mockResolvedValueOnce({
      documents: [],
      deleted: [
        { id: "linked", deletedAt: "2026-10-05T00:00:00.000Z" },
        { id: "edited", deletedAt: "2026-10-05T00:00:00.000Z" },
        { id: "local", deletedAt: "2026-10-05T00:00:00.000Z" },
      ],
      serverTime: "2026-10-05T00:00:00.000Z",
      nextCursor: null,
      total: null,
    });

    await service.hydrate({ minIntervalMs: 0 });

    expect(DocumentApi.list).toHaveBeenLastCalledWith("RESUME", {
      includeContent: true,
      updatedSince: "2026-10-04T00:00:00.000Z",
      limit: 20,
    });
    expect(storage.loadById("linked")).toBeNull();
    // Unsynced edits survive a deletion made elsewhere, as an unlinked local-only copy.
    expect(storage.loadById("edited")?.sync).toMatchObject({
      enabled: false,
      status: "local-only",
      cloudDocumentId: null,
    });
    // Never linked to the cloud, so a tombstone for its id cannot be about this copy.
    expect(storage.loadById("local")).not.toBeNull();
  });

  it("S-003: a newer cloud revision against unsynced local edits becomes a conflict", async () => {
    const { storage, service, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", status: "pending", revision: 2 }, "mine"));

    vi.mocked(DocumentApi.list).mockResolvedValueOnce({
      documents: [cloudRow("doc-1", 3, createDoc("doc-1", {}, "theirs"))],
      deleted: [],
      serverTime: "2026-10-04T00:00:00.000Z",
      nextCursor: null,
      total: null,
    });

    await service.hydrate({ force: true });

    const local = storage.loadById("doc-1") as BaseDocument & { content: { text: string } };
    expect(local.content.text).toBe("mine");
    expect(local.sync.status).toBe("conflicted");
  });

  it("S-284: a pull that resolves after sign-out writes nothing", async () => {
    const { storage, service } = createSyncHarness();

    let release: (value: Awaited<ReturnType<typeof DocumentApi.list>>) => void = () => {};
    vi.mocked(DocumentApi.list).mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    const pull = service.hydrate({ force: true });
    clearWorkspaceStorage();
    release({
      documents: [cloudRow("users-a-doc", 1, createDoc("users-a-doc", { status: "synced" }))],
      deleted: [],
      serverTime: "2026-10-26T00:00:00.000Z",
      nextCursor: null,
      total: null,
    });

    expect((await pull).ok).toBe(false);
    expect(storage.loadById("users-a-doc")).toBeNull();
    expect(localStorage.getItem("veriworkly:cloud-hydrate-meta:resume")).toBeNull();
  });

  it("S-284: a sync reply that lands after sign-out records nothing", async () => {
    const { storage, service, seed } = createSyncHarness();
    seed(createDoc("doc-1", { cloudDocumentId: "doc-1", revision: 2 }));

    let release: (value: CloudDocument) => void = () => {};
    vi.mocked(DocumentApi.update).mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    const sync = service.syncNow("doc-1");
    await vi.waitFor(() => expect(DocumentApi.update).toHaveBeenCalled());
    clearWorkspaceStorage();
    release(cloudRow("doc-1", 3));

    expect((await sync).ok).toBe(false);
    expect(storage.loadById("doc-1")).toBeNull();
    expect(SyncEngine.getOutbox("RESUME")).toEqual({});
    expect(SyncEngine.getTelemetry("doc-1", "RESUME").lastSuccessAt ?? null).toBeNull();
  });

  it("S-283: nothing is pulled or uploaded while the device's documents await their owner", async () => {
    let claimed = false;
    const { service, seed } = createSyncHarness({ canReachCloud: () => claimed });
    seed(createDoc("doc-1"));

    expect((await service.syncNow("doc-1")).ok).toBe(false);
    await service.hydrate({ force: true });
    await service.hydrateById("doc-1");

    expect(DocumentApi.create).not.toHaveBeenCalled();
    expect(DocumentApi.list).not.toHaveBeenCalled();
    expect(DocumentApi.get).not.toHaveBeenCalled();

    claimed = true;
    vi.mocked(DocumentApi.create).mockResolvedValueOnce({
      document: cloudRow("doc-1", 1),
      created: true,
    });

    expect((await service.syncNow("doc-1")).ok).toBe(true);
  });

  it("an unreadable hydrate cursor is healed instead of breaking every pull", async () => {
    const { service } = createSyncHarness();
    localStorage.setItem("veriworkly:cloud-hydrate-meta:resume", "null");
    vi.mocked(DocumentApi.list).mockResolvedValueOnce({
      documents: [],
      deleted: [],
      serverTime: null,
      nextCursor: null,
      total: null,
    });

    expect((await service.hydrate()).ok).toBe(true);
    expect(DocumentApi.list).toHaveBeenCalledWith("RESUME", {
      includeContent: true,
      updatedSince: undefined,
      limit: 20,
    });
  });

  describe("V-263 / Part H: the pull walks the server's pages", () => {
    const HYDRATE_META_KEY = "veriworkly:cloud-hydrate-meta:resume";

    type ListPage = Awaited<ReturnType<typeof DocumentApi.list>>;

    function page(overrides: Partial<ListPage>): ListPage {
      return {
        documents: [],
        deleted: [],
        serverTime: "2026-10-27T00:00:00.000Z",
        nextCursor: null,
        total: null,
        ...overrides,
      };
    }

    function remote(id: string, revision = 1) {
      return cloudRow(id, revision, createDoc(id, { status: "synced" }));
    }

    function storedCursor() {
      const raw = localStorage.getItem(HYDRATE_META_KEY);
      return raw ? (JSON.parse(raw) as { lastServerCursor?: string }).lastServerCursor : undefined;
    }

    it("Part H: walks every page of 20, merges each, and stores the cursor after the last", async () => {
      const { storage, service } = createSyncHarness();
      const onTotal = vi.fn();
      const firstPageTime = "2026-10-27T01:00:00.000Z";
      let storedAfterFirstPage: string | undefined = "unset";

      vi.mocked(DocumentApi.list)
        .mockResolvedValueOnce(
          page({ documents: [remote("a")], serverTime: firstPageTime, nextCursor: "c1", total: 3 }),
        )
        .mockImplementationOnce(async () => {
          // The first page is already in storage, but the cursor has not moved yet.
          expect(storage.loadById("a")).not.toBeNull();
          storedAfterFirstPage = storedCursor();
          return page({ documents: [remote("b")], serverTime: firstPageTime, nextCursor: "c2" });
        })
        .mockResolvedValueOnce(page({ documents: [remote("c")], serverTime: firstPageTime }));

      const result = await service.hydrate({ force: true, onTotal });

      expect(result).toMatchObject({ ok: true, message: "Merged 3 documents." });
      expect(vi.mocked(DocumentApi.list).mock.calls.map(([, options]) => options)).toEqual([
        { includeContent: true, updatedSince: undefined, limit: 20, cursor: undefined },
        { includeContent: true, updatedSince: undefined, limit: 20, cursor: "c1" },
        { includeContent: true, updatedSince: undefined, limit: 20, cursor: "c2" },
      ]);
      expect(["a", "b", "c"].map((id) => storage.loadById(id)?.sync.cloudDocumentId)).toEqual([
        "a",
        "b",
        "c",
      ]);
      expect(storedAfterFirstPage).toBeUndefined();
      expect(storedCursor()).toBe(firstPageTime);
      expect(onTotal).toHaveBeenCalledTimes(1);
      expect(onTotal).toHaveBeenCalledWith(3);
    });

    it("Part H: a failure mid-walk keeps what merged, keeps the cursor, and the next pull resumes there", async () => {
      const { storage, service } = createSyncHarness();

      vi.mocked(DocumentApi.list).mockResolvedValueOnce(
        page({ serverTime: "2026-10-26T00:00:00.000Z" }),
      );
      await service.hydrate({ force: true });

      vi.mocked(DocumentApi.list)
        .mockResolvedValueOnce(page({ documents: [remote("a")], nextCursor: "c1" }))
        .mockRejectedValueOnce(new Error("The server took too long to answer."));

      const failed = await service.hydrate({ minIntervalMs: 0 });

      expect(failed.ok).toBe(false);
      expect(failed.message).toContain("The server took too long to answer.");
      expect(failed.message).toContain("1 documents arrived before it stopped");
      expect(storage.loadById("a")?.sync.cloudDocumentId).toBe("a");
      expect(storedCursor()).toBe("2026-10-26T00:00:00.000Z");

      // The next pull resumes at the page that failed, from the same cursor, without
      // downloading the pages that already arrived.
      vi.mocked(DocumentApi.list).mockResolvedValueOnce(page({ documents: [remote("b")] }));

      const retried = await service.hydrate({ minIntervalMs: 0 });

      expect(retried.ok).toBe(true);
      expect(DocumentApi.list).toHaveBeenCalledTimes(4);
      expect(DocumentApi.list).toHaveBeenLastCalledWith("RESUME", {
        includeContent: true,
        updatedSince: "2026-10-26T00:00:00.000Z",
        limit: 20,
        cursor: "c1",
      });
      expect(
        storage
          .listIndex()
          .map((entry) => entry.id)
          .sort(),
      ).toEqual(["a", "b"]);
      expect(storedCursor()).toBe("2026-10-27T00:00:00.000Z");
      expect(JSON.parse(localStorage.getItem(HYDRATE_META_KEY)!).resume).toBeUndefined();
    });

    it("Part H: a sign-out between pages stops the walk and writes nothing more", async () => {
      const { storage, service } = createSyncHarness();

      let release: (value: ListPage) => void = () => {};
      vi.mocked(DocumentApi.list)
        .mockResolvedValueOnce(page({ documents: [remote("a")], nextCursor: "c1" }))
        .mockReturnValueOnce(
          new Promise((resolve) => {
            release = resolve;
          }),
        );

      const pull = service.hydrate({ force: true });
      await vi.waitFor(() => expect(DocumentApi.list).toHaveBeenCalledTimes(2));
      clearWorkspaceStorage();
      release(page({ documents: [remote("b")], nextCursor: "c2" }));

      expect((await pull).ok).toBe(false);
      expect(DocumentApi.list).toHaveBeenCalledTimes(2);
      expect(storage.loadById("a")).toBeNull();
      expect(storage.loadById("b")).toBeNull();
      expect(localStorage.getItem(HYDRATE_META_KEY)).toBeNull();
    });

    it("Part H: tombstones on every page are applied", async () => {
      const { storage, service, seed } = createSyncHarness();
      seed(createDoc("gone-1", { cloudDocumentId: "gone-1", status: "synced", revision: 1 }));
      seed(createDoc("gone-2", { cloudDocumentId: "gone-2", status: "synced", revision: 1 }));
      localStorage.setItem(
        HYDRATE_META_KEY,
        JSON.stringify({ lastHydratedAt: 0, lastServerCursor: "2026-10-26T00:00:00.000Z" }),
      );

      vi.mocked(DocumentApi.list)
        .mockResolvedValueOnce(
          page({
            deleted: [{ id: "gone-1", deletedAt: "2026-10-26T01:00:00.000Z" }],
            nextCursor: "c1",
          }),
        )
        .mockResolvedValueOnce(
          page({ deleted: [{ id: "gone-2", deletedAt: "2026-10-26T02:00:00.000Z" }] }),
        );

      const result = await service.hydrate();

      expect(result.ok).toBe(true);
      expect(result.message).toContain("Removed 2 deleted on another device.");
      expect(storage.loadById("gone-1")).toBeNull();
      expect(storage.loadById("gone-2")).toBeNull();
    });

    it("Part H: a server without paging answers once, and that one reply is the whole pull", async () => {
      const { storage, service } = createSyncHarness();

      vi.mocked(DocumentApi.list).mockResolvedValueOnce(
        page({ documents: [remote("a"), remote("b")], serverTime: "2026-10-27T02:00:00.000Z" }),
      );

      expect((await service.hydrate({ force: true })).ok).toBe(true);
      expect(DocumentApi.list).toHaveBeenCalledTimes(1);
      expect(storage.listIndex()).toHaveLength(2);
      expect(storedCursor()).toBe("2026-10-27T02:00:00.000Z");
    });

    it("Part H: a page that repeats its own cursor stops the walk instead of looping", async () => {
      const { service } = createSyncHarness();

      vi.mocked(DocumentApi.list)
        .mockResolvedValueOnce(page({ documents: [remote("a")], nextCursor: "c1" }))
        .mockResolvedValue(page({ nextCursor: "c1" }));

      const result = await service.hydrate({ force: true });

      expect(result.ok).toBe(false);
      expect(DocumentApi.list).toHaveBeenCalledTimes(2);
      expect(storedCursor()).toBeUndefined();
    });

    it("Part H: a second pull while one is walking shares it instead of walking again", async () => {
      const { service } = createSyncHarness();

      let release: (value: ListPage) => void = () => {};
      vi.mocked(DocumentApi.list).mockReturnValueOnce(
        new Promise((resolve) => {
          release = resolve;
        }),
      );

      const first = service.hydrate({ minIntervalMs: 0 });
      const second = service.hydrate({ minIntervalMs: 0 });
      release(page({ documents: [remote("a")] }));

      expect(await second).toEqual(await first);
      expect(DocumentApi.list).toHaveBeenCalledTimes(1);
    });

    it("Part H: a resume point the server refuses (400) is dropped, and the next pull starts over", async () => {
      const { service } = createSyncHarness();
      localStorage.setItem(
        HYDRATE_META_KEY,
        JSON.stringify({
          lastHydratedAt: 0,
          lastServerCursor: "2026-10-26T00:00:00.000Z",
          resume: { updatedSince: "2026-10-26T00:00:00.000Z", cursor: "stale" },
        }),
      );

      vi.mocked(DocumentApi.list).mockRejectedValueOnce(
        new DocumentApiError(400, "Invalid cursor", null, { code: "INVALID_DOCUMENT_CURSOR" }),
      );
      expect((await service.hydrate()).ok).toBe(false);
      expect(DocumentApi.list).toHaveBeenLastCalledWith(
        "RESUME",
        expect.objectContaining({ cursor: "stale" }),
      );

      vi.mocked(DocumentApi.list).mockResolvedValueOnce(page({}));
      expect((await service.hydrate()).ok).toBe(true);
      expect(DocumentApi.list).toHaveBeenLastCalledWith(
        "RESUME",
        expect.objectContaining({ updatedSince: "2026-10-26T00:00:00.000Z", cursor: undefined }),
      );
    });

    it("Part H: a resume point from another cursor is not used, and a forced pull ignores it", async () => {
      const { service } = createSyncHarness();
      localStorage.setItem(
        HYDRATE_META_KEY,
        JSON.stringify({
          lastHydratedAt: 0,
          lastServerCursor: "2026-10-26T00:00:00.000Z",
          resume: { updatedSince: null, cursor: "from-a-full-walk" },
        }),
      );

      vi.mocked(DocumentApi.list).mockResolvedValue(page({}));

      await service.hydrate();
      expect(DocumentApi.list).toHaveBeenLastCalledWith(
        "RESUME",
        expect.objectContaining({ cursor: undefined }),
      );

      localStorage.setItem(
        HYDRATE_META_KEY,
        JSON.stringify({
          lastHydratedAt: 0,
          lastServerCursor: "2026-10-26T00:00:00.000Z",
          resume: { updatedSince: "2026-10-26T00:00:00.000Z", cursor: "c1" },
        }),
      );

      await service.hydrate({ force: true });
      expect(DocumentApi.list).toHaveBeenLastCalledWith(
        "RESUME",
        expect.objectContaining({ updatedSince: undefined, cursor: undefined }),
      );
    });

    it("Part H: a walk longer than the account's documents can fill is stopped", async () => {
      const { service } = createSyncHarness();
      let n = 0;

      // 40 documents fill 2 pages; with slack for edits mid-walk the guard allows 7.
      vi.mocked(DocumentApi.list).mockImplementation(async () => {
        n += 1;
        return page({ documents: [remote(`d${n}`)], nextCursor: `c${n}`, total: 40 });
      });

      const result = await service.hydrate({ force: true });

      expect(result.ok).toBe(false);
      expect(result.message).toContain("kept sending pages");
      expect(DocumentApi.list).toHaveBeenCalledTimes(7);
      expect(storedCursor()).toBeUndefined();
    });

    it("Part H: only a full pull reports the account's count", async () => {
      const { service } = createSyncHarness();
      const onTotal = vi.fn();
      localStorage.setItem(
        HYDRATE_META_KEY,
        JSON.stringify({ lastHydratedAt: 0, lastServerCursor: "2026-10-26T00:00:00.000Z" }),
      );

      // An incremental pull brings only what changed; its count could never be closed.
      vi.mocked(DocumentApi.list).mockResolvedValueOnce(page({ total: 30 }));
      await service.hydrate({ onTotal });
      expect(onTotal).not.toHaveBeenCalled();

      vi.mocked(DocumentApi.list).mockResolvedValueOnce(page({ total: 30 }));
      await service.hydrate({ force: true, onTotal });
      expect(onTotal).toHaveBeenCalledWith(30);
    });

    it("Part H: a forced pull leaves the cursor, so the deletions since it still arrive", async () => {
      const { storage, service, seed } = createSyncHarness();
      seed(createDoc("gone", { cloudDocumentId: "gone", status: "synced", revision: 1 }));
      localStorage.setItem(
        HYDRATE_META_KEY,
        JSON.stringify({ lastHydratedAt: 0, lastServerCursor: "2026-10-26T00:00:00.000Z" }),
      );

      // A full list carries no tombstones.
      vi.mocked(DocumentApi.list).mockResolvedValueOnce(
        page({ serverTime: "2026-10-27T05:00:00.000Z" }),
      );
      expect((await service.hydrate({ force: true })).ok).toBe(true);
      expect(storedCursor()).toBe("2026-10-26T00:00:00.000Z");

      vi.mocked(DocumentApi.list).mockResolvedValueOnce(
        page({ deleted: [{ id: "gone", deletedAt: "2026-10-26T12:00:00.000Z" }] }),
      );
      await service.hydrate({ minIntervalMs: 0 });

      expect(DocumentApi.list).toHaveBeenLastCalledWith(
        "RESUME",
        expect.objectContaining({ updatedSince: "2026-10-26T00:00:00.000Z" }),
      );
      expect(storage.loadById("gone")).toBeNull();
    });

    it("Part H: a forced pull does not join a walk already running", async () => {
      const { service } = createSyncHarness();

      let release: (value: ListPage) => void = () => {};
      vi.mocked(DocumentApi.list)
        .mockReturnValueOnce(
          new Promise((resolve) => {
            release = resolve;
          }),
        )
        .mockResolvedValueOnce(page({ documents: [remote("forced")] }));

      const running = service.hydrate({ minIntervalMs: 0 });
      const forced = await service.hydrate({ force: true });
      release(page({}));
      await running;

      expect(forced.message).toBe("Merged 1 documents.");
      expect(DocumentApi.list).toHaveBeenCalledTimes(2);
    });

    it("Part H: a caller joining a running walk shares its result; its own options are not applied", async () => {
      const { service } = createSyncHarness();
      const joinerTotal = vi.fn();

      let release: (value: ListPage) => void = () => {};
      vi.mocked(DocumentApi.list).mockReturnValueOnce(
        new Promise((resolve) => {
          release = resolve;
        }),
      );

      const first = service.hydrate({ force: true });
      const joined = service.hydrate({ minIntervalMs: 0, onTotal: joinerTotal });
      release(page({ total: 4 }));

      expect(await joined).toEqual(await first);
      expect(joinerTotal).not.toHaveBeenCalled();
    });

    it("Part H: a walk from before a sign-out is never shared with a pull after it", async () => {
      const { service } = createSyncHarness();

      let release: (value: ListPage) => void = () => {};
      vi.mocked(DocumentApi.list)
        .mockReturnValueOnce(
          new Promise((resolve) => {
            release = resolve;
          }),
        )
        .mockResolvedValueOnce(page({ documents: [remote("after")] }));

      const before = service.hydrate({ minIntervalMs: 0 });
      clearWorkspaceStorage();
      const after = await service.hydrate({ minIntervalMs: 0 });
      release(page({ documents: [remote("before")] }));

      expect(after.ok).toBe(true);
      expect(after.message).toBe("Merged 1 documents.");
      expect((await before).ok).toBe(false);
      expect(DocumentApi.list).toHaveBeenCalledTimes(2);
    });
  });
});

describe("Part H: how many documents a pull has still to bring", () => {
  type ListPage = Awaited<ReturnType<typeof DocumentApi.list>>;
  const NONE_LINKED = { RESUME: 0, COVER_LETTER: 0 };

  function page(overrides: Partial<ListPage>): ListPage {
    return {
      documents: [],
      deleted: [],
      serverTime: "2026-10-27T00:00:00.000Z",
      nextCursor: null,
      total: null,
      ...overrides,
    };
  }

  /** Starts a pull of every type whose resume walk stalls on its second page. */
  function startStalledPull() {
    let release: (value: ListPage) => void = () => {};

    vi.mocked(DocumentApi.list).mockImplementation(async (type, options) => {
      if (type === "COVER_LETTER") return page({ total: 4 });
      if (!options?.cursor) return page({ total: 30, nextCursor: "c1" });

      return new Promise<ListPage>((resolve) => {
        release = resolve;
      });
    });

    const pull = hydrateAllDocumentsFromCloud({ minIntervalMs: 0 });

    return {
      pull,
      finish: async () => {
        await vi.waitFor(() => expect(DocumentApi.list).toHaveBeenCalledTimes(3));
        release(page({}));
        await pull;
      },
    };
  }

  beforeEach(() => {
    vi.mocked(DocumentApi.list).mockReset();
    createSyncHarness();
  });

  it("Part H: counts only the type the library shows, and nothing once the pull ends", async () => {
    const { finish } = startStalledPull();
    await vi.waitFor(() => expect(DocumentApi.list).toHaveBeenCalledTimes(3));

    const state = getCloudPullState();
    expect(countPendingCloudDocuments(state, NONE_LINKED, "RESUME")).toBe(30);
    expect(countPendingCloudDocuments(state, NONE_LINKED, "COVER_LETTER")).toBe(4);
    expect(countPendingCloudDocuments(state, NONE_LINKED, "ALL")).toBe(34);
    expect(countPendingCloudDocuments(state, { RESUME: 25, COVER_LETTER: 4 }, "ALL")).toBe(5);

    await finish();
    expect(countPendingCloudDocuments(getCloudPullState(), NONE_LINKED, "ALL")).toBe(0);
  });

  it("Part H: an incremental pull shows no count it could never close", async () => {
    for (const key of ["resume", "cover_letter"]) {
      localStorage.setItem(
        `veriworkly:cloud-hydrate-meta:${key}`,
        JSON.stringify({ lastHydratedAt: 0, lastServerCursor: "2026-10-26T00:00:00.000Z" }),
      );
    }

    const { finish } = startStalledPull();
    await vi.waitFor(() => expect(DocumentApi.list).toHaveBeenCalledTimes(3));

    expect(countPendingCloudDocuments(getCloudPullState(), NONE_LINKED, "ALL")).toBe(0);
    await finish();
  });

  it("Part H: counts reported before a sign-out are not shown after it", async () => {
    const { finish } = startStalledPull();
    await vi.waitFor(() => expect(DocumentApi.list).toHaveBeenCalledTimes(3));

    clearWorkspaceStorage();

    expect(getCloudPullState().pulling).toBe(true);
    expect(countPendingCloudDocuments(getCloudPullState(), NONE_LINKED, "ALL")).toBe(0);
    await finish();
  });
});
