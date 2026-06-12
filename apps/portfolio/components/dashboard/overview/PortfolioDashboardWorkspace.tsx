"use client";

import { useWorkspace } from "@/components/WorkspaceProvider";
import { parsePortfolioContent, type CloudPortfolioDraft } from "@/lib/portfolio";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardMetrics } from "./DashboardMetrics";
import { DashboardStatus } from "./DashboardStatus";
import { DashboardRecommendations } from "./DashboardRecommendations";
import { DashboardProductLinks } from "./DashboardProductLinks";

export function PortfolioDashboardWorkspace() {
  const data = useWorkspace();
  const draft = data.workspace?.draft as CloudPortfolioDraft | undefined;
  const content = draft ? parsePortfolioContent(draft.content) : null;

  const visibleSections = content?.sections.filter((section) => section.visible).length ?? 0;

  const projectCount =
    content?.sections.find((section) => section.type === "projects")?.items.length ?? 0;

  const completedIdentity = content
    ? [
        content.identity.name,
        content.identity.headline,
        content.identity.bio,
        content.identity.email,
      ].filter((value) => value.trim()).length
    : 0;

  const isLive = data.workspace?.publication?.status === "LIVE";
  const readiness = Math.round(((completedIdentity + Math.min(visibleSections, 4)) / 8) * 100);

  return (
    <main className="surface-grid min-h-[calc(100dvh-4.25rem)] px-4 py-8 sm:px-6 sm:py-10 xl:px-10">
      <div className="mx-auto max-w-7xl">
        <DashboardHeader userName={data.user?.name} draft={draft} />

        <DashboardMetrics
          totalViews={data.analytics?.totalViews ?? 0}
          visibleSections={visibleSections}
          projectCount={projectCount}
          readiness={readiness}
          isLive={isLive}
          draft={draft}
        />

        <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.55fr)]">
          <DashboardStatus
            portfolioName={content?.identity.name || "Build your portfolio"}
            isLive={isLive}
            headline={
              content?.identity.headline ||
              "Add your professional headline and strongest work to create a clear public profile."
            }
            readiness={readiness}
            completedIdentity={completedIdentity}
            visibleSections={visibleSections}
            hasSeo={Boolean(content?.seo.title && content?.seo.description)}
          />

          <DashboardRecommendations projectCount={projectCount} />
        </section>

        <DashboardProductLinks />
      </div>
    </main>
  );
}
