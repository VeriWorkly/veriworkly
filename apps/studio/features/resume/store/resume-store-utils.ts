import type { ResumeData } from "@/types/resume";

export function reorderItems<T>(items: T[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
}

export function withTimestamp(resume: ResumeData) {
  return {
    ...resume,
    updatedAt: new Date().toISOString(),
  };
}
