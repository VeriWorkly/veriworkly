import { type RoadmapSort } from "@/features/roadmap/services/roadmap-backend";

export const buildHref = (
  path: string,
  currentSort: RoadmapSort,
  updates: Record<string, string | undefined>,
) => {
  const params = new URLSearchParams();

  if (currentSort !== "newest") params.set("sort", currentSort);

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === "") {
      params.delete(key);
      continue;
    }
    params.set(key, value);
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
};
