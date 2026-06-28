import type { PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";

import { fetchServerApiData } from "@/lib/server-api";

import { RestrictedAccess } from "@/components/RestrictedAccess";
import { WorkspaceProvider } from "@/components/WorkspaceProvider";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const [user, workspace, analytics] = await Promise.all([
    fetchServerApiData<PortfolioWorkspaceBootstrap["user"]>("/users/me"),
    fetchServerApiData<PortfolioWorkspaceBootstrap["workspace"]>("/portfolios/me"),
    fetchServerApiData<PortfolioWorkspaceBootstrap["analytics"]>("/portfolios/analytics"),
  ]);

  const isProd = process.env.NODE_ENV === "production";
  const adminEmail = (process.env.ADMIN_EMAIL || "ashragautam25@gmail.com").toLowerCase();
  const isUserAdmin = user && user.email && user.email.toLowerCase() === adminEmail;

  if (isProd && user && !isUserAdmin) return <RestrictedAccess />;

  return (
    <WorkspaceProvider initialData={{ user, workspace, analytics }}>{children}</WorkspaceProvider>
  );
}
