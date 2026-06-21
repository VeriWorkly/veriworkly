import { CheckCircle2, Minus } from "lucide-react";

import { siteConfig } from "@/config/site";

import { CheckoutButton } from "@/features/pricing/components/CheckoutButton";

const comparisonRows = [
  ["Resume and cover letter editor", true, true, true, true],
  ["Private portfolio drafts", true, true, true, true],
  ["Public portfolio publishing", false, true, false, true],
  ["Custom subdomain and SEO controls", false, true, false, true],
  ["Portfolio analytics", false, true, false, true],
  ["AI writing credits", false, false, true, true],
  ["Watermark removal", false, true, false, true],
] as const;

const ComparisonTable = () => {
  const checkoutUrl = `${siteConfig.links.app}/checkout?productKey=bundle&interval=annual`;

  return (
    <section className="bg-[#171717] dark:bg-paper-2 text-[#f5f4ef] relative py-24 lg:py-32">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(rgba(255,255,255,0.12)_0.8px,transparent_0.8px)] bg-size-[24px_24px] opacity-40" />
      <div className="relative z-10 mx-auto w-[min(1160px,calc(100%-32px))]">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_.65fr]">
          <div>
            <p className="text-accent text-xs font-bold tracking-[0.16em] uppercase">
              Compare access
            </p>

            <h2 className="mt-5 max-w-4xl text-[clamp(2.4rem,6vw,4rem)] leading-none font-bold tracking-tighter">
              Free stays useful. Paid gets powerful.
            </h2>
          </div>

          <p className="text-[#f5f4ef]/70 border-t border-white/20 pt-5 text-base leading-7">
            Core document building remains free. Upgrade when you need publishing, focused AI
            assistance, or both.
          </p>
        </div>

        <div
          role="table"
          aria-label="Feature and plan comparison"
          className="mt-14 overflow-x-auto rounded-4xl border border-white/10 bg-white/5"
        >
          <div className="min-w-[760px]">
            <div
              className="text-[#f5f4ef]/85 grid grid-cols-[minmax(250px,1fr)_repeat(4,130px)] bg-white/10 px-6 py-5 text-xs font-bold tracking-[0.15em] uppercase"
              role="row"
            >
              <span role="columnheader">What&apos;s included</span>

              <span className="text-center" role="columnheader">
                Free
              </span>

              <span className="text-center" role="columnheader">
                Portfolio
              </span>

              <span className="text-center" role="columnheader">
                AI credits
              </span>

              <span className="text-accent text-center" role="columnheader">
                Bundle
              </span>
            </div>

            {comparisonRows.map(([label, ...values]) => (
              <div
                role="row"
                key={label}
                className="grid grid-cols-[minmax(250px,1fr)_repeat(4,130px)] items-center border-t border-white/10 px-6 py-4.5 text-xs tracking-normal transition-colors hover:bg-white/5 sm:text-base"
              >
                <span className="text-[#f5f4ef]/90 font-medium" role="cell">
                  {label}
                </span>

                {values.map((enabled, index) => (
                  <span className="grid place-items-center" key={`${label}-${index}`} role="cell">
                    {enabled ? (
                      <CheckCircle2
                        className={`size-4.5 ${index === 3 ? "text-accent" : "text-white/80"}`}
                        aria-label="Included"
                      />
                    ) : (
                      <Minus className="size-4.5 text-white/20" aria-label="Not included" />
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
              A full year for $9.99 per month.
            </h3>
          </div>

          <CheckoutButton
            href={checkoutUrl}
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
