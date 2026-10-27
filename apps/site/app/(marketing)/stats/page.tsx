import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { webSiteRef } from "@/utils/schema";
import { buildPageMetadata } from "@/utils/metadata";

import {
  PAGE_SIZE,
  parseKind,
  parsePage,
  parseStatus,
  formatAbsoluteTime,
  formatRelativeTime,
} from "@/features/stats/components/stats-utils";

import {
  FRAME,
  PageHero,
  PageSection,
  SectionHeading,
  TYPE,
} from "@/components/marketing/PageLayout";

import {
  fetchGitHubStatsFromBackend,
  fetchGitHubIssuesFromBackend,
} from "@/features/github/services/github-backend";

import StatsBoard from "@/features/stats/components/StatsBoard";
import StatsFilters from "@/features/stats/components/StatsFilters";
import StatsOverview from "@/features/stats/components/StatsOverview";
import StatsPagination from "@/features/stats/components/StatsPagination";
import { ogPageImage } from "@/features/og/cards";

const pageUrl = `${siteConfig.url}/stats`;
const pageOgImage = ogPageImage("stats");

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
  }>;
}

export async function generateMetadata({ searchParams }: StatsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const page = parsePage(params.page);
  const isFiltered = parseKind(params.kind) !== "all" || parseStatus(params.status) !== "all";

  return buildPageMetadata({
    ...statsMetadata,
    keywords: [...statsMetadata.keywords],
    ...(page > 1
      ? {
          title: `Development Statistics, page ${page} | ${siteConfig.shortName}`,
          ogTitle: `The Development Board, Live and Public - page ${page}`,
        }
      : {}),
    canonicalParams: { page: page > 1 ? page : undefined },
    // Later pages are thin slices of the same board: crawlable, but not indexed separately.
    noIndex: isFiltered || page > 1,
  });
}

const StatsPage = async ({ searchParams }: StatsPageProps) => {
  const params = await searchParams;

  const kind = parseKind(params.kind);
  const page = parsePage(params.page);
  const status = parseStatus(params.status);

  const offset = (page - 1) * PAGE_SIZE;

  const [stats, issuePage] = await Promise.all([
    fetchGitHubStatsFromBackend().catch(() => null),
    fetchGitHubIssuesFromBackend({
      status,
      kind,
      limit: PAGE_SIZE,
      offset,
    }).catch(() => null),
  ]);

  const projectUrl = stats?.projectUrl ?? siteConfig.links.github;

  const isFiltered = kind !== "all" || status !== "all";

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
    isPartOf: webSiteRef,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(statsSchema)} />

      <PageHero
        title="Development,"
        highlight="in the open."
        lede="Every public issue and pull request on the VeriWorkly GitHub board, synced on our server and filtered here without hiding anything."
        aside={
          <div className="space-y-5">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base">
              <span
                aria-hidden="true"
                className={`size-2.5 rounded-full ${syncedAt ? "bg-success" : "bg-foreground/25"}`}
              />
              <span className="font-semibold">
                {syncedAt ? `Synced ${formatRelativeTime(syncedAt)}` : "Not synced yet"}
              </span>
              {nextSyncAt && (
                <span className="text-muted">Next sync {formatAbsoluteTime(nextSyncAt)}</span>
              )}
            </p>
            <Link
              target="_blank"
              href={projectUrl}
              rel="noopener noreferrer"
              className="group border-border hover:bg-card focus-visible:ring-accent/40 inline-flex h-12 items-center gap-2 rounded-full border px-6 text-base font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97]"
            >
              View the board on GitHub
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>
        }
      >
        <StatsOverview stats={stats} />
      </PageHero>

      {issuePage ? (
        <section aria-label="Project board" className="py-14 lg:py-20">
          <div className={FRAME}>
            <SectionHeading title="The board." className="mb-10" />

            <StatsFilters kind={kind} status={status} />

            <StatsBoard
              offset={offset}
              issuePage={issuePage}
              totalItems={issuePage.total}
              isFiltered={isFiltered}
            />

            <StatsPagination
              kind={kind}
              status={status}
              hasMore={hasMore}
              currentPage={currentPage}
            />
          </div>
        </section>
      ) : stats ? (
        <section aria-label="Project board" className="py-14 lg:py-20">
          <div className={FRAME}>
            <div className="bg-card rounded-3xl px-6 py-16 text-center sm:px-10">
              <p className={TYPE.title}>The item list did not load.</p>
              <p className="text-muted mx-auto mt-3 max-w-md text-base">
                The totals above are current. Reload in a moment, or browse the items on GitHub.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <PageSection
        tone="card"
        className="border-t"
        title="How this board stays current."
        lede="Our server syncs the GitHub board on a schedule and serves every filtered page from that copy, cached until the next sync."
      />
    </>
  );
};

export default StatsPage;
