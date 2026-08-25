import { Suspense } from "react";
import { Container } from "@veriworkly/ui";

import {
  type ChangelogResponse,
  type ChangelogType,
} from "@/features/changelog/services/changelog-backend";

import ChangelogHeader from "./ChangelogHeader";
import ChangelogStatsGrid from "./ChangelogStatsGrid";
import ChangelogTypeFilters from "./ChangelogTypeFilters";
import ChangelogSearch from "./ChangelogSearch";
import ChangelogTimeline from "./ChangelogTimeline";
import ChangelogContributors from "./ChangelogContributors";
import ChangelogPagination from "./ChangelogPagination";

interface ChangelogPageShellProps {
  title: string;
  description: string;
  data: ChangelogResponse | null;
  activeType: ChangelogType | "all";
  search?: string;
}

const ChangelogPageShell = ({
  title,
  description,
  data,
  activeType,
  search,
}: ChangelogPageShellProps) => {
  const entries = data?.entries ?? [];
  const stats = data?.stats ?? null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />

      <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-150 w-150 rounded-full blur-[130px]" />

      <Container className="pt-28 pb-20 lg:pt-36">
        <ChangelogHeader title={title} description={description} />

        <ChangelogContributors stats={stats} />

        <div className="border-border/40 bg-card/30 mb-10 flex flex-col gap-4 rounded-3xl border p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:flex-row sm:items-center sm:justify-between">
          {/*
            Wraps rather than scrolling. The old `overflow-x-auto scrollbar-none` combination
            clipped "Patch" off the right edge on narrow phones with no scrollbar to hint that
            anything was there - a filter you cannot see is a filter you cannot use.
          */}
          <ChangelogTypeFilters activeType={activeType} search={search} />

          <Suspense fallback={<div className="h-9 w-full sm:w-64" />}>
            <ChangelogSearch />
          </Suspense>
        </div>

        <ChangelogStatsGrid stats={stats} />

        <ChangelogTimeline entries={entries} latestVersion={stats?.latest?.version} />

        {data?.pagination && (
          <ChangelogPagination
            pagination={data.pagination}
            activeType={activeType}
            search={search}
          />
        )}
      </Container>
    </div>
  );
};

export default ChangelogPageShell;
