"use client";

import React from "react";
import { Globe } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";

interface CurrencyToggleProps {
  className?: string;
}

export const CurrencyToggle: React.FC<CurrencyToggleProps> = ({ className = "" }) => {
  const { currency, setCurrency, detectedRegion, isConverted } = useCurrency();

  return (
    <div className={className}>
      <div
        role="group"
        aria-label="Display currency"
        className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/90 p-1 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90"
      >
        <span className="flex items-center gap-1.5 pl-3 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
          <Globe className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
          {detectedRegion === "IN" ? "India detected" : "Currency"}
        </span>

        <div className="flex items-center rounded-full bg-zinc-100 p-0.5 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setCurrency("USD")}
            aria-pressed={currency === "USD"}
            className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all duration-200 ${
              currency === "USD"
                ? "bg-zinc-950 text-white shadow-xs dark:bg-white dark:text-zinc-950"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            USD ($)
          </button>

          <button
            type="button"
            onClick={() => setCurrency("INR")}
            aria-pressed={currency === "INR"}
            className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all duration-200 ${
              currency === "INR"
                ? "bg-zinc-950 text-white shadow-xs dark:bg-white dark:text-zinc-950"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            INR (₹)
          </button>
        </div>
      </div>
      {/* Prices are set in USD and converted with a daily rate, so the rupee figure is an estimate. (W-086) */}
      {isConverted ? (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Approximate, at today&apos;s rate. Checkout shows the exact amount you pay.
        </p>
      ) : null}
    </div>
  );
};

export default CurrencyToggle;
