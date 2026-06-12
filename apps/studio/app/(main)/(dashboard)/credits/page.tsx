import type { Metadata } from "next";

import { getBillingServerData } from "@/features/billing/billing-server";
import { CreditUsagePage } from "@/features/credits/CreditUsagePage";
import type { CreditTransaction, CreditWallet } from "@/features/credits/types";
import type { BillingSummary } from "@/features/billing/types";

export const metadata: Metadata = { title: "Credit usage", robots: { index: false, follow: false } };

export default async function CreditsPage() {
  const [wallet, history, billing] = await Promise.all([
    getBillingServerData<CreditWallet>("/billing/credits"),
    getBillingServerData<CreditTransaction[]>("/billing/credits/history"),
    getBillingServerData<BillingSummary>("/billing/me"),
  ]);
  return <CreditUsagePage wallet={wallet} history={history ?? []} economics={billing?.creditEconomics ?? null} />;
}
