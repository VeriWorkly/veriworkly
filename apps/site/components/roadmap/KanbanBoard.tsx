import { cn } from "@veriworkly/ui";

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
  refreshPath?: string;
}

const KanbanBoard = ({
  columns,
  showDescription = true,
  showUrl = false,
  showRoadmapLinks = false,
  columnHrefMap,
  refreshPath,
}: KanbanBoardProps) => {
  const singleStatusMode = columns.length === 1;

  return (
    <div className={cn("grid gap-6", singleStatusMode ? "grid-cols-1" : "lg:grid-cols-3")}>
      {columns.map((column) => {
        return (
          <KanbanColumnView
            column={column}
            showUrl={showUrl}
            key={column.title}
            refreshPath={refreshPath}
            showDescription={showDescription}
            showRoadmapLinks={showRoadmapLinks}
            singleStatusMode={singleStatusMode}
            columnHref={columnHrefMap?.[column.title]}
          />
        );
      })}
    </div>
  );
};

export { KanbanBoard };
