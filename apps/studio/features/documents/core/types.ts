import type { DocumentSyncState } from "@veriworkly/profile-core";

import type { DocumentType } from "./document-types";

export type ExportFormat = "pdf" | "docx" | "html" | "markdown" | "json" | "txt";

// The one declaration lives in profile-core, as in `@/types/document`; do not redeclare it.
export type { DocumentSyncState };

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
