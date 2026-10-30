import { Suspense } from "react";

import {
  type ChangelogType,
  type ChangelogResponse,
} from "@/features/changelog/services/changelog-backend";

import { FRAME, PageHero } from "@/components/marketing/PageLayout";

import ChangelogTimeline from "./ChangelogTimeline";
import ChangelogPagination from "./ChangelogPagination";

import ChangelogSearch from "@/features/changelog/components/controls/ChangelogSearch";
import ChangelogStatsGrid from "@/features/changelog/components/controls/ChangelogStatsGrid";
import ChangelogTypeFilters from "@/features/changelog/components/controls/ChangelogTypeFilters";
import ChangelogContributors from "@/features/changelog/components/controls/ChangelogContributors";

interface ChangelogPageShellProps {
  description: string;
  data: ChangelogResponse | null;
  activeType: ChangelogType | "all";
  search?: string;
}

const ChangelogPageShell = ({ description, data, activeType, search }: ChangelogPageShellProps) => {
  const entries = data?.entries ?? [];
  const stats = data?.stats ?? null;

  return (
    <>
      <PageHero
        title="Changelog."
        highlight="Every release."
        lede={description}
        aside={<ChangelogContributors stats={stats} />}
      >
        <ChangelogStatsGrid stats={stats} />
      </PageHero>

      <section aria-label="Releases" className="py-16 lg:py-24">
        <div className={FRAME}>
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <ChangelogTypeFilters activeType={activeType} search={search} />

            <Suspense fallback={<div className="h-12 w-full sm:w-80" />}>
              <ChangelogSearch />
            </Suspense>
          </div>

          <ChangelogTimeline
            entries={entries}
            failed={data?.failed ?? true}
            latestVersion={stats?.latest?.version}
            filtered={activeType !== "all" || Boolean(search)}
          />

          {data?.pagination && (
            <ChangelogPagination
              search={search}
              activeType={activeType}
              pagination={data.pagination}
            />
          )}
        </div>
      </section>
    </>
  );
};

export default ChangelogPageShell;
