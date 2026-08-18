import type { DocumentSyncState } from "./types";

/**
 * Mirrors a document's identity onto its content when the content carries its own copy.
 *
 * `ResumeData` has both an `id` and a `sync` block of its own, and the resume store
 * round-trips through *that* copy rather than the envelope's — it hydrates from
 * `document.content` and `saveResume` rebuilds the envelope from it. So whenever the
 * envelope's identity is set or changed (creation, import), the inner copy has to move
 * with it, or the first autosave writes the stale copy straight back over the envelope.
 *
 * That is exactly how the workspace's `autoSyncEnabled` setting used to get lost:
 * `createDocument` applied it to the envelope only, and the editor's first save reverted
 * it to the definition's hardcoded `local-only`.
 *
 * Cover letter content has neither field, so this is a no-op for it — hence the `in`
 * checks rather than an unconditional spread.
 */
export function withDocumentIdentity<T>(
  content: T,
  identity: { id?: string; sync?: DocumentSyncState },
): T {
  if (typeof content !== "object" || content === null) return content;

  const next = { ...(content as Record<string, unknown>) };

  if (identity.id !== undefined && "id" in next) next.id = identity.id;
  if (identity.sync !== undefined && "sync" in next) next.sync = identity.sync;

  return next as T;
}
