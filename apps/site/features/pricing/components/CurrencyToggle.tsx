"use client";

import React from "react";
import { Globe } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";

interface CurrencyToggleProps {
  className?: string;
}

export const CurrencyToggle: React.FC<CurrencyToggleProps> = ({ className = "" }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { currency, setCurrency, exchangeRate, detectedRegion } = useCurrency();

  return (
    <div
      role="group"
      aria-label="Display currency"
      className={`inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/90 p-1 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90 ${className}`}
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

      {/*
        Checkout is billed in USD, so an INR figure is an estimate and has to read as one.
        Quoting a precise-looking converted number with no qualifier is the kind of detail
        people notice on their card statement rather than on this page.
      */}
      {/* Rounded: the live rate arrives with full float precision, and ₹88.2371/$1 implies
          an exactness that a USD-billed checkout cannot honour anyway. */}
      {/* {currency === "INR" && (
        <span className="pr-3 font-mono text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
          approx. ₹{Math.round(exchangeRate)}/$1 · billed in USD
        </span>
      )} */}
    </div>
  );
};

export default CurrencyToggle;
