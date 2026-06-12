import type { PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";
import { fetchServerApiData } from "@/lib/server-api";
import { WorkspaceProvider } from "@/components/WorkspaceProvider";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const [user, workspace, analytics] = await Promise.all([
    fetchServerApiData<PortfolioWorkspaceBootstrap["user"]>("/users/me"),
    fetchServerApiData<PortfolioWorkspaceBootstrap["workspace"]>("/portfolios/me"),
    fetchServerApiData<PortfolioWorkspaceBootstrap["analytics"]>("/portfolios/analytics"),
  ]);

  return (
    <WorkspaceProvider initialData={{ user, workspace, analytics }}>{children}</WorkspaceProvider>
  );
}
