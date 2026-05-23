import Link from "next/link";

import { type RoadmapSort } from "@/features/roadmap/services/roadmap-backend";

import { cn } from "@/lib/utils";

import { buildHref } from "./RoadmapPageShell";

const RoadmapSortControls = ({
  basePath,
  currentSort,
}: {
  basePath: string;
  currentSort: RoadmapSort;
}) => {
  const sorts: { label: string; value: RoadmapSort }[] = [
    { label: "Newest First", value: "newest" },
    { label: "Oldest", value: "oldest" },
    { label: "Recently Completed", value: "recently-completed" },
  ];

  return (
    <div className="bg-muted/10 border-border/20 inline-flex rounded-full border p-0.5">
      {sorts.map(({ label, value }) => {
        const isActive = currentSort === value;

        return (
          <Link
            key={value}
            href={buildHref(basePath, currentSort, { sort: value })}
            className={cn(
              "rounded-full px-3.5 py-1.5 font-sans text-xs font-bold whitespace-nowrap transition-all duration-200 select-none",
              isActive
                ? "bg-card text-foreground border-border/30 border shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.05)]"
                : "text-muted hover:text-foreground hover:bg-muted/5 border border-transparent",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
};

export default RoadmapSortControls;
