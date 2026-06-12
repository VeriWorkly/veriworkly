import type { Metadata } from "next";
import { getBillingServerData } from "@/features/billing/billing-server";
import { AffiliatePage } from "@/features/affiliate/AffiliatePage";
import type { AffiliateDashboard } from "@/features/affiliate/types";

export const metadata: Metadata = { title: "Affiliate", robots: { index: false, follow: false } };
export default async function AffiliateRoute() {
  const dashboard = await getBillingServerData<AffiliateDashboard>("/affiliates/me");
  return <AffiliatePage dashboard={dashboard} />;
}
