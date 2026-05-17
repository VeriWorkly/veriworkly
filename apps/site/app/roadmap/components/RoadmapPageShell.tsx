import { useMemo } from "react";

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

  const sections = useMemo(
    () =>
      data?.sections ?? [
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
      ],
    [data?.sections],
  );

  const columns: KanbanColumn[] = sections.map((section) => ({
    title: section.title,
    color:
      section.status === "todo" ? "blue" : section.status === "in-progress" ? "amber" : "emerald",
    items: (section.items ?? []).map((item) => ({
      ...item,
      eta: item.eta ?? undefined,
      startedAt: item.startedAt ?? undefined,
      completedAt: item.completedAt ?? undefined,
      completedQuarter: item.completedQuarter ?? undefined,
    })),
  }));

  const refreshTimestamp = useMemo(() => INITIAL_REFRESH_TIMESTAMP, []);

  const refreshHrefMap = useMemo(
    () =>
      Object.fromEntries(
        sections.map((section) => [
          section.title,
          buildHref(basePath, currentSort, {
            refresh: section.status,
            r: refreshTimestamp,
          }),
        ]),
      ),
    [sections, basePath, currentSort, refreshTimestamp],
  );

  const columnHrefMap = {
    "To Do": `${normalizedRootPath}/todo`,
    "In Progress": `${normalizedRootPath}/in-progress`,
    Done: `${normalizedRootPath}/done`,
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Container className="pt-28 pb-20 lg:pt-36">
        <RoadmapHeader title={title} description={description} />

        <div className="border-border/60 bg-card/40 mb-8 flex justify-between rounded-2xl border p-5">
          <RoadmapStatusFilters
            currentSort={currentSort}
            activeStatus={activeStatus}
            rootPath={normalizedRootPath}
          />

          <RoadmapSortControls basePath={basePath} currentSort={currentSort} />
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
