/** Fetch-cache tags the API can refresh through /api/revalidate. */
export const CONTENT_CACHE_TAGS = ["changelog", "roadmap"] as const;

export type ContentCacheTag = (typeof CONTENT_CACHE_TAGS)[number];
