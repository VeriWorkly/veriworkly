import type { KanbanItem } from "@/components/roadmap/KanbanBoard";

/**
 * The id order for the sorts the server would have applied (roadmapService.getRoadmapOrderBy):
 * oldest = createdAt ascending; recently completed = completedAt descending with
 * never-completed items last, then updatedAt descending.
 */
export function sortOrders(items: KanbanItem[]) {
  const time = (value?: string) => (value ? Date.parse(value) : NaN);
  const ids = (list: KanbanItem[]) => list.map((item) => item.id);

  return {
    oldest: ids([...items].sort((a, b) => time(a.createdAt) - time(b.createdAt))),
    "recently-completed": ids(
      [...items].sort((a, b) => {
        const ca = time(a.completedAt);
        const cb = time(b.completedAt);
        if (Number.isNaN(ca) !== Number.isNaN(cb)) return Number.isNaN(ca) ? 1 : -1;
        return (cb || 0) - (ca || 0) || time(b.updatedAt) - time(a.updatedAt);
      }),
    ),
  };
}
