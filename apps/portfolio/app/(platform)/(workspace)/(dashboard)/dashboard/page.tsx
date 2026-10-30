import type { Metadata } from "next";
import { PortfolioDashboardWorkspace } from "@/components/dashboard/overview/PortfolioDashboardWorkspace";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default function DashboardPage() {
  return <PortfolioDashboardWorkspace />;
}
