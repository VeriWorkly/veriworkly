import type { PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";

import { fetchServerApiData } from "@/lib/server-api";

import { AnalyticsProvider } from "@/components/WorkspaceProvider";
import { PortfolioAppShell } from "@/components/dashboard/sidebar/PortfolioAppShell";

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  // Analytics is fetched here rather than in the parent workspace layout so it stays on
  // the routes that actually render it. `/editor` shares that parent and never reads it,
  // and awaiting the query there (an aggregate, two groupBys and a Redis read) would sit
  // on the editor's first byte for nothing. An outage leaves the panel empty rather than
  // failing the whole dashboard.
  const analytics = await fetchServerApiData<PortfolioWorkspaceBootstrap["analytics"]>(
    "/portfolios/analytics",
  ).catch(() => null);

  return (
    <AnalyticsProvider analytics={analytics}>
      <PortfolioAppShell>{children}</PortfolioAppShell>
    </AnalyticsProvider>
  );
};

export default DashboardLayout;
