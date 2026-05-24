import { beforeEach, describe, expect, it, vi } from "vitest";

import { SyncEngine } from "@/features/documents/services/sync-engine";
import { LocalStorageService } from "@/features/documents/services/local-storage-service";
import type { BaseDocument } from "@/features/documents/core/types";

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

  it("stores active document ids with their document scope", () => {
    const localStorageMock = createLocalStorageMock();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", {
      localStorage: localStorageMock,
      dispatchEvent: vi.fn(),
    });

    const storage = new LocalStorageService<BaseDocument>({
      collectionKey: "veriworkly:docs:v2:resume",
      activeIdKey: "veriworkly:docs:v2:active",
      activeIdScope: "RESUME",
      updatedEventName: "veriworkly:docs-storage-updated",
      parseItem: (input) => input as BaseDocument,
      parseCollection: (input) => {
        const raw = input as { items?: Record<string, BaseDocument> };
        return { version: 2, items: raw.items ?? {} };
      },
    });

    storage.setActiveId("shared-id");

    expect(localStorageMock.getItem("veriworkly:docs:v2:active")).toBe("RESUME:shared-id");
    expect(storage.getActiveId()).toBe("shared-id");

    localStorageMock.setItem("veriworkly:docs:v2:active", "COVER_LETTER:shared-id");

    expect(storage.getActiveId()).toBeNull();
  });
});
