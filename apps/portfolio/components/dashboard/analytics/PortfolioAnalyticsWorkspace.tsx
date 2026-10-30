"use client";

import { useMemo } from "react";
import { useAnalytics, useWorkspace } from "@/components/WorkspaceProvider";
import { siteConfig } from "@/config/site";
import {
  hasPortfolioAccess,
  isPortfolioPubliclyVisible,
  lastCalendarDays,
  upgradeHref,
} from "@/lib/portfolio-status";
import { CloudOff, Lock } from "lucide-react";
import Link from "next/link";
import { AnalyticsHeader } from "./AnalyticsHeader";
import { AnalyticsMetrics } from "./AnalyticsMetrics";
import { AnalyticsTrend } from "./AnalyticsTrend";
import { AnalyticsReferrers } from "./AnalyticsReferrers";

export function PortfolioAnalyticsWorkspace() {
  // Both contexts are already correct during server rendering, so this page ships its
  // real numbers in the initial HTML instead of rendering a locked shell and then
  // swapping after hydration.
  const { user, workspace } = useWorkspace();
  const { analytics, unavailable, asOf } = useAnalytics();
  const hasAccess = hasPortfolioAccess(workspace?.billing);

  // The server decides this — a locked payload carries no figures to render. Falling back
  // to the local entitlement only covers the case where analytics never loaded at all
  // (guest mode, or a failed request), where there is likewise nothing to show.
  const locked = analytics?.locked ?? !hasAccess;
  // A failed request for someone who has analytics is an outage, not an upsell.
  const failed = unavailable && !locked;
  const isLive = isPortfolioPubliclyVisible(workspace?.publication?.status);

  const { daily, recentViews, activeDays } = useMemo(() => {
    const series = lastCalendarDays(analytics?.daily ?? [], asOf);

    return {
      daily: series,
      recentViews: series.reduce((total, item) => total + item.count, 0),
      activeDays: series.filter((item) => item.count > 0).length,
    };
  }, [analytics, asOf]);

  return (
    <main className="surface-grid relative min-h-[calc(100dvh-4.25rem)] px-4 py-8 sm:px-6 sm:py-10 xl:px-10">
      <div className="mx-auto max-w-7xl">
        <AnalyticsHeader />

        {failed ? (
          <div
            className="border-line bg-panel mt-8 flex items-center gap-3 rounded-2xl border p-6"
            role="status"
          >
            <CloudOff className="text-muted shrink-0" size={20} aria-hidden="true" />
            <p className="text-sm font-bold">
              Analytics are unavailable right now. Try again later.
            </p>
          </div>
        ) : (
          <div className={`relative mt-5 ${locked ? "select-none" : ""}`}>
            {/* `inert` + `aria-hidden` matter here: the blur is purely visual, so without them
              a screen reader still announced the whole placeholder grid underneath the
              upgrade prompt, and its controls stayed in the tab order. */}
            <div
              inert={locked || undefined}
              aria-hidden={locked || undefined}
              className={locked ? "pointer-events-none opacity-40 blur-[3px]" : ""}
            >
              <AnalyticsMetrics
                totalViews={analytics?.totalViews ?? 0}
                recentViews={recentViews}
                activeDays={activeDays}
                referrersCount={analytics?.referrers.length ?? 0}
              />

              <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,.5fr)]">
                <AnalyticsTrend daily={daily} isLive={isLive} />
                <AnalyticsReferrers referrers={analytics?.referrers} />
              </section>
            </div>

            {locked ? (
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
                    : "Creator Pro, the Job Hunter Bundle or a pass unlocks visitor metrics, referrers and traffic trends."}
                </p>
                {!user ? (
                  <button
                    type="button"
                    onClick={() => {
                      const loginUrl = `${siteConfig.links.app}/login`;
                      // Studio's login, another app's origin: a full page load is the only way there.
                      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                      window.location.href = `${loginUrl}?callbackURL=${encodeURIComponent(window.location.href)}`;
                    }}
                    className="bg-accent text-accent-foreground hover:bg-accent-strong mt-5 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg px-5 text-xs font-bold transition"
                  >
                    Log In
                  </button>
                ) : (
                  <Link
                    href={upgradeHref("analytics")}
                    className="bg-accent text-accent-foreground hover:bg-accent-strong mt-5 inline-flex min-h-10 items-center justify-center rounded-lg px-5 text-xs font-bold transition"
                  >
                    See plans
                  </Link>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
