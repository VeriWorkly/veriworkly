import type { CloudPortfolioDraft } from "@/lib/portfolio";
import type { PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";

import { fetchServerApiData } from "@/lib/server-api";

import { PortfolioAppShell } from "@/components/dashboard/sidebar/PortfolioAppShell";

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  const [user, workspace] = await Promise.all([
    fetchServerApiData<PortfolioWorkspaceBootstrap["user"]>("/users/me"),
    fetchServerApiData<PortfolioWorkspaceBootstrap["workspace"]>("/portfolios/me"),
  ]);

  const draft = workspace?.draft as CloudPortfolioDraft | undefined;

  return (
    <PortfolioAppShell user={user} draftSlug={draft?.slug}>
      {children}
    </PortfolioAppShell>
  );
};

export default DashboardLayout;
