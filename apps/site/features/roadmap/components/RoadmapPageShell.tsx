import Link from "next/link";

import { type RoadmapResponse } from "@/features/roadmap/services/roadmap-backend";

import { Container } from "@veriworkly/ui";

import { KanbanBoard, type KanbanColumn } from "@/components/roadmap/KanbanBoard";

import RoadmapHeader from "./RoadmapHeader";
import RoadmapStatsGrid from "./RoadmapStatsGrid";
import { RoadmapSortControls, RoadmapSortProvider } from "./RoadmapSort";
import RoadmapStatusFilters from "./RoadmapStatusFilters";

interface RoadmapPageShellProps {
  title: string;
  description: string;
  data: RoadmapResponse;
  basePath: string;
  activeStatus: "all" | "todo" | "in-progress" | "done";
  rootPath?: string;
}

const RoadmapPageShell = ({
  title,
  description,
  data,
  basePath,
  activeStatus,
  rootPath = "/roadmap",
}: RoadmapPageShellProps) => {
  const normalizedRootPath = rootPath.replace(/\/$/, "");

  const { sections } = data;

  const columns: KanbanColumn[] = sections.map((section) => ({
    title: section.title,
    items: section.items.map((item) => ({
      ...item,
      eta: item.eta ?? undefined,
      startedAt: item.startedAt ?? undefined,
      completedAt: item.completedAt ?? undefined,
      completedQuarter: item.completedQuarter ?? undefined,
    })),
  }));

  // A column the backend could not deliver says so; a genuinely empty backlog does not.
  const boardFailed = data.failedStatuses.length > 0;

  const columnHrefMap = {
    "To Do": `${normalizedRootPath}/todo`,
    "In Progress": `${normalizedRootPath}/in-progress`,
    Done: `${normalizedRootPath}/done`,
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />

      <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-150 w-150 rounded-full blur-[130px]" />

      <Container className="pt-28 pb-20 lg:pt-36">
        <RoadmapSortProvider>
          <RoadmapHeader title={title} description={description} />

          <div className="border-border/40 bg-card/30 mb-10 flex flex-col gap-4 rounded-3xl border p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:flex-row sm:items-center sm:justify-between">
            <div className="relative scrollbar-none overflow-x-auto pb-1.5 sm:pb-0">
              <RoadmapStatusFilters activeStatus={activeStatus} rootPath={normalizedRootPath} />
            </div>

            <div className="relative scrollbar-none overflow-x-auto pb-1.5 sm:self-end sm:pb-0">
              <RoadmapSortControls />
            </div>
          </div>

          <RoadmapStatsGrid sections={sections} />

          {boardFailed && (
            <div
              role="status"
              className="border-warning/30 bg-warning/5 mb-10 rounded-2xl border p-4 text-sm"
            >
              <p className="text-foreground font-semibold">
                Some roadmap columns aren&apos;t loading
              </p>
              <p className="text-muted mt-1 text-xs leading-relaxed">
                We couldn&apos;t reach the roadmap service just now, so an empty column here may not
                really be empty. Try the refresh control on a column, or check{" "}
                <Link href="/stats" className="text-accent underline underline-offset-2">
                  development activity
                </Link>{" "}
                in the meantime.
              </p>
            </div>
          )}

          <KanbanBoard
            showDescription
            showRoadmapLinks
            columns={columns}
            refreshPath={basePath}
            columnHrefMap={columnHrefMap}
          />
        </RoadmapSortProvider>
      </Container>
    </div>
  );
};

export default RoadmapPageShell;
