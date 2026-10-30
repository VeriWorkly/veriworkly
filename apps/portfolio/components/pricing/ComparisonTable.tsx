import { CheckCircle2, Minus } from "lucide-react";

import { siteConfig } from "@/config/site";

import { PLAN_NAMES, annualPerMonth, comparisonRows, usd } from "@/features/pricing/data/offers";
import { CheckoutButton } from "@/features/pricing/components/CheckoutButton";

const columns = ["Free", PLAN_NAMES.portfolio_pro, PLAN_NAMES.ai_credits, PLAN_NAMES.bundle];

const grid = "grid grid-cols-[minmax(200px,1.2fr)_repeat(4,140px)]";
// The label column stays in view while the plans scroll sideways on a phone.
const stickyLabel = "sticky left-0 z-10 bg-[#222222] dark:bg-paper-2 pr-4";

const ComparisonTable = () => {
  const checkoutUrl = `${siteConfig.links.app}/checkout?productKey=bundle&interval=annual`;

  return (
    <section className="dark:bg-paper-2 relative bg-[#171717] py-24 text-[#f5f4ef] lg:py-32">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(rgba(255,255,255,0.12)_0.8px,transparent_0.8px)] bg-size-[24px_24px] opacity-40" />
      <div className="relative z-10 mx-auto w-[min(1160px,calc(100%-32px))]">
        <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="text-accent text-xs font-bold tracking-[0.16em] uppercase">
              Compare access
            </p>

            <h2 className="mt-5 max-w-4xl text-[clamp(2.4rem,6vw,4rem)] leading-none font-bold tracking-tighter">
              Free stays useful. Paid gets powerful.
            </h2>
          </div>

          <p className="border-t border-white/20 pt-5 text-base leading-7 text-[#f5f4ef]/80">
            The editors stay free, and so does publishing on a veriworkly.com subdomain. Upgrade for
            premium templates, badge removal, analytics, SEO controls or AI writing credits.
          </p>
        </div>

        {/* Keyboard-reachable scroll region; the table roles sit on the inner grid. */}
        <div
          tabIndex={0}
          role="group"
          aria-label="Feature and plan comparison, scrollable"
          className="focus-visible:ring-accent/60 mt-14 overflow-x-auto rounded-4xl border border-white/10 bg-white/5 focus-visible:ring-2 focus-visible:outline-none"
        >
          <div className="min-w-[760px]" role="table" aria-label="Feature and plan comparison">
            <div
              className={`${grid} items-center bg-white/10 text-xs font-bold tracking-[0.15em] text-[#f5f4ef] uppercase`}
              role="row"
            >
              <span role="columnheader" className={`${stickyLabel} px-6 py-5`}>
                What&apos;s included
              </span>

              {columns.map((name, index) => (
                <span
                  key={name}
                  role="columnheader"
                  className={`py-5 text-center ${index === 3 ? "text-accent" : ""}`}
                >
                  {name}
                </span>
              ))}
            </div>

            {comparisonRows.map(([label, ...values]) => (
              <div
                role="row"
                key={label}
                className={`${grid} items-center border-t border-white/10 text-sm transition-colors hover:bg-white/5`}
              >
                <span role="rowheader" className={`${stickyLabel} px-6 py-4.5 font-medium`}>
                  {label}
                </span>

                {values.map((included, index) => (
                  <span className="grid place-items-center" key={columns[index]} role="cell">
                    {/* Every cell is an icon, so the words are what a screen reader hears. */}
                    <span className="sr-only">{included ? "Included" : "Not included"}</span>
                    {included ? (
                      <span
                        className={`inline-flex rounded-full border p-1 ${
                          index === 3
                            ? "bg-accent/15 border-accent/40 text-accent"
                            : "border-white/20 bg-white/10 text-white"
                        }`}
                      >
                        <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-white/15 p-1 text-white/70">
                        <Minus className="size-4 shrink-0" aria-hidden="true" />
                      </span>
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-accent mt-12 flex flex-col items-start justify-between gap-6 rounded-4xl p-7 text-white shadow-[0_15px_35px_rgba(37,99,235,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(37,99,235,0.35)] sm:flex-row sm:items-center lg:p-9">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-white/90 uppercase">
              Best long-term value
            </p>

            <h3 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-white sm:text-3xl">
              A full year of the {PLAN_NAMES.bundle} for {usd(annualPerMonth("bundle"))} per month.
            </h3>
          </div>

          <CheckoutButton
            plan="bundle"
            href={checkoutUrl}
            noteClassName="text-white/90"
            className="text-accent hover:bg-paper-2 bg-white shadow-lg"
          >
            Get the yearly bundle
          </CheckoutButton>
        </div>
      </div>
    </section>
  );
};

export default ComparisonTable;
