import { cn } from "@/lib/utils";

import KanbanColumnView from "./KanbanColumnView";

export interface KanbanItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  tags?: string[];
  eta?: string;
  url?: string;
  updatedAt?: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  completedQuarter?: string;
}

export interface KanbanColumn {
  title: string;
  items: KanbanItem[];
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  showDescription?: boolean;
  showUrl?: boolean;
  showRoadmapLinks?: boolean;
  columnHrefMap?: Partial<Record<string, string>>;
  refreshHrefMap?: Partial<Record<string, string>>;
}

const KanbanBoard = ({
  columns,
  showDescription = true,
  showUrl = false,
  showRoadmapLinks = false,
  columnHrefMap,
  refreshHrefMap,
}: KanbanBoardProps) => {
  const singleStatusMode = columns.length === 1;

  return (
    <div className={cn("grid gap-6", singleStatusMode ? "grid-cols-1" : "lg:grid-cols-3")}>
      {columns.map((column) => {
        return (
          <KanbanColumnView
            key={column.title}
            column={column}
            columnHref={columnHrefMap?.[column.title]}
            refreshHref={refreshHrefMap?.[column.title]}
            singleStatusMode={singleStatusMode}
            showDescription={showDescription}
            showUrl={showUrl}
            showRoadmapLinks={showRoadmapLinks}
          />
        );
      })}
    </div>
  );
};

export { KanbanBoard };
