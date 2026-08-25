import Link from "next/link";

import {
  type RoadmapStatus,
  type RoadmapResponse,
} from "@/features/roadmap/services/roadmap-backend";
import { Container } from "@veriworkly/ui";
import { KanbanBoard, type KanbanColumn } from "@/components/roadmap/KanbanBoard";

import RoadmapHeader from "./RoadmapHeader";
import RoadmapStatsGrid from "./RoadmapStatsGrid";
import RoadmapSortControls from "./RoadmapSortControls";
import RoadmapStatusFilters from "./RoadmapStatusFilters";

interface RoadmapPageShellProps {
  title: string;
  description: string;
  data: RoadmapResponse | null;
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
  const currentSort = data?.query?.sort ?? "newest";
  const normalizedRootPath = rootPath.replace(/\/$/, "");

  const sections = data?.sections ?? [
    {
      title: "To Do",
      status: "todo" as RoadmapStatus,
      items: [],
      fetchedAt: new Date().toISOString(),
    },
    {
      title: "In Progress",
      status: "in-progress" as RoadmapStatus,
      items: [],
      fetchedAt: new Date().toISOString(),
    },
    {
      title: "Done",
      status: "done" as RoadmapStatus,
      items: [],
      fetchedAt: new Date().toISOString(),
    },
  ];

  const columns: KanbanColumn[] = sections.map((section) => ({
    title: section.title,
    items: (section.items ?? []).map((item) => ({
      ...item,
      eta: item.eta ?? undefined,
      startedAt: item.startedAt ?? undefined,
      completedAt: item.completedAt ?? undefined,
      completedQuarter: item.completedQuarter ?? undefined,
    })),
  }));

  /**
   * `fetchRoadmapFromBackend` swallows its own failures and returns empty sections, which
   * is the right call for the page as a whole - but it renders identically to a roadmap
   * that genuinely has nothing on it. On a page whose entire purpose is showing that work
   * is happening, "we're not building anything" is the worst possible reading of an
   * outage, so an all-empty board says so explicitly.
   */
  const boardIsEmpty = columns.every((column) => column.items.length === 0);

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
        <RoadmapHeader title={title} description={description} />

        <div className="border-border/40 bg-card/30 mb-10 flex flex-col gap-4 rounded-3xl border p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:flex-row sm:items-center sm:justify-between">
          <div className="scrollbar-none overflow-x-auto pb-1.5 sm:pb-0">
            <RoadmapStatusFilters
              currentSort={currentSort}
              activeStatus={activeStatus}
              rootPath={normalizedRootPath}
            />
          </div>

          <div className="scrollbar-none overflow-x-auto pb-1.5 sm:self-end sm:pb-0">
            <RoadmapSortControls basePath={basePath} currentSort={currentSort} />
          </div>
        </div>

        <RoadmapStatsGrid sections={sections} />

        {boardIsEmpty && (
          <div
            role="status"
            className="border-warning/30 bg-warning/5 mb-10 rounded-2xl border p-4 text-sm"
          >
            <p className="text-foreground font-semibold">Roadmap items aren&apos;t loading</p>
            <p className="text-muted mt-1 text-xs leading-relaxed">
              We couldn&apos;t reach the roadmap service just now, so this board is showing empty
              rather than out of date. Try the refresh control on a column, or check{" "}
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
          columnHrefMap={columnHrefMap}
          refreshPath={basePath}
        />
      </Container>
    </div>
  );
};

export default RoadmapPageShell;
