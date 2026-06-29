import { CheckCircle2, Minus } from "lucide-react";

import { siteConfig } from "@/config/site";

import { CheckoutButton } from "@/features/pricing/components/CheckoutButton";

interface ComparisonRow {
  label: string;
  values: string[];
}

const comparisonRows: ComparisonRow[] = [
  {
    label: "Max Active Resumes & Letters",
    values: ["1 of each", "1 of each", "Unlimited", "Unlimited"],
  },
  {
    label: "Public Portfolio Webpage",
    values: ["Draft only", "Subdomain", "Not included", "Subdomain"],
  },
  {
    label: "Monthly AI Credits",
    values: ["0", "0", "1,000 / mo", "1,000 / mo"],
  },
  {
    label: "Master Profile (Single Source of Truth)",
    values: ["Locked", "Locked", "Unlocked", "Unlocked"],
  },
  {
    label: "GitHub & LinkedIn Connect",
    values: ["Locked", "Locked", "Unlocked", "Unlocked"],
  },
  {
    label: "Legacy PDF/DOCX Importer",
    values: ["Locked", "Locked", "Unlocked", "Unlocked"],
  },
  {
    label: "Digital Sales Checkout Fees",
    values: ["5.0%", "1.5%", "1.5%", "1.5%"],
  },
  {
    label: "Watermark & Branding",
    values: ["Custom badge", "Removed", "N/A", "Removed"],
  },
];

function renderCell(val: string, colIndex: number) {
  const isBundle = colIndex === 3;
  const isPositive =
    ["Subdomain", "Unlimited", "Unlocked", "Removed", "1.5%"].includes(val) || val === "1,000 / mo";
  const isNegative = ["Locked", "Not included", "Draft only", "0", "5.0%", "Custom badge"].includes(
    val,
  );

  if (isPositive) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
          isBundle
            ? "bg-accent/15 border-accent/30 text-accent"
            : "border-white/10 bg-white/5 text-white"
        }`}
      >
        <CheckCircle2 className="size-3.5 shrink-0" />
        <span>{val}</span>
      </span>
    );
  }

  if (isNegative) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1 text-xs font-medium text-white/40">
        <Minus className="size-3.5 shrink-0" aria-hidden="true" />
        <span>{val}</span>
      </span>
    );
  }

  if (val === "N/A") {
    return (
      <span className="text-[10px] font-bold tracking-wider text-white/35 uppercase">{val}</span>
    );
  }

  return <span className="text-xs font-semibold text-white/80">{val}</span>;
}

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

          <p className="border-t border-white/20 pt-5 text-base leading-7 text-[#f5f4ef]/70">
            Core resume and portfolio editors stay free forever. Upgrade when you need active
            subdomain hosting, custom SEO configurations, or advanced AI content tailoring.
          </p>
        </div>

        <div
          role="table"
          aria-label="Feature and plan comparison"
          className="mt-14 overflow-x-auto rounded-4xl border border-white/10 bg-white/5"
        >
          <div className="min-w-[900px]">
            <div
              className="grid grid-cols-[minmax(280px,1.2fr)_repeat(4,155px)] bg-white/10 px-6 py-5 text-xs font-bold tracking-[0.15em] text-[#f5f4ef]/85 uppercase"
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

            {comparisonRows.map(({ label, values }) => (
              <div
                role="row"
                key={label}
                className="grid grid-cols-[minmax(280px,1.2fr)_repeat(4,155px)] items-center border-t border-white/10 px-6 py-4.5 text-xs tracking-normal transition-colors hover:bg-white/5 sm:text-base"
              >
                <span className="pr-4 text-sm font-medium text-white/90" role="cell">
                  {label}
                </span>

                {values.map((val, index) => (
                  <span
                    className="grid place-items-center text-center"
                    key={`${label}-${index}`}
                    role="cell"
                  >
                    {renderCell(val, index)}
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
              A full year for $11.99 per month.
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
