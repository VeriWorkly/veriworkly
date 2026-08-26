import { Suspense } from "react";

import { Container } from "@veriworkly/ui";

import {
  type ChangelogType,
  type ChangelogResponse,
} from "@/features/changelog/services/changelog-backend";

import ChangelogHeader from "./ChangelogHeader";
import ChangelogTimeline from "./ChangelogTimeline";
import ChangelogPagination from "./ChangelogPagination";

import ChangelogSearch from "@/features/changelog/components/controls/ChangelogSearch";
import ChangelogStatsGrid from "@/features/changelog/components/controls/ChangelogStatsGrid";
import ChangelogTypeFilters from "@/features/changelog/components/controls/ChangelogTypeFilters";
import ChangelogContributors from "@/features/changelog/components/controls/ChangelogContributors";

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
          <ChangelogTypeFilters activeType={activeType} search={search} />

          <Suspense fallback={<div className="h-9 w-full sm:w-64" />}>
            <ChangelogSearch />
          </Suspense>
        </div>

        <ChangelogStatsGrid stats={stats} />

        <ChangelogTimeline entries={entries} latestVersion={stats?.latest?.version} />

        {data?.pagination && (
          <ChangelogPagination
            search={search}
            activeType={activeType}
            pagination={data.pagination}
          />
        )}
      </Container>
    </div>
  );
};

export default ChangelogPageShell;
