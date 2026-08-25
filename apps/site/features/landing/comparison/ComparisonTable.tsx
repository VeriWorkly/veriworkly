import { Check, X } from "lucide-react";

export interface ComparisonRow {
  feature: string;
  veriworkly: string;
  competitor: string;
}

const rows: ComparisonRow[] = [
  {
    feature: "Starting price",
    veriworkly: "$0, free forever",
    competitor: "~$2.95 trial, then $23.95+/mo",
  },
  {
    feature: "PDF export",
    veriworkly: "Unlocked instantly, every time",
    competitor: "Locked behind recurring paywalls",
  },
  {
    feature: "Where your data lives",
    veriworkly: "100% local, inside your browser",
    competitor: "Stored on central cloud servers",
  },
  {
    feature: "Account required",
    veriworkly: "None, start building instantly",
    competitor: "Email and card details required",
  },
  {
    feature: "Billing & commitments",
    veriworkly: "No credit card, no auto-renewal",
    competitor: "Subscriptions auto-renew monthly",
  },
  {
    feature: "Source transparency",
    veriworkly: "Open-source & auditable",
    competitor: "Proprietary & closed-source",
  },
];

const ComparisonTable = () => {
  return (
    <div className="mt-10 overflow-x-auto pb-2 sm:mt-16">
      <table className="w-full min-w-140 border-separate border-spacing-0 sm:min-w-160">
        <caption className="sr-only">
          Feature comparison between VeriWorkly and traditional subscription resume builders
        </caption>

        <thead>
          <tr>
            <th scope="col" className="w-[36%] pb-4 text-left align-bottom sm:w-2/5 sm:pb-5">
              <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase sm:text-xs">
                Feature
              </span>
            </th>

            <th
              scope="col"
              className="w-[32%] px-4 pb-4 text-left align-bottom sm:w-[30%] sm:px-6 sm:pb-5"
            >
              <span className="text-xs font-semibold text-zinc-500 sm:text-sm dark:text-zinc-400">
                Traditional builders
              </span>
              <p className="mt-0.5 text-[11px] text-zinc-400 sm:text-xs dark:text-zinc-500">
                Zety, Resume.io
              </p>
            </th>

            <th
              scope="col"
              className="w-[32%] rounded-t-2xl border border-b-0 border-blue-500/20 bg-blue-500/4 px-4 pt-4 pb-4 text-left align-bottom sm:w-[30%] sm:px-6 sm:pt-5 sm:pb-5 dark:bg-blue-500/6"
            >
              <span className="text-xs font-bold text-zinc-900 sm:text-sm dark:text-white">
                VeriWorkly
              </span>
              <p className="mt-0.5 text-[11px] font-semibold text-blue-600 sm:text-xs dark:text-blue-400">
                Recommended
              </p>
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => {
            const isLast = index === rows.length - 1;

            return (
              <tr key={row.feature}>
                <th
                  scope="row"
                  className="border-t border-zinc-100 py-3.5 pr-3 text-left text-xs font-semibold text-zinc-800 sm:py-5 sm:pr-4 sm:text-sm dark:border-zinc-900 dark:text-zinc-200"
                >
                  {row.feature}
                </th>

                <td className="border-t border-zinc-100 px-4 py-3.5 sm:px-6 sm:py-5 dark:border-zinc-900">
                  <div className="flex items-start gap-2 sm:gap-2.5">
                    {row.competitor === "-" ? (
                      <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-zinc-100 font-mono text-[10px] font-bold text-zinc-400 sm:h-5 sm:w-5 sm:text-xs dark:bg-zinc-900 dark:text-zinc-500">
                        –
                      </span>
                    ) : (
                      <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 sm:h-5 sm:w-5 dark:bg-zinc-900 dark:text-zinc-600">
                        <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={3} />
                      </span>
                    )}
                    <span className="text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
                      {row.competitor === "-" ? "Varies by vendor" : row.competitor}
                    </span>
                  </div>
                </td>

                <td
                  className={`border-x border-t border-blue-500/20 bg-blue-500/4 px-4 py-3.5 sm:px-6 sm:py-5 dark:bg-blue-500/6 ${
                    isLast ? "rounded-b-2xl border-b" : ""
                  }`}
                >
                  <div className="flex items-start gap-2 sm:gap-2.5">
                    <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 sm:h-5 sm:w-5 dark:text-emerald-400">
                      <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={3} />
                    </span>
                    <span className="text-xs font-semibold text-zinc-900 sm:text-sm sm:font-medium dark:text-zinc-100">
                      {row.veriworkly}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ComparisonTable;
