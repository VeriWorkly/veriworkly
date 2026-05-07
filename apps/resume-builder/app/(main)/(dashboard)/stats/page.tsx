import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

import {
  PAGE_SIZE,
  parseKind,
  parsePage,
  dateToToIso,
  parseStatus,
  dateFromToIso,
  parseDateInput,
} from "./components/stats-utils";

import {
  fetchGitHubIssuesFromBackend,
  fetchGitHubStatsFromBackend,
} from "@/features/github/services/github-backend";

import { Container } from "@veriworkly/ui";

import StatsHero from "./components/StatsHero";
import StatsBoard from "./components/StatsBoard";
import StatsFilters from "./components/StatsFilters";
import StatsOverview from "./components/StatsOverview";
import StatsPagination from "./components/StatsPagination";

export const metadata: Metadata = {
  title: `Development Activity `,
  description:
    "Follow the GitHub sync board with live status filters, pagination, and sync timing.",
};

interface StatsPageProps {
  searchParams: Promise<{
    status?: string;
    kind?: string;
    page?: string;
    updatedFrom?: string;
    updatedTo?: string;
  }>;
}

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const params = await searchParams;

  const kind = parseKind(params.kind);
  const page = parsePage(params.page);
  const status = parseStatus(params.status);
  const updatedTo = parseDateInput(params.updatedTo);
  const updatedFrom = parseDateInput(params.updatedFrom);

  const offset = (page - 1) * PAGE_SIZE;

  const [stats, issuePage] = await Promise.all([
    fetchGitHubStatsFromBackend().catch(() => null),
    fetchGitHubIssuesFromBackend({
      status,
      kind,
      limit: PAGE_SIZE,
      offset,
      updatedFrom: dateFromToIso(updatedFrom),
      updatedTo: dateToToIso(updatedTo),
    }).catch(() => null),
  ]);

  const projectName = stats?.projectName ?? `${siteConfig.shortName} GitHub Board`;
  const projectUrl = stats?.projectUrl ?? siteConfig.links.github;

  const issueCount = stats?.stats.issues ?? 0;
  const totalItems = stats?.stats.totalItems ?? issuePage?.total ?? 0;

  const pullRequestCount = stats?.stats.pullRequests ?? 0;
  const completionRate = stats?.stats.completionRate ?? "0.00";

  const syncedAt = stats?.syncedAt ?? issuePage?.syncedAt ?? null;
  const nextSyncAt = stats?.nextSyncAt ?? null;

  const hasMore = Boolean(issuePage?.hasMore);
  const totalPages = Math.max(1, Math.ceil((issuePage?.total ?? 0) / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="from-accent/10 pointer-events-none absolute inset-x-0 top-0 h-64" />
      <div className="pointer-events-none absolute top-20 -right-32 h-64 w-64 rounded-full blur-3xl" />

      <Container className="relative py-12 md:py-16">
        <StatsHero syncedAt={syncedAt} nextSyncAt={nextSyncAt} />

        <StatsOverview
          projectUrl={projectUrl}
          totalItems={totalItems}
          issueCount={issueCount}
          projectName={projectName}
          completionRate={completionRate}
          pullRequestCount={pullRequestCount}
        />

        <StatsFilters kind={kind} status={status} updatedTo={updatedTo} updatedFrom={updatedFrom} />

        <StatsBoard offset={offset} issuePage={issuePage} totalItems={totalItems} />

        <StatsPagination
          kind={kind}
          status={status}
          hasMore={hasMore}
          updatedTo={updatedTo}
          currentPage={currentPage}
          updatedFrom={updatedFrom}
        />

        <section className="border-border/70 bg-card/70 mt-10 rounded-3xl border p-6">
          <h3 className="text-foreground text-lg font-semibold">About this sync</h3>

          <p className="text-muted mt-3 max-w-3xl leading-relaxed">
            GitHub data is synced on the server, persisted as normalized rows, and served in
            filtered slices so the frontend can render quickly without re-fetching the entire board
            on every visit.
          </p>
        </section>
      </Container>
    </main>
  );
}
