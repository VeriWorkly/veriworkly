"use client";

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@veriworkly/ui";

import type { RoadmapSort } from "@/features/roadmap/services/roadmap-backend";

/**
 * Sorting is view state over items already on the page. It used to be a `?sort=` link per
 * option, which made the four roadmap pages dynamic and gave Google 45 duplicate URLs to
 * crawl (W-037, SEO-REPORT section 2). The server renders each column newest first and
 * passes the id order for the other two sorts; this reorders the rendered cards by key, so
 * the DOM and tab order follow what is on screen.
 */

const SortContext = createContext<{ sort: RoadmapSort; setSort: (sort: RoadmapSort) => void }>({
  sort: "newest",
  setSort: () => {},
});

export function RoadmapSortProvider({ children }: { children: ReactNode }) {
  const [sort, setSort] = useState<RoadmapSort>("newest");

  return <SortContext.Provider value={{ sort, setSort }}>{children}</SortContext.Provider>;
}

const SORTS: { label: string; value: RoadmapSort }[] = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Recently Completed", value: "recently-completed" },
];

export function RoadmapSortControls() {
  const { sort, setSort } = useContext(SortContext);

  return (
    <div
      role="group"
      aria-label="Sort roadmap items"
      className="bg-muted/10 border-border/20 inline-flex rounded-full border p-0.5"
    >
      {SORTS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          aria-pressed={sort === value}
          onClick={() => setSort(value)}
          className={cn(
            "cursor-pointer rounded-full border px-3.5 py-1.5 font-sans text-xs font-bold whitespace-nowrap transition-all duration-200 select-none",
            sort === value
              ? "bg-card text-foreground border-border/30 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.05)]"
              : "text-muted hover:text-foreground hover:bg-muted/5 border-transparent",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Children keyed by item id, in newest-first order; `orders` gives the other two orders. */
export function SortedItems({
  orders,
  children,
}: {
  orders: Record<Exclude<RoadmapSort, "newest">, string[]>;
  children: ReactNode;
}) {
  const { sort } = useContext(SortContext);
  const items = Children.toArray(children);

  if (sort === "newest") return items;

  const position = new Map(orders[sort].map((id, index) => [id, index]));
  const idOf = (node: ReactNode) =>
    isValidElement(node) ? String(node.key).replace(/^\.\$/, "") : "";

  return [...items].sort(
    (a, b) => (position.get(idOf(a)) ?? Infinity) - (position.get(idOf(b)) ?? Infinity),
  );
}
