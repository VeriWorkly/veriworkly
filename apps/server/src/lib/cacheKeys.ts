/**
 * Typed cache-key builders. Centralizing these means a future format change (or typo) is caught
 * by the compiler across every call site, instead of requiring a repo-wide grep for a hand-typed
 * string template that's easy to miss in one of the several files that read or invalidate it.
 */

export function userProfileCacheKey(userId: string): string {
  return `user:profile:v2:${userId}`;
}

/**
 * Generation namespaces (see `#lib/cacheGeneration`). Each is invalidated as a whole by one
 * `bumpGeneration`, so variants keyed by type, pagination or filters need no prefix SCAN.
 */
export const cacheNamespaces = {
  /** Every cached document-list variant for a user (one per document type). */
  documentList: (userId: string) => `documents:list:${userId}`,
  /** One document: a per-entity generation, so a racing reader cannot re-cache a stale row. */
  document: (userId: string, documentId: string) => `document:${userId}:${documentId}`,
  /** Every paginated share-link list for a user, across all of their documents. */
  shareList: (userId: string) => `share:list:${userId}`,
  /** Every `ids=` variant of the shared-document-ids lookup for a user. */
  sharedDocumentIds: (userId: string) => `share:shared-document-ids:${userId}`,
  /** Every public share snapshot (and cached 404) under a username, whatever the slug. */
  publicShare: (username: string) => `share:public-readable:${username}`,
  /**
   * The master profile read (`GET /profiles/master`), whose summary repeats account fields. A
   * generation, not a plain key (V-244): a slow read that loaded before a save used to store the
   * old row over it, and every save then 409ed against the stale `updatedAt` for up to an hour.
   */
  masterProfile: (userId: string) => `profile:${userId}`,
};

/** The document itself and every list that contains it. */
export function documentCacheNamespaces(userId: string, documentId: string): string[] {
  return [cacheNamespaces.document(userId, documentId), cacheNamespaces.documentList(userId)];
}
