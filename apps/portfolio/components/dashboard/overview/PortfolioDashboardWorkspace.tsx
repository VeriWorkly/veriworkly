"use client";

import { useMemo } from "react";

import { useAnalytics, useWorkspace } from "@/components/WorkspaceProvider";
import { parsePortfolioContent, type CloudPortfolioDraft } from "@/lib/portfolio";
import {
  getPortfolioReadiness,
  hasPortfolioAccess,
  isPortfolioPubliclyVisible,
} from "@/lib/portfolio-status";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardMetrics } from "./DashboardMetrics";
import { DashboardStatus } from "./DashboardStatus";
import { DashboardRecommendations } from "./DashboardRecommendations";
import { DashboardProductLinks } from "./DashboardProductLinks";

export function PortfolioDashboardWorkspace() {
  const data = useWorkspace();
  const analytics = useAnalytics();
  const draft = data.workspace?.draft as CloudPortfolioDraft | undefined;

  const publicationStatus = data.workspace?.publication?.status;
  const isLive = isPortfolioPubliclyVisible(publicationStatus);
  const canPublish = hasPortfolioAccess(data.workspace?.billing);

  // `parsePortfolioContent` is a full sanitize pass over every section and item, and the
  // draft it runs on has usually been parsed once already by the store's hydration. Left
  // in the render body it re-ran on every render and handed children a new object each
  // time, defeating any downstream memoization.
  const readiness = useMemo(() => {
    const content = draft ? parsePortfolioContent(draft.content) : null;

    return { ...getPortfolioReadiness(content, publicationStatus), content };
  }, [draft, publicationStatus]);

  const content = readiness.content;

  return (
    <main className="surface-grid min-h-[calc(100dvh-4.25rem)] px-4 py-8 sm:px-6 sm:py-10 xl:px-10">
      <div className="mx-auto max-w-7xl">
        <DashboardHeader userName={data.user?.name} slug={draft?.slug} isLive={isLive} />

        <DashboardMetrics
          totalViews={analytics?.totalViews ?? 0}
          analyticsLocked={analytics?.locked ?? !canPublish}
          visibleSections={readiness.visibleSections}
          projectCount={readiness.projectCount}
          readiness={readiness.percent}
          isLive={isLive}
          slug={draft?.slug}
        />

        <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.55fr)]">
          <DashboardStatus
            portfolioName={content?.identity.name || "Build your portfolio"}
            headline={
              content?.identity.headline ||
              "Add your professional headline and strongest work to create a clear public profile."
            }
            readiness={readiness.percent}
            checks={readiness.checks}
          />

          <DashboardRecommendations projectCount={readiness.projectCount} />
        </section>

        <DashboardProductLinks />
      </div>
    </main>
  );
}
