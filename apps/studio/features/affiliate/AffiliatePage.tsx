"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, DollarSign, MousePointerClick, Trophy, UserPlus } from "lucide-react";
import { Button } from "@veriworkly/ui";

import { AffiliateNav } from "@/features/affiliate/AffiliateNav";
import { enrollAffiliate } from "@/features/affiliate/affiliate-api";
import type { AffiliateDashboard } from "@/features/affiliate/types";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function AffiliatePage({ dashboard }: { dashboard: AffiliateDashboard | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!dashboard || dashboard.affiliateStatus === "NOT_ENROLLED") return <main className="space-y-5"><AffiliateNav /><section className="border-border bg-card rounded-2xl border p-6"><Trophy className="text-accent h-6 w-6" /><h1 className="mt-4 text-3xl font-black">Affiliate program</h1><p className="text-muted mt-3 max-w-2xl text-sm leading-6">Earn commission only when a referred user completes a paid VeriWorkly purchase. Signups alone do not generate earnings.</p>{message ? <p className="text-destructive mt-4 text-sm">{message}</p> : null}<Button className="mt-6" loading={loading} onClick={async () => { setLoading(true); try { await enrollAffiliate(); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not enroll."); } finally { setLoading(false); } }}>Join affiliate program</Button></section></main>;

  const currentTier = dashboard.tiers.find((tier) => tier.key === dashboard.affiliateTier);
  return <main className="space-y-5">
    <AffiliateNav />
    <header className="border-border bg-card rounded-2xl border p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-black">Affiliate overview</h1><p className="text-muted mt-2 text-sm">You earn after a referred account completes a successful paid purchase.</p></div><Button variant="secondary" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/login?ref=${dashboard.affiliateCode}`)}><Copy className="mr-2 h-4 w-4" /> Copy referral link</Button></div></header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={MousePointerClick} label="Link clicks" value={String(dashboard.clicks)} /><Metric icon={UserPlus} label="Referred signups" value={String(dashboard.referrals.length)} /><Metric icon={Trophy} label="Paid conversions" value={String(dashboard.conversions)} /><Metric icon={DollarSign} label="Available earnings" value={money(dashboard.wallet.availableCents)} /></section>
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"><article className="border-border bg-card rounded-2xl border p-5"><div className="flex justify-between gap-3"><div><p className="text-muted text-xs font-bold">Current tier</p><h2 className="mt-1 text-2xl font-black">{currentTier?.name ?? dashboard.affiliateTier}</h2></div><strong className="text-accent text-xl">{(currentTier?.rateBps ?? 0) / 100}%</strong></div><div className="bg-background mt-5 h-2 overflow-hidden rounded-full"><div className="bg-accent h-full rounded-full" style={{ width: dashboard.tierProgress.nextTierConversions ? `${Math.min(100, dashboard.tierProgress.currentConversions / dashboard.tierProgress.nextTierConversions * 100)}%` : "100%" }} /></div><p className="text-muted mt-3 text-xs">{dashboard.tierProgress.nextTierConversions ? `${dashboard.tierProgress.currentConversions} of ${dashboard.tierProgress.nextTierConversions} paid conversions toward the next tier.` : "Highest tier reached."}</p><Link className="text-accent mt-4 inline-block text-sm font-bold" href="/affiliate/tiers">View tier perks</Link></article><article className="border-border bg-card rounded-2xl border p-5"><p className="text-muted text-xs font-bold">Wallet</p><p className="mt-2 text-3xl font-black">{money(dashboard.wallet.availableCents)}</p><p className="text-muted mt-2 text-sm">{money(dashboard.wallet.pendingCents)} pending review</p><Button asChild className="mt-5 w-full" variant="secondary"><Link href="/affiliate/payouts">Manage payouts</Link></Button></article></section>
  </main>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) { return <article className="border-border bg-card rounded-2xl border p-4"><Icon className="text-accent h-4 w-4" /><p className="text-muted mt-3 text-xs font-bold">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></article>; }
