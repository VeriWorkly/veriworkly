import type { Metadata } from "next";
import { BillingPage } from "@/features/billing/BillingPage";
import { getBillingServerData } from "@/features/billing/billing-server";
import type { BillingActivity, BillingSummary } from "@/features/billing/types";

export const metadata: Metadata = { title: "Billing", robots: { index: false, follow: false } };
export default async function StudioBillingPage() {
  const [billing, history] = await Promise.all([
    getBillingServerData<BillingSummary>("/billing/me"),
    getBillingServerData<BillingActivity[]>("/billing/history"),
  ]);
  return <BillingPage billing={billing} history={history ?? []} />;
}
