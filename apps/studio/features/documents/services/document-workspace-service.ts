"use client";

import type { DocumentType } from "@/features/documents/core/document-types";
import type { BaseDocument, DocumentMeta } from "@/features/documents/core/types";
import type { SaveDocumentOptions, SaveDocumentResult } from "./local-storage-service";

import { LocalStorageService } from "./local-storage-service";

import { DOCUMENT_TYPES } from "@/features/documents/core/document-types";
import { getDocumentDefinition } from "@/features/documents/core/registry";
import { DOCUMENT_STORAGE_UPDATED_EVENT } from "@/features/documents/services/document-sync";
import { loadWorkspaceSettingsFromLocalStorage } from "@/features/documents/services/workspace-settings";

const VERSION = "v2";
const ACTIVE_KEY = `veriworkly:docs:${VERSION}:active`;
const pendingSaves = new Map<string, { document: BaseDocument; timer: number | null }>();

function collectionKey(type: DocumentType) {
  return `veriworkly:docs:${VERSION}:${type.toLowerCase()}`;
}

function pendingSaveKey(type: DocumentType, id: string) {
  return `${type}:${id}`;
}

function buildId(type: DocumentType): string {
  return `${type.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseCollection(type: DocumentType, input: unknown) {
  const collection =
    typeof input === "object" && input !== null
      ? (input as { version?: unknown; items?: unknown })
      : {};

  const rawItems =
    typeof collection.items === "object" && collection.items !== null ? collection.items : {};

  const parseItem = getDocumentDefinition(type).parse;
  const entries = Object.entries(rawItems).map(([id, value]) => [id, parseItem(value)]);

  return {
    version: typeof collection.version === "number" ? collection.version : 2,
    items: Object.fromEntries(
      entries.filter((entry): entry is [string, BaseDocument] => Boolean(entry[1])),
    ),
  };
}

function createStorage(type: DocumentType) {
  return new LocalStorageService<BaseDocument>({
    collectionKey: collectionKey(type),
    activeIdKey: ACTIVE_KEY,
    activeIdScope: type,
    updatedEventName: DOCUMENT_STORAGE_UPDATED_EVENT,
    parseItem: getDocumentDefinition(type).parse,
    parseCollection: (input) => parseCollection(type, input),
  });
}

function loadCollection(type: DocumentType): Record<string, BaseDocument> {
  if (typeof window === "undefined") return {};

  return createStorage(type).loadCollection().items;
}

function saveCollection(
  type: DocumentType,
  items: Record<string, BaseDocument>,
): SaveDocumentResult {
  if (typeof window === "undefined") return { ok: true, queued: false };

  const result = createStorage(type).saveCollection({ version: 2, items });

  if (!result.ok) return { ok: false, reason: result.reason };

  window.dispatchEvent(new Event("storage"));

  return { ok: true, queued: false };
}

function clearPendingSave(type: DocumentType, id: string) {
  if (typeof window === "undefined") return;

  const key = pendingSaveKey(type, id);
  const pending = pendingSaves.get(key);

  if (!pending) return;

  if (pending.timer !== null) {
    window.clearTimeout(pending.timer);
  }

  pendingSaves.delete(key);
}

export function listDocuments(type?: DocumentType): DocumentMeta[] {
  const selectedTypes: DocumentType[] = type ? [type] : [...DOCUMENT_TYPES];

  return selectedTypes
    .flatMap((t) => Object.values(loadCollection(t)))
    .map((doc) => ({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      templateId: doc.templateId,
      updatedAt: doc.updatedAt,
      sync: doc.sync,
    }))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function loadDocumentById(type: DocumentType, id: string): BaseDocument | null {
  return loadCollection(type)[id] ?? null;
}

function persistDocument(document: BaseDocument): SaveDocumentResult {
  const items = loadCollection(document.type);
  items[document.id] = document;
  const result = saveCollection(document.type, items);

  if (result.ok) setActiveDocument(document.type, document.id);

  return result;
}

export function saveDocument(
  document: BaseDocument,
  options?: SaveDocumentOptions,
): SaveDocumentResult {
  if (typeof window === "undefined") return { ok: true, queued: false };

  if (options?.flush) {
    clearPendingSave(document.type, document.id);
    return persistDocument(document);
  }

  const debounceMs = Math.max(0, options?.debounceMs ?? 0);

  if (debounceMs > 0) {
    const key = pendingSaveKey(document.type, document.id);

    clearPendingSave(document.type, document.id);

    const timer = window.setTimeout(() => {
      const pending = pendingSaves.get(key);
      pendingSaves.delete(key);

      if (pending) persistDocument(pending.document);
    }, debounceMs);

    pendingSaves.set(key, { document, timer });
    return { ok: true, queued: true };
  }

  return persistDocument(document);
}

export function createDocument(type: DocumentType) {
  const id = buildId(type);
  const defaultDoc = getDocumentDefinition(type).createDefault(id);
  const workspaceSettings = loadWorkspaceSettingsFromLocalStorage();
  const doc: BaseDocument = {
    ...defaultDoc,
    sync: {
      ...defaultDoc.sync,
      enabled: workspaceSettings.autoSyncEnabled,
      status: workspaceSettings.autoSyncEnabled ? "pending" : "local-only",
    },
  };

  saveDocument(doc);
  setActiveDocument(type, id);

  return doc;
}

export function deleteDocument(type: DocumentType, id: string) {
  clearPendingSave(type, id);

  const items = loadCollection(type);
  delete items[id];

  saveCollection(type, items);
}

export function setActiveDocument(type: DocumentType, id: string) {
  if (typeof window === "undefined") return;

  createStorage(type).setActiveId(id);
}

export function listFullDocuments(type: DocumentType): BaseDocument[] {
  return Object.values(loadCollection(type)).sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}
