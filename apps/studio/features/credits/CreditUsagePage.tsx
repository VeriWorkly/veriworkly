import { Coins, History, TrendingDown, TrendingUp } from "lucide-react";

import type { CreditTransaction, CreditWallet } from "@/features/credits/types";
import type { BillingSummary } from "@/features/billing/types";

export function CreditUsagePage({
  wallet,
  history,
  economics,
}: {
  wallet: CreditWallet | null;
  history: CreditTransaction[];
  economics: BillingSummary["creditEconomics"] | null;
}) {
  return (
    <main className="space-y-5">
      <header className="border-border bg-card rounded-2xl border p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-black"><Coins className="text-accent h-4 w-4" /> AI credits</div>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Credit usage</h1>
        <p className="text-muted mt-2 max-w-2xl text-sm leading-6">Every successful AI action appears here with its exact cost and resulting balance.</p>
      </header>
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric icon={Coins} label="Available" value={wallet?.balance ?? 0} />
        <Metric icon={TrendingUp} label="Lifetime credited" value={wallet?.lifetimeCredited ?? 0} />
        <Metric icon={TrendingDown} label="Lifetime used" value={wallet?.lifetimeDebited ?? 0} />
      </section>
      <section className="border-border bg-card rounded-2xl border p-5">
        <h2 className="font-black">How credits are calculated</h2>
        <p className="text-muted mt-2 max-w-3xl text-sm leading-6">Credits use fixed server-side costs per successful action. Failed actions do not consume credits. Older and sooner-expiring credits are used first.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(economics?.actions ?? {}).map(([action, policy]) => <div className="bg-background rounded-xl p-4" key={action}><p className="text-sm font-bold">{action.replaceAll("_", " ")}</p><p className="text-accent mt-2 text-xl font-black">{policy.costs.standard} / {policy.costs.expert} credits</p><p className="text-muted mt-1 text-xs">Standard / Expert</p></div>)}
        </div>
        <p className="text-muted mt-4 text-xs">{wallet?.nextExpiryCredits ? `${wallet.nextExpiryCredits} credits expire ${new Date(wallet.nextExpiryAt!).toLocaleDateString()}.` : "No credits currently scheduled to expire."}</p>
      </section>
      <section className="border-border bg-card rounded-2xl border p-5">
        <h2 className="flex items-center gap-2 font-black"><History className="h-4 w-4" /> Transaction history</h2>
        <div className="border-border mt-4 divide-y border-y">
          {history.length ? history.map((item) => (
            <div className="grid gap-2 py-4 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center" key={item.id}>
              <div>
                <p className="font-bold">{item.action?.replaceAll("_", " ") || item.type.toLowerCase()}</p>
                <p className="text-muted mt-1 text-xs">{item.reason || new Date(item.createdAt).toLocaleString()}</p>
              </div>
              <p className={item.amount > 0 ? "font-black text-emerald-600" : "font-black text-rose-600"}>{item.amount > 0 ? "+" : ""}{item.amount}</p>
              <p className="text-muted text-xs">Balance {item.balanceAfter}</p>
            </div>
          )) : <p className="text-muted py-5 text-sm">No credit usage yet. Successful AI actions will appear here.</p>}
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Coins; label: string; value: number }) {
  return <article className="border-border bg-card rounded-2xl border p-5"><Icon className="text-accent h-4 w-4" /><p className="text-muted mt-4 text-xs font-bold">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></article>;
}
