import fs from "fs";
import path from "path";

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;
const WORDS_PER_MINUTE = 200;

export type PostStats = { words: number; minutes: number; label: string };

/**
 * The archive renders every post in one pass, so an uncached implementation performs a
 * synchronous disk read per post per render. Memoised by filename: the build process is
 * short-lived and content cannot change within it.
 */
const cache = new Map<string, PostStats>();

/** Throws when the post file cannot be read: content is build-time, so that is a bug to fail on. */
export function getPostStats(filename: string): PostStats {
  const cached = cache.get(filename);
  if (cached) return cached;

  const fullPath = path.join(process.cwd(), "content", "blog", filename);

  // Frontmatter is metadata, not prose: counting its `faq` and `tags` blocks would inflate the total.
  const content = fs.readFileSync(fullPath, "utf-8").replace(FRONTMATTER, "");
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));

  const stats = { words, minutes, label: `${minutes} min read` };

  cache.set(filename, stats);

  return stats;
}

export function getReadingTime(filename: string): string {
  return getPostStats(filename).label;
}
