import Link from "next/link";

import { type RoadmapSort } from "@/features/roadmap/services/roadmap-backend";

import { cn } from "@/lib/utils";

import { buildHref } from "./RoadmapPageShell";

const RoadmapStatusFilters = ({
  currentSort,
  activeStatus,
  rootPath = "/roadmap",
}: {
  currentSort: RoadmapSort;
  activeStatus: string;
  rootPath?: string;
}) => {
  const normalizedRoot = rootPath.replace(/\/$/, "");

  const statuses = [
    { label: "All Columns", value: "all", path: `${normalizedRoot}` },
    { label: "Planned", value: "todo", path: `${normalizedRoot}/todo` },
    { label: "In Progress", value: "in-progress", path: `${normalizedRoot}/in-progress` },
    { label: "Released", value: "done", path: `${normalizedRoot}/done` },
  ];

  return (
    <div className="bg-muted/10 border-border/20 inline-flex rounded-full border p-0.5">
      {statuses.map(({ label, value, path }) => {
        const isActive = activeStatus === value;

        return (
          <Link
            key={value}
            href={buildHref(path, currentSort, {})}
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

export default RoadmapStatusFilters;
