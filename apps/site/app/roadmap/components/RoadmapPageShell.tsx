import {
  type RoadmapSort,
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

export const buildHref = (
  path: string,
  currentSort: RoadmapSort,
  updates: Record<string, string | undefined>,
) => {
  const params = new URLSearchParams();

  if (currentSort !== "newest") params.set("sort", currentSort);

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === "") {
      params.delete(key);
      continue;
    }
    params.set(key, value);
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

const INITIAL_REFRESH_TIMESTAMP = Date.now().toString();

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

  const refreshTimestamp = INITIAL_REFRESH_TIMESTAMP;

  const refreshHrefMap = Object.fromEntries(
    sections.map((section) => [
      section.title,
      buildHref(basePath, currentSort, {
        refresh: section.status,
        r: refreshTimestamp,
      }),
    ]),
  );

  const columnHrefMap = {
    "To Do": `${normalizedRootPath}/todo`,
    "In Progress": `${normalizedRootPath}/in-progress`,
    Done: `${normalizedRootPath}/done`,
  };

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
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

        <KanbanBoard
          showDescription
          showRoadmapLinks
          columns={columns}
          columnHrefMap={columnHrefMap}
          refreshHrefMap={refreshHrefMap}
        />
      </Container>
    </main>
  );
};

export default RoadmapPageShell;
