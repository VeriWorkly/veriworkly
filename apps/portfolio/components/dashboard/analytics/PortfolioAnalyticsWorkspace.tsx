"use client";

import { useWorkspace } from "@/components/WorkspaceProvider";
import { usePortfolioStore } from "@/store/portfolio-store";
import { Lock } from "lucide-react";
import Link from "next/link";
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
  const { billing, user } = usePortfolioStore();
  const isPremium = billing?.canPublish;

  const daily = analytics?.daily.slice().reverse() ?? [];
  const recentViews = daily.reduce((total, item) => total + item.count, 0);
  const activeDays = daily.filter((item) => item.count > 0).length;

  return (
    <main className="surface-grid relative min-h-[calc(100dvh-4.25rem)] px-4 py-8 sm:px-6 sm:py-10 xl:px-10">
      <div className="mx-auto max-w-7xl">
        <AnalyticsHeader />

        <div className={`relative mt-5 ${!isPremium ? "select-none" : ""}`}>
          <div className={!isPremium ? "pointer-events-none opacity-40 blur-[3px]" : ""}>
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

          {!isPremium ? (
            <div className="border-line bg-card/45 absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl border p-6 text-center backdrop-blur-sm">
              <div className="bg-accent-soft text-accent flex h-12 w-12 items-center justify-center rounded-full">
                <Lock size={20} />
              </div>
              <h2 className="text-ink mt-4 text-base font-extrabold">
                {!user
                  ? "Log in to track visitor analytics"
                  : "Visitor analytics is a premium feature"}
              </h2>
              <p className="text-muted mt-1.5 max-w-sm text-xs leading-5">
                {!user
                  ? "Create an account or log in to sync your portfolio and enable visitor tracking."
                  : "Upgrade to Portfolio Pro to unlock visitor metrics, referral history, and traffic trends."}
              </p>
              <Link
                href={!user ? "/login" : "/pricing"}
                className="bg-accent text-accent-foreground hover:bg-accent-strong mt-5 inline-flex min-h-10 items-center justify-center rounded-lg px-5 text-xs font-bold transition"
              >
                {!user ? "Log In" : "Upgrade to Pro"}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
