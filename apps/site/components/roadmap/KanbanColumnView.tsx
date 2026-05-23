import Link from "next/link";
import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

import { KanbanColumn } from "./KanbanBoard";
import KanbanItemCard from "./KanbanItemCard";

const columnIcons = {
  "To Do": (
    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10">
      <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
    </div>
  ),

  "In Progress": (
    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
    </div>
  ),

  Done: (
    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
      <svg
        className="h-2.5 w-2.5 text-emerald-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  ),
};

const KanbanColumnView = ({
  column,
  columnHref,
  refreshHref,
  singleStatusMode,
  showDescription,
  showUrl,
  showRoadmapLinks,
}: {
  column: KanbanColumn;
  columnHref?: string;
  refreshHref?: string;
  singleStatusMode: boolean;
  showDescription: boolean;
  showUrl: boolean;
  showRoadmapLinks: boolean;
}) => {
  const icon = columnIcons[column.title as keyof typeof columnIcons] || (
    <div className="bg-muted h-1.5 w-1.5 rounded-full" />
  );

  return (
    <div className="border-border/30 bg-muted/5 flex min-h-[350px] flex-col gap-5 rounded-3xl border p-4 sm:p-5">
      {/* Column Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {icon}
            {columnHref ? (
              <Link
                href={columnHref}
                className="text-foreground hover:text-accent font-sans text-sm font-bold tracking-tight transition-colors"
              >
                {column.title}
              </Link>
            ) : (
              <h3 className="text-foreground font-sans text-sm font-bold tracking-tight">
                {column.title}
              </h3>
            )}
          </div>

          <span className="border-border/40 bg-card text-foreground rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold shadow-xs">
            {column.items.length}
          </span>
        </div>

        {refreshHref && (
          <Link
            href={refreshHref}
            className="group text-muted hover:text-foreground flex w-fit items-center gap-1 font-mono text-[9px] font-bold tracking-widest uppercase transition-colors"
          >
            <RefreshCw className="h-2.5 w-2.5 transition-transform group-hover:rotate-45" />
            Refresh
          </Link>
        )}
      </div>

      <div
        className={cn(
          "gap-4",
          singleStatusMode ? "grid md:grid-cols-2 xl:grid-cols-3" : "flex flex-col",
        )}
      >
        {column.items.length === 0 ? (
          <div className="border-border/40 bg-card/10 flex flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-12 text-center">
            <p className="text-muted/80 font-mono text-[10px] font-bold tracking-widest uppercase">
              No items
            </p>

            <p className="text-muted/60 mt-1 text-[11px]">Planned items will appear here.</p>
          </div>
        ) : (
          column.items.map((item) => (
            <KanbanItemCard
              key={item.id}
              item={item}
              showDescription={showDescription}
              showUrl={showUrl}
              showRoadmapLinks={showRoadmapLinks}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default KanbanColumnView;
