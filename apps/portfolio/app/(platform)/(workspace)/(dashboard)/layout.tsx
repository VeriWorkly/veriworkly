import type { PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";

import { fetchServerApiData } from "@/lib/server-api";

import { AnalyticsProvider } from "@/components/WorkspaceProvider";
import { PortfolioAppShell } from "@/components/dashboard/sidebar/PortfolioAppShell";

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  // Analytics is fetched here rather than in the parent workspace layout so it stays on
  // the routes that actually render it. `/editor` shares that parent and never reads it,
  // and awaiting the query there (an aggregate, two groupBys and a Redis read) would sit
  // on the editor's first byte for nothing. An outage does not fail the dashboard; it is
  // passed on as "unavailable" so a paying user is not told analytics is locked.
  const { analytics, unavailable } = await fetchServerApiData<
    PortfolioWorkspaceBootstrap["analytics"]
  >("/portfolios/analytics").then(
    (data) => ({ analytics: data, unavailable: false }),
    () => ({ analytics: null, unavailable: true }),
  );
  const asOf = new Date().toISOString().slice(0, 10);

  return (
    <AnalyticsProvider analytics={analytics} unavailable={unavailable} asOf={asOf}>
      <PortfolioAppShell>{children}</PortfolioAppShell>
    </AnalyticsProvider>
  );
};

export default DashboardLayout;
