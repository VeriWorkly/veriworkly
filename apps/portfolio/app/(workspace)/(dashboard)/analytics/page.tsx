import type { Metadata } from "next";
import { PortfolioAnalyticsWorkspace } from "@/components/PortfolioAnalyticsWorkspace";
import type { PortfolioAnalytics } from "@/components/PortfolioAnalyticsWorkspace";
import { fetchServerApiData } from "@/lib/server-api";

export const metadata: Metadata = { title: "Analytics", robots: { index: false, follow: false } };
export default async function AnalyticsPage() {
  return (
    <PortfolioAnalyticsWorkspace
      analytics={await fetchServerApiData<PortfolioAnalytics>("/portfolios/analytics")}
    />
  );
}
