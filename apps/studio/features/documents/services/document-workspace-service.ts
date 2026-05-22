"use client";

import { getDocumentDefinition } from "@/features/documents/core/registry";
import type { DocumentType } from "@/features/documents/core/document-types";
import type { BaseDocument, DocumentMeta } from "@/features/documents/core/types";
import { DOCUMENT_STORAGE_UPDATED_EVENT } from "@/features/documents/services/document-sync";

const VERSION = "v2";
const ACTIVE_KEY = `veriworkly:docs:${VERSION}:active`;

function collectionKey(type: DocumentType) {
  return `veriworkly:docs:${VERSION}:${type.toLowerCase()}`;
}

function buildId(type: DocumentType): string {
  return `${type.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadCollection(type: DocumentType): Record<string, BaseDocument> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(collectionKey(type));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { items?: Record<string, unknown> };
    const parseItem = getDocumentDefinition(type).parse;
    const entries = Object.entries(parsed.items ?? {}).map(([id, value]) => [id, parseItem(value)]);
    return Object.fromEntries(
      entries.filter((entry): entry is [string, BaseDocument] => Boolean(entry[1])),
    );
  } catch {
    return {};
  }
}

function saveCollection(type: DocumentType, items: Record<string, BaseDocument>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(collectionKey(type), JSON.stringify({ version: 2, items }));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event(DOCUMENT_STORAGE_UPDATED_EVENT));
}

export function listDocuments(type?: DocumentType): DocumentMeta[] {
  const selectedTypes: DocumentType[] = type
    ? [type]
    : ["RESUME", "COVER_LETTER", "FORMAL_LETTER", "INVOICE"];

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

export function saveDocument(document: BaseDocument) {
  const items = loadCollection(document.type);
  items[document.id] = document;
  saveCollection(document.type, items);
}

export function createDocument(type: DocumentType) {
  const id = buildId(type);
  const doc = getDocumentDefinition(type).createDefault(id);
  saveDocument(doc);
  setActiveDocument(type, id);
  return doc;
}

export function deleteDocument(type: DocumentType, id: string) {
  const items = loadCollection(type);
  delete items[id];
  saveCollection(type, items);
}

export function setActiveDocument(type: DocumentType, id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, `${type}:${id}`);
}
