import { fetchChangelogEntryById } from "@/features/changelog/services/changelog-backend";
import { describeRelease } from "@/features/changelog/utils/changelog-utils";
import { fetchRoadmapFeatureById } from "@/features/roadmap/services/roadmap-backend";

import { ogPageCard, type OgCard } from "./cards";

const CARD_KEYS = ["page", "changelog", "roadmap"] as const;

/**
 * The one query string that draws this card: the key resolveOgCard reads, then `theme=dark`.
 * Anything else (extra or repeated params) redirects here, so a query string cannot mint new
 * cache entries for the same image.
 */
export function canonicalOgQuery(searchParams: URLSearchParams): string {
  const canonical = new URLSearchParams();
  const key = CARD_KEYS.find((name) => searchParams.get(name));

  if (key) canonical.set(key, searchParams.get(key)!);
  if (key && searchParams.get("theme") === "dark") canonical.set("theme", "dark");

  return canonical.toString();
}

/** Only cards our own pages define: arbitrary text would let anyone mint a branded card. */
export async function resolveOgCard(searchParams: URLSearchParams): Promise<OgCard | null> {
  const page = searchParams.get("page");
  if (page) return ogPageCard(page);

  const releaseId = searchParams.get("changelog");
  if (releaseId) {
    const entry = await fetchChangelogEntryById(releaseId).catch(() => null);
    return entry
      ? { title: `v${entry.version} - ${entry.title}`, description: describeRelease(entry) }
      : null;
  }

  const roadmapId = searchParams.get("roadmap");
  if (roadmapId) {
    const item = await fetchRoadmapFeatureById(roadmapId).catch(() => null);
    return item ? { title: item.title, description: item.description || undefined } : null;
  }

  return null;
}
