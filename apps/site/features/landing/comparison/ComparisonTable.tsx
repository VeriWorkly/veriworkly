import React from "react";
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
    feature: "Where your data lives",
    veriworkly: "100% local, inside your browser",
    competitor: "Uploaded to their servers",
  },
  {
    feature: "PDF export",
    veriworkly: "Unlocked instantly, every time",
    competitor: "Locked behind a paywall",
  },
  {
    feature: "Billing",
    veriworkly: "No card, no auto-renewal",
    competitor: "Trial silently auto-renews",
  },
  {
    feature: "Account required",
    veriworkly: "None, start building instantly",
    competitor: "Email and payment details required",
  },
  {
    feature: "Data usage",
    veriworkly: "Never sold, never shared",
    competitor: "-",
  },
];

const ComparisonTable = () => {
  return (
    <div className="mt-16 overflow-x-auto">
      <table className="w-full min-w-160 border-separate border-spacing-0">
        <caption className="sr-only">
          Feature comparison between VeriWorkly and traditional subscription resume builders
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-2/5 pb-5 text-left align-bottom">
              <span className="text-xs font-semibold tracking-tight text-zinc-400 uppercase">
                Feature
              </span>
            </th>
            <th scope="col" className="w-[30%] px-6 pb-5 text-left align-bottom">
              <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                Traditional builders
              </span>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">Zety, Resume.io</p>
            </th>
            <th
              scope="col"
              className="w-[30%] rounded-t-2xl border border-b-0 border-blue-500/15 bg-blue-500/4 px-6 pt-5 pb-5 text-left align-bottom dark:bg-blue-500/6"
            >
              <span className="text-sm font-bold text-zinc-900 dark:text-white">VeriWorkly</span>
              <p className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
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
                  className="border-t border-zinc-100 py-5 pr-4 text-left text-sm font-semibold text-zinc-800 dark:border-zinc-900 dark:text-zinc-200"
                >
                  {row.feature}
                </th>
                <td className="border-t border-zinc-100 px-6 py-5 dark:border-zinc-900">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600">
                      <X className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {row.competitor}
                    </span>
                  </div>
                </td>
                <td
                  className={`border-x border-t border-blue-500/15 bg-blue-500/4 px-6 py-5 dark:bg-blue-500/6 ${
                    isLast ? "rounded-b-2xl border-b" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
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
