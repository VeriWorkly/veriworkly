import type { Metadata } from "next";
import { Card } from "@veriworkly/ui";

import { fetchAdminMonetizationServer } from "@/features/admin/services/admin-server";
import { AffiliateModeration, CommissionActions, CommissionForm, ManualGrantForm, MonetizationActions } from "@/app/admin/monetization/MonetizationActions";

type Overview = {
  affiliate: {
    withdrawals: Array<{ id: string; amountCents: number; status: string; createdAt: string; user: { name: string | null; email: string; affiliateCode: string | null } }>;
    affiliates: Array<{ id: string; name: string | null; email: string; affiliateCode: string | null; affiliateStatus: string; affiliateTier: string }>;
    commissions: { _sum: { amountCents: number | null }; _count: { id: number } };
    recentCommissions: Array<{ id: string; amountCents: number; status: string; createdAt: string; affiliate: { name: string | null; email: string } }>;
  };
  audits: Array<{ id: string; action: string; targetType: string; targetId: string | null; reason: string | null; createdAt: string }>;
};
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
export const metadata: Metadata = { title: "Admin Monetization", robots: { index: false, follow: false } };

export default async function AdminMonetizationPage() {
  const data = await fetchAdminMonetizationServer<Overview>();
  return <div className="space-y-6">
    <Card className="rounded-2xl p-6"><h1 className="text-3xl font-black">Monetization operations</h1><p className="text-muted mt-2 text-sm">Review affiliate payouts and apply traceable manual adjustments.</p></Card>
    <section className="grid gap-4 md:grid-cols-3"><Card className="rounded-2xl p-5"><p className="text-muted text-sm">Affiliates</p><p className="mt-2 text-3xl font-black">{data.affiliate.affiliates.length}</p></Card><Card className="rounded-2xl p-5"><p className="text-muted text-sm">Commissions</p><p className="mt-2 text-3xl font-black">{data.affiliate.commissions._count.id}</p></Card><Card className="rounded-2xl p-5"><p className="text-muted text-sm">Commission total</p><p className="mt-2 text-3xl font-black">{money(data.affiliate.commissions._sum.amountCents ?? 0)}</p></Card></section>
    <section className="grid gap-4 lg:grid-cols-2"><Card className="rounded-2xl p-5"><h2 className="mb-4 font-black">Grant credits</h2><ManualGrantForm kind="credits" /></Card><Card className="rounded-2xl p-5"><h2 className="mb-4 font-black">Grant entitlement</h2><ManualGrantForm kind="entitlements" /></Card></section>
    <section className="grid gap-4 lg:grid-cols-2"><Card className="rounded-2xl p-5"><h2 className="mb-4 font-black">Create affiliate commission</h2><CommissionForm /></Card><Card className="rounded-2xl p-5"><h2 className="font-black">Affiliate moderation</h2><div className="mt-4 divide-y">{data.affiliate.affiliates.map((item) => <div className="space-y-3 py-3" key={item.id}><div><p className="font-bold">{item.name || item.email}</p><p className="text-muted text-xs">{item.affiliateCode || "No code"}</p></div><AffiliateModeration userId={item.id} status={item.affiliateStatus} tier={item.affiliateTier} /></div>)}</div></Card></section>
    <Card className="rounded-2xl p-5"><h2 className="font-black">Withdrawal queue</h2><div className="mt-4 divide-y">{data.affiliate.withdrawals.length ? data.affiliate.withdrawals.map((item) => <div className="grid gap-3 py-4 md:grid-cols-[1fr_auto_auto] md:items-center" key={item.id}><div><p className="font-bold">{item.user.name || item.user.email}</p><p className="text-muted text-xs">{item.status} · {new Date(item.createdAt).toLocaleString()}</p></div><strong>{money(item.amountCents)}</strong><MonetizationActions withdrawalId={item.id} status={item.status} /></div>) : <p className="text-muted py-4 text-sm">No withdrawal requests.</p>}</div></Card>
    <Card className="rounded-2xl p-5"><h2 className="font-black">Commission review</h2><div className="mt-4 divide-y">{data.affiliate.recentCommissions.length ? data.affiliate.recentCommissions.map((item) => <div className="grid gap-3 py-4 md:grid-cols-[1fr_auto_auto] md:items-center" key={item.id}><div><p className="font-bold">{item.affiliate.name || item.affiliate.email}</p><p className="text-muted text-xs">{item.status} · {new Date(item.createdAt).toLocaleString()}</p></div><strong>{money(item.amountCents)}</strong><CommissionActions id={item.id} status={item.status} /></div>) : <p className="text-muted py-4 text-sm">No commissions.</p>}</div></Card>
    <Card className="rounded-2xl p-5"><h2 className="font-black">Audit log</h2><div className="mt-4 divide-y">{data.audits.map((item) => <div className="py-3 text-sm" key={item.id}><strong>{item.action}</strong><span className="text-muted"> · {item.targetType} · {item.reason || "No reason"}</span></div>)}</div></Card>
  </div>;
}
