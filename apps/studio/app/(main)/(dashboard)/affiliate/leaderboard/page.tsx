import { AffiliateNav } from "@/features/affiliate/AffiliateNav";
import type { LeaderboardEntry } from "@/features/affiliate/types";
import { getBillingServerData } from "@/features/billing/billing-server";
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export default async function AffiliateLeaderboardPage() {
  const [monthly, allTime] = await Promise.all([getBillingServerData<LeaderboardEntry[]>("/affiliates/leaderboard?period=monthly"), getBillingServerData<LeaderboardEntry[]>("/affiliates/leaderboard?period=all_time")]);
  return <main className="space-y-5"><AffiliateNav /><header className="border-border bg-card rounded-2xl border p-5"><h1 className="text-3xl font-black">Leaderboard</h1><p className="text-muted mt-2 text-sm">Rankings use released and paid commissions only. Pending earnings do not affect rank.</p></header><section className="grid gap-4 lg:grid-cols-2"><Board title="This month" entries={monthly ?? []} /><Board title="All time" entries={allTime ?? []} /></section></main>;
}
function Board({ title, entries }: { title: string; entries: LeaderboardEntry[] }) { return <article className="border-border bg-card rounded-2xl border p-5"><h2 className="font-black">{title}</h2><div className="mt-4 divide-y">{entries.length ? entries.map((entry) => <div className="grid grid-cols-[3rem_1fr_auto] py-3 text-sm" key={`${entry.rank}-${entry.user?.username}`}><strong>#{entry.rank}</strong><span>{entry.user?.name || entry.user?.username || "Affiliate"}</span><strong>{money(entry.earningsCents)}</strong></div>) : <p className="text-muted py-5 text-sm">No ranked affiliates yet.</p>}</div></article>; }
