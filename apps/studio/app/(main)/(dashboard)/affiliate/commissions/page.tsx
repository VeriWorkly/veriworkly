import { AffiliateNav } from "@/features/affiliate/AffiliateNav";
import type { AffiliateDashboard } from "@/features/affiliate/types";
import { getBillingServerData } from "@/features/billing/billing-server";
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export default async function AffiliateCommissionsPage() {
  const data = await getBillingServerData<AffiliateDashboard>("/affiliates/me");
  return <main className="space-y-5"><AffiliateNav /><header className="border-border bg-card rounded-2xl border p-5"><h1 className="text-3xl font-black">Commissions</h1><p className="text-muted mt-2 text-sm">Commissions are created from successful paid purchases, then reviewed before becoming available.</p></header><section className="border-border bg-card rounded-2xl border p-5"><div className="divide-y">{data?.commissions.length ? data.commissions.map((item) => <div className="grid gap-2 py-4 text-sm sm:grid-cols-[1fr_auto_auto]" key={item.id}><div><p className="font-bold">{item.status}</p><p className="text-muted text-xs">{new Date(item.createdAt).toLocaleDateString()}</p></div><span>{item.rateBps / 100}% rate</span><strong>{money(item.amountCents)}</strong></div>) : <p className="text-muted py-5 text-sm">No commissions yet.</p>}</div></section></main>;
}
