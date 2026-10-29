// Next's own file-system cache, except that a 404 page is kept in memory only.
//
// /changelog/[id] and /roadmap/[id] render unknown ids on demand (new releases and items must
// appear without a rebuild), and Next 16 stores each notFound() render as a page set on disk with
// no eviction: every made-up id would add files until the next deploy. In memory they share the
// bounded LRU (cacheMaxMemorySize, 50 MB) and are evicted like anything else. Real pages and the
// fetch cache are written to disk as before. tests/contracts/next-internals.contract.test.ts
// fails if a Next upgrade moves the class this extends.

import fileSystemCache from "next/dist/server/lib/incremental-cache/file-system-cache.js";

const FileSystemCache = fileSystemCache.default ?? fileSystemCache;

export default class SiteCacheHandler extends FileSystemCache {
  async set(key, data, ctx) {
    if (data?.kind !== "APP_PAGE" || data.status !== 404) return super.set(key, data, ctx);

    const flushToDisk = this.flushToDisk;
    this.flushToDisk = false;
    try {
      return await super.set(key, data, ctx);
    } finally {
      this.flushToDisk = flushToDisk;
    }
  }
}
