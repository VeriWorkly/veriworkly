import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { ATS_TIERS } from "../../data/pricingTiers";

export function TierComparison() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {ATS_TIERS.map((tier) => (
        <div
          key={tier.name}
          className={`relative flex flex-col justify-between rounded-3xl border p-7 shadow-lg backdrop-blur-sm transition-all duration-300 ${
            tier.highlight
              ? "border-accent/50 bg-card/60 ring-accent/20 shadow-xl ring-1"
              : "border-border/60 bg-card/40 hover:border-border"
          }`}
        >
          {tier.highlight && (
            <span className="bg-accent text-accent-foreground absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-bold shadow-md">
              <Sparkles className="size-3" aria-hidden="true" />
              {tier.badge}
            </span>
          )}

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-foreground text-lg font-bold tracking-tight">{tier.name}</h3>
              {!tier.highlight && (
                <span className="border-border/60 bg-background text-muted rounded-full border px-2.5 py-0.5 font-mono text-[10px]">
                  {tier.badge}
                </span>
              )}
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-foreground font-mono text-3xl font-bold tracking-tight">
                {tier.price}
              </span>
              <span className="text-muted font-mono text-xs">{tier.period}</span>
            </div>

            <p className="text-muted/80 mt-1 font-mono text-xs">{tier.note}</p>

            <ul className="border-border/30 mt-6 space-y-3 border-t pt-5">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-xs leading-relaxed sm:text-sm">
                  <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full">
                    <Check className="size-2.5" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <span className="text-foreground/90">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href={tier.cta.href}
            className={`mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-xs font-semibold transition-all duration-200 active:scale-[0.97] ${
              tier.highlight
                ? "bg-accent text-accent-foreground shadow-md hover:opacity-90"
                : "border-border/80 bg-background/80 text-foreground hover:bg-card border"
            }`}
          >
            <span>{tier.cta.label}</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ))}
    </div>
  );
}

export default TierComparison;
