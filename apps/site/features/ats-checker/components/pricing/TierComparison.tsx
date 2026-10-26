import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { PageSection, TYPE } from "@/components/marketing/PageLayout";

import { ATS_TIERS } from "../../data/pricingTiers";

export function TierComparison() {
  return (
    <PageSection
      title="Free to score. Paid for AI."
      lede="A free account gets the full report: every rule, every keyword, every fix. AI credits, from a pack, a pass or a plan, add AI explanations and more scans."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {ATS_TIERS.map((tier) => (
          <article
            key={tier.name}
            className={`reveal flex flex-col rounded-3xl p-6 lg:p-8 ${
              tier.highlight ? "bg-accent text-accent-foreground" : "bg-card"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className={TYPE.title}>{tier.name}</h3>
              {tier.highlight ? (
                <span className="bg-accent-foreground text-accent rounded-full px-3 py-1 text-sm font-semibold">
                  {tier.badge}
                </span>
              ) : null}
            </div>

            <p className="mt-6 flex items-baseline gap-2">
              <span className={TYPE.figure}>{tier.price}</span>
              <span className="text-base opacity-75">{tier.period}</span>
            </p>
            <p className="mt-3 text-sm font-semibold opacity-80">{tier.note}</p>

            <ul className="mt-6 mb-8 space-y-3 border-t border-current/15 pt-6 text-base">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Check aria-hidden="true" className="mt-1 size-4 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href={tier.cta.href}
              className={`group focus-visible:ring-accent/40 mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-[transform,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] ${
                tier.highlight
                  ? "bg-accent-foreground text-accent"
                  : "bg-foreground text-background hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {tier.cta.label}
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </article>
        ))}
      </div>
    </PageSection>
  );
}

export default TierComparison;
