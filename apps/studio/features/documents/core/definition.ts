import type { ComponentType } from "react";

import type { MasterProfileData } from "@veriworkly/profile-core";

import type { DocumentType } from "./document-types";
import type { BaseDocument, ExportFormat, TemplateMeta } from "./types";

export interface DocumentExportOptions {
  /**
   * DOM id of the document's rendered preview, when the caller has one on screen.
   *
   * Only the resume HTML exporter reads it, and only to choose between a WYSIWYG capture
   * of the preview and a document generated from the data — see export-html.ts. Passing it
   * through the dispatcher is what let the editor's HTML export keep its existing output
   * while still going through the one entry point.
   */
  previewElementId?: string;
}

export type DocumentExporter = (
  document: BaseDocument,
  options?: DocumentExportOptions,
) => Promise<void>;

/**
 * What a parsed import file yields: content and presentation, and *no identity*.
 *
 * The omission is the point. "Import JSON" used to mean two opposite things — the resume
 * created a fresh document, the cover letter merged into the open one while keeping its
 * `id` and `cloudDocumentId`, so an imported file could be pushed over an unrelated cloud
 * document on the next sync. Because this shape cannot express an id or a sync block, no
 * parser can leak one, whatever the file contains. The guarantee is structural rather than
 * a list of fields some future `importJson` has to remember to clear.
 */
export interface DocumentImportDraft<TContent = unknown> {
  title: string;
  templateId: string;
  content: TContent;
}

export interface DocumentDefinition<TContent = unknown> {
  type: DocumentType;
  label: string;
  icon: string;
  defaultTemplateId: string;
  exportFormats: ExportFormat[];
  templates: TemplateMeta[];
  /**
   * Builds a new, empty document.
   *
   * `master` is the user's master profile when the caller could resolve one — every type
   * seeds from it, through its own `projectTo*` in `@veriworkly/profile-core`. It stays
   * optional because creation must still work for a guest, offline, or before a profile
   * exists; each type decides what its own no-profile fallback is.
   */
  createDefault: (id: string, master?: MasterProfileData) => BaseDocument<TContent>;
  parse: (value: unknown) => BaseDocument<TContent> | null;
  /**
   * Parses a user-supplied JSON file into a new document's content.
   *
   * Distinct from {@link parse}, which validates a *stored* document and must be strict
   * about the envelope. An import file is whatever this type's own "Export → JSON" writes
   * — a full envelope for resumes, a bare content object for cover letters — plus whatever
   * a user hand-edited into it, so this is the lenient, allow-both entry point.
   *
   * Mirrors `loadExporter`: the toolbar calls one generic import and type dispatch lives
   * here, so the two document types cannot drift apart on what "Import JSON" does again.
   * Returns `null` for input its schema rejects.
   */
  importJson: (raw: unknown) => DocumentImportDraft<TContent> | null;
  /**
   * One-line card subtitle for list views (a resume's role, a cover letter's
   * "Job at Company"). Lives here so the storage index can be built generically
   * instead of the library switching on document type.
   */
  describe: (document: BaseDocument<TContent>) => string;
  Editor: ComponentType<{ documentId: string }>;
  /**
   * Resolves the handler for one export format, behind a dynamic `import()`.
   *
   * Must stay lazy. The export path statically pulls in `@react-pdf/renderer`
   * (~1.8MB) plus `docx` (~390KB); reaching it through a static import chain is
   * what previously put both on every route that merely *listed* documents.
   */
  loadExporter: (format: ExportFormat) => Promise<DocumentExporter>;
}
