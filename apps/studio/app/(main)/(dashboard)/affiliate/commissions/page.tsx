import type { Metadata } from "next";

import { LocalDate } from "@/components/LocalDate";
import { AffiliateNav } from "@/features/affiliate/AffiliateNav";
import { commissionStatusLabel } from "@/features/affiliate/labels";
import type { AffiliateDashboard } from "@/features/affiliate/types";
import { getProgramServerData, PROGRAM_UNAVAILABLE } from "@/features/billing/billing-server";
import { ProgramUnavailable } from "@/features/billing/ProgramUnavailable";
import { formatCents } from "@/features/admin/utils/admin-format";
export const metadata: Metadata = {
  title: "Affiliate commissions",
  robots: { index: false, follow: false },
};

export default async function AffiliateCommissionsPage() {
  const data = await getProgramServerData<AffiliateDashboard>("/affiliates/me");
  if (data === PROGRAM_UNAVAILABLE) return <ProgramUnavailable program="affiliate" />;
  return (
    <main className="space-y-5">
      <AffiliateNav />
      <header className="border-border bg-card rounded-2xl border p-5">
        <h1 className="text-3xl font-black">Commissions</h1>
        <p className="text-muted mt-2 text-sm">
          Commissions are created from successful paid purchases, then reviewed before becoming
          available. A commission is shown in the currency the customer paid in; your balance is
          paid out in USD, so one in another currency stays pending until we convert it.
        </p>
      </header>
      <section className="border-border bg-card rounded-2xl border p-5">
        <div className="divide-y">
          {data?.commissions.length ? (
            data.commissions.map((item) => (
              <div className="grid gap-2 py-4 text-sm sm:grid-cols-[1fr_auto_auto]" key={item.id}>
                <div>
                  <p className="font-bold">{commissionStatusLabel(item.status)}</p>
                  <p className="text-muted text-xs">
                    <LocalDate value={item.createdAt} />
                  </p>
                </div>
                <span>{item.rateBps / 100}% rate</span>
                <strong>{formatCents(item.amountCents, item.currency)}</strong>
              </div>
            ))
          ) : (
            <p className="text-muted py-5 text-sm">No commissions yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
