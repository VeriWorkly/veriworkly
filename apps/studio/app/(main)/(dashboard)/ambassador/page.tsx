import type { Metadata } from "next";
import { getBillingServerData } from "@/features/billing/billing-server";
import { AmbassadorPage } from "@/features/ambassador/AmbassadorPage";
import type { AmbassadorStatus } from "@/features/ambassador/types";

export const metadata: Metadata = { title: "Ambassador", robots: { index: false, follow: false } };

export default async function AmbassadorRoute() {
  const status = await getBillingServerData<AmbassadorStatus>("/ambassador/me");
  return <AmbassadorPage status={status} />;
}
