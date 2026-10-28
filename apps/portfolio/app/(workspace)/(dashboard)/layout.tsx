import type { CloudPortfolioDraft } from "@/lib/portfolio";
import type { PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";

import { portfolioWorkspaceUrl } from "@/config/site";
import { fetchServerApiData } from "@/lib/server-api";
import { isPortfolioPubliclyVisible } from "@/lib/portfolio-status";
import { loadWorkspaceBootstrap } from "@/lib/workspace-bootstrap";

import { AnalyticsProvider } from "@/components/WorkspaceProvider";
import { PortfolioAppShell } from "@/components/dashboard/sidebar/PortfolioAppShell";

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  // Analytics is fetched here rather than in the parent workspace layout so it stays on
  // the routes that actually render it. `/editor` shares that parent and never reads it,
  // and awaiting the query there (an aggregate, two groupBys and a Redis read) would sit
  // on the editor's first byte for nothing.
  //
  // The workspace bootstrap is re-requested rather than threaded down, which costs no
  // extra round trips: `fetchServerApiData` is `cache()`-wrapped per request.
  const [bootstrap, analytics] = await Promise.all([
    loadWorkspaceBootstrap(),
    fetchServerApiData<PortfolioWorkspaceBootstrap["analytics"]>("/portfolios/analytics"),
  ]);

  const draft = bootstrap.workspace?.draft as CloudPortfolioDraft | undefined;

  // Resolved here rather than in the shell so the "View site" button is only rendered
  // when the public site actually resolves, and points at the site's subdomain.
  const publicUrl =
    draft?.slug && isPortfolioPubliclyVisible(bootstrap.workspace?.publication?.status)
      ? portfolioWorkspaceUrl(draft.slug).href
      : undefined;

  return (
    <AnalyticsProvider analytics={analytics}>
      <PortfolioAppShell user={bootstrap.user} publicUrl={publicUrl}>
        {children}
      </PortfolioAppShell>
    </AnalyticsProvider>
  );
};

export default DashboardLayout;
