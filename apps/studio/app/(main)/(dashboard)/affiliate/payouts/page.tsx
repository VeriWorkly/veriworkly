import type { Metadata } from "next";

import { LocalDate } from "@/components/LocalDate";
import { AffiliateNav } from "@/features/affiliate/AffiliateNav";
import { withdrawalStatusLabel } from "@/features/affiliate/labels";
import { AffiliatePayoutForm } from "@/features/affiliate/AffiliatePayoutForm";
import { type AffiliateDashboard, withdrawableCents } from "@/features/affiliate/types";
import { getProgramServerData, PROGRAM_UNAVAILABLE } from "@/features/billing/billing-server";
import { ProgramUnavailable } from "@/features/billing/ProgramUnavailable";
import { formatCents } from "@/features/admin/utils/admin-format";
export const metadata: Metadata = {
  title: "Affiliate payouts",
  robots: { index: false, follow: false },
};

export default async function AffiliatePayoutsPage() {
  const data = await getProgramServerData<AffiliateDashboard>("/affiliates/me");
  if (data === PROGRAM_UNAVAILABLE) return <ProgramUnavailable program="affiliate" />;
  // Payouts are for an active affiliate only, as on the overview: a pending or suspended account
  // keeps its history but cannot request a withdrawal.
  const canRequest = data?.affiliateStatus === "ACTIVE";
  const withdrawable = data ? withdrawableCents(data) : 0;
  // Money owed back from a commission refunded after it was released (V-321) is repaid first.
  const owed = data ? Math.max(0, data.wallet.availableCents - withdrawable) : 0;
  return (
    <main className="space-y-5">
      <AffiliateNav />
      <header className="border-border bg-card rounded-2xl border p-5">
        <h1 className="text-3xl font-black">Payouts</h1>
        <p className="text-muted mt-2 text-sm">
          Only released commission balance can be withdrawn.
        </p>
      </header>
      <section className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <article className="border-border bg-card rounded-2xl border p-5">
          <p className="text-muted text-xs font-bold">Available</p>
          <p className="mt-2 text-3xl font-black">
            {formatCents(data?.wallet.availableCents ?? 0)}
          </p>
          {owed > 0 ? (
            <p className="text-muted mt-2 text-xs">
              {formatCents(owed)} is owed back from a refunded commission and is repaid from this
              balance first. You can withdraw {formatCents(withdrawable)}.
            </p>
          ) : null}
          {canRequest ? (
            <>
              <p className="text-muted mt-2 text-xs">
                Minimum payout {formatCents(data.minimumWithdrawalCents)}
              </p>
              <div className="mt-5">
                <AffiliatePayoutForm
                  withdrawableCents={withdrawable}
                  minimumCents={data.minimumWithdrawalCents}
                />
              </div>
            </>
          ) : (
            <p className="text-muted mt-5 text-sm">
              {data?.affiliateStatus === "SUSPENDED"
                ? "Payouts are disabled while your affiliate account is suspended."
                : data?.affiliateStatus === "PENDING"
                  ? "You can request payouts once your affiliate account is approved."
                  : "Join the affiliate program to earn commission you can withdraw."}
            </p>
          )}
        </article>
        <article className="border-border bg-card rounded-2xl border p-5">
          <h2 className="font-black">Payout history</h2>
          <div className="mt-4 divide-y">
            {data?.withdrawals.length ? (
              data.withdrawals.map((item) => (
                <div className="flex justify-between gap-4 py-4 text-sm" key={item.id}>
                  <div>
                    <p className="font-bold">{withdrawalStatusLabel(item.status)}</p>
                    <p className="text-muted text-xs">
                      <LocalDate value={item.createdAt} />
                    </p>
                    {item.payoutNote ? (
                      <p className="text-muted mt-1 text-xs">Note: {item.payoutNote}</p>
                    ) : null}
                  </div>
                  <strong>{formatCents(item.amountCents, item.currency)}</strong>
                </div>
              ))
            ) : (
              <p className="text-muted py-5 text-sm">No payout requests yet.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
