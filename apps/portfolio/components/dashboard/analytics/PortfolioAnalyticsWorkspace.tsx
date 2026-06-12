"use client";

import { useWorkspace } from "@/components/WorkspaceProvider";
import { AnalyticsHeader } from "./AnalyticsHeader";
import { AnalyticsMetrics } from "./AnalyticsMetrics";
import { AnalyticsTrend } from "./AnalyticsTrend";
import { AnalyticsReferrers } from "./AnalyticsReferrers";

export type PortfolioAnalytics = {
  totalViews: number;
  daily: Array<{ date: string; count: number }>;
  referrers: Array<{ host: string; count: number }>;
};

export function PortfolioAnalyticsWorkspace() {
  const { analytics } = useWorkspace() as { analytics: PortfolioAnalytics | null };
  const daily = analytics?.daily.slice().reverse() ?? [];
  const recentViews = daily.reduce((total, item) => total + item.count, 0);
  const activeDays = daily.filter((item) => item.count > 0).length;

  return (
    <main className="surface-grid min-h-[calc(100dvh-4.25rem)] px-4 py-8 sm:px-6 sm:py-10 xl:px-10">
      <div className="mx-auto max-w-7xl">
        <AnalyticsHeader />

        <AnalyticsMetrics
          totalViews={analytics?.totalViews ?? 0}
          recentViews={recentViews}
          activeDays={activeDays}
          referrersCount={analytics?.referrers.length ?? 0}
        />

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,.5fr)]">
          <AnalyticsTrend daily={daily} />
          <AnalyticsReferrers referrers={analytics?.referrers} />
        </section>
      </div>
    </main>
  );
}
