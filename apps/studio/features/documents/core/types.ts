import type { DocumentType } from "./document-types";

import type { SyncStatus } from "@/features/documents/services/sync-engine";

export type ExportFormat = "pdf" | "docx" | "html" | "markdown" | "json" | "txt";

export interface DocumentSyncState {
  enabled: boolean;
  status: SyncStatus;
  cloudDocumentId: string | null;
  lastSyncedAt: string | null;
  revision: number;
}

export interface BaseDocument<TContent = unknown> {
  id: string;
  type: DocumentType;
  title: string;
  templateId: string;
  content: TContent;
  updatedAt: string;
  sync: DocumentSyncState;
}

export interface TemplateMeta {
  id: string;
  name: string;
  documentType: DocumentType;
  description: string;
  accentColor: string;
  previewImage: string;
  tags: string[];
}

export interface DocumentMeta {
  id: string;
  type: DocumentType;
  title: string;
  templateId: string;
  updatedAt: string;
  sync: DocumentSyncState;
}
