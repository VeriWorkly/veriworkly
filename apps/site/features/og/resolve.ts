import { fetchChangelogEntryById } from "@/features/changelog/services/changelog-backend";
import { describeRelease } from "@/features/changelog/utils/changelog-utils";
import { fetchRoadmapFeatureById } from "@/features/roadmap/services/roadmap-backend";

import { ogPageCard, type OgCard } from "./cards";

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
