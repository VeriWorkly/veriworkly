import type { Metadata } from "next";

import { AffiliateNav } from "@/features/affiliate/AffiliateNav";
import type { AffiliateDashboard } from "@/features/affiliate/types";
import { getProgramServerData, PROGRAM_UNAVAILABLE } from "@/features/billing/billing-server";
import { ProgramUnavailable } from "@/features/billing/ProgramUnavailable";
export const metadata: Metadata = {
  title: "Affiliate tiers",
  robots: { index: false, follow: false },
};

export default async function AffiliateTiersPage() {
  const data = await getProgramServerData<AffiliateDashboard>("/affiliates/me");
  if (data === PROGRAM_UNAVAILABLE) return <ProgramUnavailable program="affiliate" />;
  return (
    <main className="space-y-5">
      <AffiliateNav />
      <header className="border-border bg-card rounded-2xl border p-5">
        <h1 className="text-3xl font-black">Affiliate tiers</h1>
        <p className="text-muted mt-2 text-sm">
          Tiers count referred users who complete paid purchases; refunded purchases don&apos;t
          count. You move up automatically when you reach a tier&apos;s count.
        </p>
      </header>
      <section className="grid gap-4 lg:grid-cols-3">
        {(data?.tiers ?? []).map((tier) => (
          <article
            className={`border-border bg-card rounded-2xl border p-5 ${tier.key === data?.affiliateTier ? "ring-accent ring-2" : ""}`}
            key={tier.key}
          >
            <div className="flex justify-between gap-3">
              <h2 className="text-xl font-black">{tier.name}</h2>
              <strong className="text-accent">{tier.rateBps / 100}%</strong>
            </div>
            <p className="text-muted mt-2 text-sm">
              {tier.requiredConversions
                ? `You move up automatically at ${tier.requiredConversions} paid conversions`
                : "Starting tier"}
            </p>
            <div className="mt-5 space-y-2">
              {tier.perks.map((perk) => (
                <p className="text-sm font-semibold" key={perk}>
                  {perk}
                </p>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
