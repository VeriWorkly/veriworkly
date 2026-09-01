"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Currency = "USD" | "INR";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  exchangeRate: number;
  /** Formats a USD list price in the active display currency. */
  formatPrice: (usdAmount: number, options?: { showDecimal?: boolean }) => string;
  /** True while the display currency is anything other than the billing currency. */
  isConverted: boolean;
  detectedRegion: string;
}

/**
 * Display-only fallback, mirroring `FALLBACK_INR_PER_USD` in the server-side rate service.
 * The live figure is resolved on the server and handed down as `inrPerUsd` - see
 * `features/pricing/services/exchange-rate.ts` for why it is not fetched from the browser.
 */
const FALLBACK_INR_PER_USD = 98;

const BILLING_CURRENCY: Currency = "USD";

const STORAGE_KEY = "veriworkly_currency";

function formatIn(
  currency: Currency,
  usdAmount: number,
  showDecimal: boolean,
  inrPerUsd: number,
): string {
  if (currency === "INR") {
    return `₹${Math.round(usdAmount * inrPerUsd).toLocaleString("en-IN")}`;
  }

  return showDecimal === false && Number.isInteger(usdAmount)
    ? `$${usdAmount}`
    : `$${usdAmount.toFixed(2)}`;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: BILLING_CURRENCY,
  setCurrency: () => {},
  exchangeRate: FALLBACK_INR_PER_USD,
  formatPrice: (usdAmount, options) =>
    formatIn(BILLING_CURRENCY, usdAmount, options?.showDecimal ?? true, FALLBACK_INR_PER_USD),
  isConverted: false,
  detectedRegion: "US",
});

export const CurrencyProvider: React.FC<{
  children: React.ReactNode;
  /**
   * Resolved on the server so the rate is identical in the SSR markup and after
   * hydration - a client-side lookup would have re-rendered every price mid-read.
   */
  inrPerUsd?: number;
}> = ({ children, inrPerUsd = FALLBACK_INR_PER_USD }) => {
  const [currency, setCurrencyState] = useState<Currency>(BILLING_CURRENCY);
  const [detectedRegion, setDetectedRegion] = useState<string>("US");

  // Adopts the stored preference and the locale-detected region once on mount. Both are
  // browser-only values that cannot exist during SSR, so the first render must be the
  // "USD" default and this reconciles afterwards - the one legitimate shape of
  // setState-in-effect, matching the `mounted` pattern used elsewhere in this app.
  useEffect(() => {
    let saved: Currency | null = null;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "USD" || raw === "INR") saved = raw;
    } catch {
      // Private-mode storage throws on read. Fall through to detection.
    }

    let isIndia = false;

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const lang = navigator.language || "";

      isIndia =
        tz.includes("Kolkata") ||
        tz.includes("Calcutta") ||
        tz.toLowerCase().includes("india") ||
        lang.toLowerCase().includes("-in");
    } catch {
      // Locale APIs unavailable - stay on the default.
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isIndia) setDetectedRegion("IN");

    // An explicit choice always outranks detection, so someone in India who switched
    // back to USD is not flipped to INR again on their next visit.
    if (saved) setCurrencyState(saved);
    else if (isIndia) setCurrencyState("INR");
  }, []);

  const setCurrency = useCallback((next: Currency) => {
    setCurrencyState(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The toggle still works for this session; it just will not be remembered.
    }
  }, []);

  const value = useMemo<CurrencyContextType>(
    () => ({
      currency,
      setCurrency,
      exchangeRate: inrPerUsd,
      detectedRegion,
      isConverted: currency !== BILLING_CURRENCY,
      formatPrice: (usdAmount, options) =>
        formatIn(currency, usdAmount, options?.showDecimal ?? true, inrPerUsd),
    }),
    [currency, setCurrency, detectedRegion, inrPerUsd],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => useContext(CurrencyContext);
