import { config } from "#config";
import { publicAiActionPolicy } from "#services/aiPolicy";

export const PRODUCT_KEYS = ["ai_credits", "portfolio_pro", "bundle"] as const;
export type ProductKey = (typeof PRODUCT_KEYS)[number];

export const ENTITLEMENT_KEYS = {
  AI_CREDITS: "ai_credits",
  PORTFOLIO_PUBLISH: "portfolio_publish",
  CUSTOM_SUBDOMAIN: "custom_subdomain",
  SEO_CONTROLS: "seo_controls",
  ANALYTICS: "analytics",
  WATERMARK_REMOVAL: "watermark_removal",
} as const;

export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[keyof typeof ENTITLEMENT_KEYS];
export type CatalogInterval = "one_day" | "seven_day" | "monthly" | "annual";

export const creditPackCatalog = {
  credit_pack_100: {
    name: "100 extra credits",
    credits: 100,
    expiresInDays: 365,
    providerProductId: () => config.dodo.creditPack100ProductId,
  },
} as const;

export type CreditPackKey = keyof typeof creditPackCatalog;

const portfolioEntitlements: EntitlementKey[] = [
  ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH,
  ENTITLEMENT_KEYS.CUSTOM_SUBDOMAIN,
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
  }
> = {
  ai_credits: {
    name: "AI Credits",
    entitlements: [ENTITLEMENT_KEYS.AI_CREDITS],
    prices: { monthly: 599, annual: 5_990 },
    creditAllowance: { monthly: 1_000, annual: 12_000 },
  },
  portfolio_pro: {
    name: "Creator Pro",
    entitlements: portfolioEntitlements,
    prices: { monthly: 999, annual: 9_588 },
  },
  bundle: {
    name: "Job Hunter Bundle",
    entitlements: [ENTITLEMENT_KEYS.AI_CREDITS, ...portfolioEntitlements],
    prices: { one_day: 299, seven_day: 599, monthly: 1_499, annual: 14_388 },
    creditAllowance: { one_day: 150, seven_day: 400, monthly: 1_000, annual: 12_000 },
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

  if (interval === "one_day") return "";
  if (interval === "seven_day") return config.dodo.portfolioProSevenDayProductId;
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
      expiresInDays: pack.expiresInDays,
      configured: Boolean(pack.providerProductId()),
    })),
  };
}
