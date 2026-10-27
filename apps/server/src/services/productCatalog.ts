import { config } from "#config";
import { publicAiActionPolicy } from "#services/aiPolicy";
import { CREDIT_PACK_NAMES, PRODUCT_NAMES } from "#services/productNames";

export const PRODUCT_KEYS = ["ai_credits", "portfolio_pro", "bundle"] as const;
export type ProductKey = (typeof PRODUCT_KEYS)[number];

export const ENTITLEMENT_KEYS = {
  AI_CREDITS: "ai_credits",
  PORTFOLIO_PUBLISH: "portfolio_publish",
  SEO_CONTROLS: "seo_controls",
  ANALYTICS: "analytics",
  WATERMARK_REMOVAL: "watermark_removal",
} as const;

export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[keyof typeof ENTITLEMENT_KEYS];
export const CATALOG_INTERVALS = ["one_day", "seven_day", "monthly", "annual"] as const;
export type CatalogInterval = (typeof CATALOG_INTERVALS)[number];

export function isCatalogInterval(value: string): value is CatalogInterval {
  return CATALOG_INTERVALS.includes(value as CatalogInterval);
}

/**
 * `price` is what the pack sells for, in USD cents, for display (the studio's buy button, the
 * public pricing page). It comes from `CREDIT_PACK_250_PRICE_CENTS` / `CREDIT_PACK_500_PRICE_CENTS` /
 * `CREDIT_PACK_1200_PRICE_CENTS` (defaults 299 / 499 / 999); the amount charged is the Dodo
 * product's, so keep the two in step.
 */
export const creditPackCatalog = {
  credit_pack_250: {
    name: CREDIT_PACK_NAMES.credit_pack_250,
    credits: 250,
    expiresInDays: 90,
    get price() {
      return config.dodo.creditPack250PriceCents;
    },
    providerProductId: () => config.dodo.creditPack250ProductId,
  },
  credit_pack_500: {
    name: CREDIT_PACK_NAMES.credit_pack_500,
    credits: 500,
    expiresInDays: 90,
    get price() {
      return config.dodo.creditPack500PriceCents;
    },
    providerProductId: () => config.dodo.creditPack500ProductId,
  },
  credit_pack_1200: {
    name: CREDIT_PACK_NAMES.credit_pack_1200,
    credits: 1200,
    expiresInDays: 90,
    get price() {
      return config.dodo.creditPack1200PriceCents;
    },
    providerProductId: () => config.dodo.creditPack1200ProductId,
  },
} as const;

export type CreditPackKey = keyof typeof creditPackCatalog;

export function isCreditPackKey(value: string): value is CreditPackKey {
  // Own keys only: `in` would also accept prototype names such as "constructor" (V-152).
  return Object.hasOwn(creditPackCatalog, value);
}

/**
 * Subscription credits reset monthly and nothing rolls over: monthly and annual plans both grant
 * 1,000 credits each month, and whatever is unused expires at the end of that month when the next
 * 1,000 replaces it. Annual plans deliver theirs month by month (owner decision 4):
 * `creditAllowance.annual` is the year's total, granted as `ANNUAL_MONTHLY_CREDITS` at the start of
 * each of the twelve months (`services/annualCreditService`). Credit packs are separate: their
 * credits keep their own 90-day validity and are never reset.
 */
export const ANNUAL_MONTHLY_CREDITS = 1_000;
export const ANNUAL_CREDIT_MONTHS = 12;
const MONTHLY_CREDIT_NOTE =
  "1,000 credits each month. Credits reset monthly: unused credits expire at the end of the month and do not roll over.";
const ANNUAL_CREDIT_NOTE =
  "1,000 credits each month for 12 months. Credits reset monthly: unused credits expire at the end of the month and do not roll over.";

const portfolioEntitlements: EntitlementKey[] = [
  ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH,
  ENTITLEMENT_KEYS.SEO_CONTROLS,
  ENTITLEMENT_KEYS.ANALYTICS,
  ENTITLEMENT_KEYS.WATERMARK_REMOVAL,
];

export const productCatalog: Record<
  ProductKey,
  {
    name: string;
    entitlements: EntitlementKey[];
    prices: Partial<Record<CatalogInterval, number>>;
    recommended?: boolean;
    creditAllowance?: Partial<Record<CatalogInterval, number>>;
    /** How the allowance is delivered, per interval, in words a pricing page can show. */
    creditNotes?: Partial<Record<CatalogInterval, string>>;
  }
> = {
  ai_credits: {
    name: PRODUCT_NAMES.ai_credits,
    entitlements: [ENTITLEMENT_KEYS.AI_CREDITS],
    prices: { monthly: 599, annual: 5_988 },
    creditAllowance: { monthly: 1_000, annual: ANNUAL_MONTHLY_CREDITS * ANNUAL_CREDIT_MONTHS },
    creditNotes: { monthly: MONTHLY_CREDIT_NOTE, annual: ANNUAL_CREDIT_NOTE },
  },
  portfolio_pro: {
    name: PRODUCT_NAMES.portfolio_pro,
    entitlements: portfolioEntitlements,
    prices: { monthly: 999, annual: 9_588 },
  },
  bundle: {
    name: PRODUCT_NAMES.bundle,
    entitlements: [ENTITLEMENT_KEYS.AI_CREDITS, ...portfolioEntitlements],
    prices: { one_day: 299, seven_day: 599, monthly: 1_499, annual: 14_388 },
    creditAllowance: {
      one_day: 150,
      seven_day: 400,
      monthly: 1_000,
      annual: ANNUAL_MONTHLY_CREDITS * ANNUAL_CREDIT_MONTHS,
    },
    creditNotes: { monthly: MONTHLY_CREDIT_NOTE, annual: ANNUAL_CREDIT_NOTE },
    recommended: true,
  },
};

export function isProductKey(value: string): value is ProductKey {
  return PRODUCT_KEYS.includes(value as ProductKey);
}

export function getProviderProductId(productKey: ProductKey, interval: CatalogInterval) {
  if (productKey === "ai_credits") {
    return interval === "annual"
      ? config.dodo.aiCreditsAnnualProductId
      : interval === "monthly"
        ? config.dodo.aiCreditsMonthlyProductId
        : "";
  }

  if (productKey === "bundle") {
    if (interval === "one_day") return config.dodo.bundleOneDayProductId;
    if (interval === "seven_day") return config.dodo.bundleSevenDayProductId;
    if (interval === "annual") return config.dodo.bundleAnnualProductId;
    return config.dodo.bundleMonthlyProductId;
  }

  if (interval === "one_day" || interval === "seven_day") return "";
  if (interval === "annual") return config.dodo.portfolioProAnnualProductId;

  return config.dodo.portfolioProMonthlyProductId;
}

export function getProductFromProviderId(productId: string) {
  for (const productKey of PRODUCT_KEYS) {
    for (const interval of ["one_day", "seven_day", "monthly", "annual"] as const) {
      if (getProviderProductId(productKey, interval) === productId) return { productKey, interval };
    }
  }

  return null;
}

export function publicCatalog() {
  return PRODUCT_KEYS.map((key) => ({
    key,
    ...productCatalog[key],
    configuredIntervals: (["one_day", "seven_day", "monthly", "annual"] as const).filter(
      (interval) => Boolean(getProviderProductId(key, interval)),
    ),
    currency: "USD",
  }));
}

export function publicCreditEconomics() {
  let actions: ReturnType<typeof publicAiActionPolicy> | Record<string, never> = {};
  try {
    actions = publicAiActionPolicy();
  } catch {
    // Billing remains available when AI runtime policy has not been mounted yet.
  }

  return {
    actions,
    packs: Object.entries(creditPackCatalog).map(([key, pack]) => ({
      key,
      name: pack.name,
      credits: pack.credits,
      price: pack.price,
      currency: "USD",
      expiresInDays: pack.expiresInDays,
      configured: Boolean(pack.providerProductId()),
    })),
  };
}

/** The credit pack a provider product id is configured as, or null (V-274). */
export function creditPackForProductId(productId: string): CreditPackKey | null {
  for (const key of Object.keys(creditPackCatalog) as CreditPackKey[])
    if (creditPackCatalog[key].providerProductId() === productId) return key;
  return null;
}
