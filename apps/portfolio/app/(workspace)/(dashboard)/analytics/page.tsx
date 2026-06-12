import type { Metadata } from "next";
import { PortfolioAnalyticsWorkspace } from "@/components/dashboard/analytics/PortfolioAnalyticsWorkspace";

export const metadata: Metadata = { title: "Analytics", robots: { index: false, follow: false } };

export default function AnalyticsPage() {
  return <PortfolioAnalyticsWorkspace />;
}
