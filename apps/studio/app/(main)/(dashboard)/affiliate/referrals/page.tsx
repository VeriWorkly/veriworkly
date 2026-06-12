import { AffiliateNav } from "@/features/affiliate/AffiliateNav";
import type { AffiliateDashboard } from "@/features/affiliate/types";
import { getBillingServerData } from "@/features/billing/billing-server";

export default async function AffiliateReferralsPage() {
  const data = await getBillingServerData<AffiliateDashboard>("/affiliates/me");
  return <main className="space-y-5"><AffiliateNav /><header className="border-border bg-card rounded-2xl border p-5"><h1 className="text-3xl font-black">Referrals</h1><p className="text-muted mt-2 text-sm">A referral becomes a paid conversion only after a successful purchase.</p></header><section className="border-border bg-card rounded-2xl border p-5"><div className="divide-y">{data?.referrals.length ? data.referrals.map((item) => <div className="flex justify-between gap-4 py-4 text-sm" key={item.id}><div><p className="font-bold">Referral {item.id.slice(-6)}</p><p className="text-muted mt-1 text-xs">Joined {new Date(item.createdAt).toLocaleDateString()}</p></div><strong>{item.status.replaceAll("_", " ")}</strong></div>) : <p className="text-muted py-5 text-sm">No referred signups yet.</p>}</div></section></main>;
}
