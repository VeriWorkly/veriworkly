import type { DocumentSyncState } from "@veriworkly/profile-core";

/*
 * Re-exported, not redeclared. A projection in `@veriworkly/profile-core` builds the sync
 * block of every newly created document, so the shape has to be defined once and on the side
 * both the studio and the server can import.
 */
export type { DocumentSyncState };

export interface BaseDocumentData {
  id: string;
  updatedAt: string;
  sync: DocumentSyncState;
  templateId: string;
}

export interface DocumentCollection<T extends BaseDocumentData> {
  version: number;
  items: Record<string, T>;
}

/**
 * The list-view projection of a document, held in the shared index key.
 *
 * Everything the document library, workspace search, and the sync worker's
 * pending-scan need — and nothing else. Keeping bodies out of here is what makes
 * those paths O(1) in library size instead of loading and validating every
 * document to render a list of cards.
 */
export interface DocumentIndexEntry {
  id: string;
  type: string;
  title: string;
  templateId: string;
  /** Card subtitle, e.g. a resume's role or a cover letter's "Job at Company". */
  description: string;
  updatedAt: string;
  sync: DocumentSyncState;
}

export interface DocumentIndex {
  version: number;
  /** Increments on every write. Cache keys read this instead of hashing the library. */
  revision: number;
  /** Keyed by `TYPE:id` so one index can span every document type. */
  items: Record<string, DocumentIndexEntry>;
}
