import type { Metadata } from "next";

import { LocalDate } from "@/components/LocalDate";
import { AffiliateNav } from "@/features/affiliate/AffiliateNav";
import { referralStatusLabel } from "@/features/affiliate/labels";
import type { AffiliateDashboard } from "@/features/affiliate/types";
import { getProgramServerData, PROGRAM_UNAVAILABLE } from "@/features/billing/billing-server";
import { ProgramUnavailable } from "@/features/billing/ProgramUnavailable";

export const metadata: Metadata = {
  title: "Affiliate referrals",
  robots: { index: false, follow: false },
};

export default async function AffiliateReferralsPage() {
  const data = await getProgramServerData<AffiliateDashboard>("/affiliates/me");
  if (data === PROGRAM_UNAVAILABLE) return <ProgramUnavailable program="affiliate" />;
  return (
    <main className="space-y-5">
      <AffiliateNav />
      <header className="border-border bg-card rounded-2xl border p-5">
        <h1 className="text-3xl font-black">Referrals</h1>
        <p className="text-muted mt-2 text-sm">
          A referral becomes a paid conversion only after a successful purchase.
        </p>
      </header>
      <section className="border-border bg-card rounded-2xl border p-5">
        <div className="divide-y">
          {data?.referrals.length ? (
            data.referrals.map((item, index) => (
              <div className="flex justify-between gap-4 py-4 text-sm" key={item.id}>
                <div>
                  {/* Referred people stay anonymous, so they are numbered, not named. */}
                  <p className="font-bold">Referred account {index + 1}</p>
                  <p className="text-muted mt-1 text-xs">
                    Joined <LocalDate value={item.createdAt} />
                  </p>
                </div>
                <strong>{referralStatusLabel(item.status)}</strong>
              </div>
            ))
          ) : (
            <p className="text-muted py-5 text-sm">No referred signups yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
