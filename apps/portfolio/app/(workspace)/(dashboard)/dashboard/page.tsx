import type { Metadata } from "next";

import {
  PortfolioDashboardWorkspace,
  type PortfolioDashboardData,
} from "@/components/PortfolioDashboardWorkspace";

import { fetchServerApiData } from "@/lib/server-api";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function DashboardPage() {
  const [user, workspace, analytics] = await Promise.all([
    fetchServerApiData<PortfolioDashboardData["user"]>("/users/me"),
    fetchServerApiData<PortfolioDashboardData["workspace"]>("/portfolios/me"),
    fetchServerApiData<PortfolioDashboardData["analytics"]>("/portfolios/analytics"),
  ]);

  return <PortfolioDashboardWorkspace data={{ user, workspace, analytics }} />;
}
