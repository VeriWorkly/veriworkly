import { Check, DollarSign } from "lucide-react";

import { Card } from "@veriworkly/ui";

import { type Competitor } from "../../types";

interface ComparePricingSectionProps {
  competitor: Competitor;
}

/**
 * Rendered under an "Included for free" heading on all six /compare/* pages, so
 * every line here has to be true of the free tier specifically.
 *
 * The portfolio line is deliberately split from the document line: document
 * exports genuinely carry no watermark on any tier, while a free portfolio
 * publishes with a "Built with VeriWorkly" badge and only the two core
 * templates. Publishing itself is not live yet, hence the "at launch" label.
 */
const VERIWORKLY_PRICING_PILLARS = [
  "No account or credit card required to start",
  "Unlimited PDF, Word (DOCX), and Markdown downloads",
  "Documents export with no watermark, on every tier",
  "Target job post ATS keyword checks included",
  "Portfolio publishing on a veriworkly.com subdomain, with the free core templates and a “Built with VeriWorkly” badge (at launch)",
  "Optional pay-as-you-go AI credits with zero monthly subscriptions",
];

export const ComparePricingSection = ({ competitor }: ComparePricingSectionProps) => {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-accent/40 bg-card/60 hover:shadow-accent/5 relative space-y-6 overflow-hidden p-6 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl sm:p-8">
          <div className="bg-accent/10 pointer-events-none absolute -top-16 -right-16 size-56 rounded-full blur-3xl" />

          <div className="relative flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
                VeriWorkly Pricing
              </span>

              <h3 className="text-foreground text-2xl font-bold tracking-tight">
                Free Core Builder
              </h3>
            </div>

            <span className="bg-accent/15 text-accent border-accent/30 rounded-full border px-3 py-1 font-mono text-xs font-bold tracking-wide uppercase">
              $0 / Forever
            </span>
          </div>

          <p className="text-muted relative text-sm leading-relaxed">
            Everything you need to write, check against ATS filters, and download clean career
            documents is completely free.
          </p>

          <div className="border-border/40 relative border-t pt-4">
            <span className="text-foreground/90 mb-3 block font-mono text-[10px] font-bold tracking-wider uppercase">
              Included for free:
            </span>

            <ul className="space-y-2.5">
              {VERIWORKLY_PRICING_PILLARS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <span className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3 stroke-[2.5]" aria-hidden="true" />
                  </span>

                  <span className="text-muted leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/40 relative space-y-6 overflow-hidden p-6 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg sm:p-8">
          <div className="space-y-1">
            <span className="text-muted font-mono text-[10px] font-bold tracking-widest uppercase">
              {competitor.name} Pricing
            </span>

            <h3 className="text-foreground text-2xl font-bold tracking-tight">
              {competitor.pricingModel.split("-")[0]?.trim() || "Subscription"}
            </h3>
          </div>

          <p className="text-muted text-sm leading-relaxed">{competitor.pricingSummary}</p>

          <div className="border-border/40 border-t pt-4">
            <span className="text-muted mb-3 block font-mono text-[10px] font-bold tracking-wider uppercase">
              Published pricing plans:
            </span>

            <ul className="space-y-2.5">
              {competitor.paidPlans.map((plan) => (
                <li
                  key={plan}
                  className="border-border/50 bg-background/60 text-foreground/90 flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-medium shadow-xs sm:text-sm"
                >
                  <span>{plan}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="border-border/60 bg-muted/4 grid gap-4 rounded-2xl border p-5 sm:grid-cols-3 sm:items-center">
        <div className="space-y-1 sm:col-span-2">
          <div className="flex items-center gap-2">
            <DollarSign className="text-accent size-4" />

            <h4 className="text-foreground text-sm font-bold">
              What a typical 3-month job search costs
            </h4>
          </div>

          <p className="text-muted text-xs leading-relaxed">
            Most job searches take 3 to 6 months. On recurring monthly subscriptions
            ($20-$29/month), you can easily spend $60 to $180+ just keeping your resume active.
            VeriWorkly costs $0 for the core builder throughout your entire search.
          </p>
        </div>

        <div className="border-border/40 flex flex-col items-start sm:items-end sm:border-l sm:pl-5">
          <span className="text-muted font-mono text-[10px] uppercase">Money saved</span>

          <span className="text-accent font-mono text-2xl font-bold tracking-tight">
            $60 - $180+
          </span>
        </div>
      </div>
    </div>
  );
};

export default ComparePricingSection;
