import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import {
  PAGE_SIZE,
  parseKind,
  parsePage,
  dateToToIso,
  parseStatus,
  dateFromToIso,
  parseDateInput,
} from "@/features/stats/components/stats-utils";

import { Container } from "@veriworkly/ui";

import {
  fetchGitHubStatsFromBackend,
  fetchGitHubIssuesFromBackend,
} from "@/features/github/services/github-backend";

import StatsHero from "@/features/stats/components/StatsHero";
import StatsBoard from "@/features/stats/components/StatsBoard";
import StatsFilters from "@/features/stats/components/StatsFilters";
import StatsOverview from "@/features/stats/components/StatsOverview";
import StatsPagination from "@/features/stats/components/StatsPagination";

const pageUrl = `${siteConfig.url}/stats`;
const pageOgImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
  "Development & AI Platform Statistics",
)}&description=${encodeURIComponent(
  "Live platform development stats, AI feature logs, and release metrics.",
)}`;

const statsMetadata = {
  path: "/stats",
  title: `Development & AI Platform Statistics | ${siteConfig.shortName}`,
  description:
    "Follow dynamic platform development statistics, AI feature logs, issue counts, and release metrics.",
  ogTitle: "The Development Board, Live and Public",
  ogDescription:
    "Real issue counts, pull request activity, and completion rates synced straight from our GitHub repository.",
  twitterTitle: "Our dev activity, live and unfiltered",
  twitterDescription: "Live platform development stats, AI feature logs, and release metrics.",
  image: pageOgImage,
  imageAlt: "VeriWorkly Development & AI Platform Statistics",
  keywords: [
    "VeriWorkly development stats",
    "open source project activity",
    "GitHub issue tracker",
    "AI resume builder changelog",
  ],
} as const;

interface StatsPageProps {
  searchParams: Promise<{
    status?: string;
    kind?: string;
    page?: string;
    updatedFrom?: string;
    updatedTo?: string;
  }>;
}

export async function generateMetadata({ searchParams }: StatsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const page = parsePage(params.page);
  const isFiltered =
    parseKind(params.kind) !== "all" ||
    parseStatus(params.status) !== "all" ||
    Boolean(parseDateInput(params.updatedFrom)) ||
    Boolean(parseDateInput(params.updatedTo));

  return buildPageMetadata({
    ...statsMetadata,
    keywords: [...statsMetadata.keywords],
    ...(page > 1
      ? {
          title: `Development & AI Platform Statistics - Page ${page} | ${siteConfig.shortName}`,
          ogTitle: `The Development Board, Live and Public - page ${page}`,
        }
      : {}),
    canonicalParams: { page: page > 1 ? page : undefined },
    noIndex: isFiltered,
  });
}

const StatsPage = async ({ searchParams }: StatsPageProps) => {
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

  const projectUrl = stats?.projectUrl ?? siteConfig.links.github;
  const projectName = stats?.projectName ?? `${siteConfig.shortName} GitHub Board`;

  const issueCount = stats?.stats.issues ?? 0;
  const totalItems = stats?.stats.totalItems ?? issuePage?.total ?? 0;

  const pullRequestCount = stats?.stats.pullRequests ?? 0;
  const completionRate = stats?.stats.completionRate ?? "0.00";

  const syncedAt = stats?.syncedAt ?? issuePage?.syncedAt ?? null;
  const nextSyncAt = stats?.nextSyncAt ?? null;

  const hasMore = Boolean(issuePage?.hasMore);

  const totalPages = Math.max(1, Math.ceil((issuePage?.total ?? 0) / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Development Statistics", item: pageUrl },
    ],
  };

  const statsSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Development & AI Platform Statistics | ${siteConfig.shortName}`,
    url: pageUrl,
    description:
      "Live GitHub development statistics for VeriWorkly, including issue counts, pull requests, and completion rate.",
    isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(statsSchema)} />

      <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />

      <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-150 w-150 rounded-full blur-[130px]" />

      <Container className="relative pt-28 pb-20 lg:pt-36">
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

        <section className="border-border/40 bg-card/30 mx-auto mt-12 max-w-3xl rounded-3xl border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01)] backdrop-blur-xs">
          <h3 className="text-foreground font-sans text-sm font-bold tracking-tight">
            About this sync
          </h3>

          <p className="text-muted mt-3 max-w-3xl font-sans text-[13px] leading-relaxed font-medium">
            GitHub data is synced on the server, persisted as normalized rows, and served in
            filtered slices so the frontend can render quickly without re-fetching the entire board
            on every visit.
          </p>
        </section>
      </Container>
    </div>
  );
};

export default StatsPage;
