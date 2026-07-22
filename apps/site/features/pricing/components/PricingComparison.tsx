import { CheckCircle2, Minus } from "lucide-react";
import { comparisonRows, type ProductKey, type BillingInterval } from "../data/pricingData";
import CheckoutButton from "./CheckoutButton";

interface PricingComparisonProps {
  loading: string;
  paymentsBlocked: boolean;
  onCheckout: (productKey: ProductKey, interval: BillingInterval) => void;
}

const PricingComparison = ({ loading, paymentsBlocked, onCheckout }: PricingComparisonProps) => {
  return (
    <section className="bg-card border-border border-b py-24 lg:py-32">
      <div className="mx-auto w-[min(1180px,calc(100%_-_32px))]">
        <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="text-accent text-xs font-bold tracking-wider uppercase">Compare access</p>
            <h2 className="mt-5 max-w-4xl text-[clamp(2.4rem,6vw,4rem)] leading-[0.9] font-bold tracking-tighter">
              Free stays useful. Paid gets powerful.
            </h2>
          </div>
          <p className="border-border text-muted border-t pt-5 text-base leading-7">
            Core resume and portfolio editors stay free forever. Upgrade when you need active
            subdomain hosting, custom SEO configurations, or advanced AI content tailoring.
          </p>
        </div>

        <div
          role="table"
          aria-label="Feature and plan comparison"
          className="border-border bg-background mt-14 overflow-x-auto rounded-3xl border"
        >
          <div className="min-w-[840px]">
            <div
              className="border-border bg-muted/30 text-muted grid grid-cols-[minmax(250px,1.2fr)_repeat(4,140px)] border-b px-6 py-5 text-xs font-bold tracking-wider uppercase"
              role="row"
            >
              <span role="columnheader">What&apos;s included</span>
              <span className="text-center" role="columnheader">
                Free
              </span>
              <span className="text-center" role="columnheader">
                Creator Pro
              </span>
              <span className="text-center" role="columnheader">
                AI Standalone
              </span>
              <span className="text-accent text-center" role="columnheader">
                Bundle
              </span>
            </div>

            {comparisonRows.map(([label, ...values]) => (
              <div
                className="border-border hover:bg-muted/10 grid grid-cols-[minmax(250px,1.2fr)_repeat(4,140px)] items-center border-b px-6 py-4.5 text-sm transition-colors last:border-b-0"
                key={label}
                role="row"
              >
                <span className="text-foreground/90 pr-4 font-medium">{label}</span>
                {values.map((enabled, index) => (
                  <span className="grid place-items-center" key={`${label}-${index}`} role="cell">
                    {enabled ? (
                      <span
                        className={`inline-flex items-center justify-center rounded-full border p-1 transition-colors ${
                          index === 3
                            ? "bg-accent/15 border-accent/30 text-accent"
                            : "bg-foreground/5 border-foreground/10 text-foreground"
                        }`}
                      >
                        <CheckCircle2 className="size-3.5 shrink-0" />
                      </span>
                    ) : (
                      <span className="bg-muted/10 border-border text-muted/40 inline-flex items-center justify-center rounded-full border p-1">
                        <Minus className="size-3.5 shrink-0" aria-hidden="true" />
                      </span>
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-accent shadow-accent/25 mt-12 flex flex-col items-start justify-between gap-6 rounded-3xl p-8 text-white shadow-lg sm:flex-row sm:items-center lg:p-9">
          <div>
            <p className="text-xs font-bold tracking-wider text-white/95 uppercase">
              Best long-term value
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight">
              A full year for $11.99 per month.
            </h3>
          </div>
          <CheckoutButton
            className="text-accent bg-white hover:bg-white/95"
            loading={loading === "bundle:annual"}
            disabled={paymentsBlocked}
            onClick={() => void onCheckout("bundle", "annual")}
          >
            {paymentsBlocked ? "Payments disabled" : "Get the yearly bundle"}
          </CheckoutButton>
        </div>
      </div>
    </section>
  );
};

export default PricingComparison;
