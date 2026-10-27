import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site";
import { getProgramServerData, PROGRAM_UNAVAILABLE } from "@/features/billing/billing-server";
import { ProgramUnavailable } from "@/features/billing/ProgramUnavailable";
import { AmbassadorPage } from "@/features/ambassador/AmbassadorPage";
import { isApprovedAmbassador, type AmbassadorStatus } from "@/features/ambassador/types";

export const metadata: Metadata = { title: "Ambassador", robots: { index: false, follow: false } };

export default async function AmbassadorRoute() {
  // Throws on a failed read, so an approved ambassador is never sent off-site by an outage.
  const status = await getProgramServerData<AmbassadorStatus>("/ambassador/me");
  if (status === PROGRAM_UNAVAILABLE) return <ProgramUnavailable program="ambassador" />;

  const isAmbassador = isApprovedAmbassador(status);
  const isPending = status?.ambassadorStatus === "PENDING";
  // Rejected applicants get the dashboard too — it carries the reviewer's note and the
  // re-apply link, which is more useful than being bounced back to the marketing page.
  const isRejected = status?.application?.status === "REJECTED";

  if (!isAmbassador && !isPending && !isRejected) redirect(`${siteConfig.links.main}/ambassador`);

  return <AmbassadorPage status={status} />;
}
