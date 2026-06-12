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
export type CatalogInterval = "seven_day" | "monthly" | "annual";

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
    prices: { monthly: 499, annual: 4_990 },
    creditAllowance: { monthly: 100, annual: 1_200 },
  },
  portfolio_pro: {
    name: "Portfolio Pro",
    entitlements: portfolioEntitlements,
    prices: { seven_day: 400, monthly: 999, annual: 9_990 },
  },
  bundle: {
    name: "VeriWorkly Bundle",
    entitlements: [ENTITLEMENT_KEYS.AI_CREDITS, ...portfolioEntitlements],
    prices: { monthly: 1_200, annual: 12_000 },
    creditAllowance: { monthly: 150, annual: 1_800 },
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
    return interval === "annual"
      ? config.dodo.bundleAnnualProductId
      : interval === "monthly"
        ? config.dodo.bundleMonthlyProductId
        : "";
  }

  if (interval === "seven_day") return config.dodo.sevenDayProductId;
  if (interval === "annual")
    return config.dodo.portfolioProAnnualProductId || config.dodo.annualProductId;

  return config.dodo.portfolioProMonthlyProductId || config.dodo.monthlyProductId;
}

export function getProductFromProviderId(productId: string) {
  for (const productKey of PRODUCT_KEYS) {
    for (const interval of ["seven_day", "monthly", "annual"] as const) {
      if (getProviderProductId(productKey, interval) === productId) return { productKey, interval };
    }
  }

  return null;
}

export function publicCatalog() {
  return PRODUCT_KEYS.map((key) => ({
    key,
    ...productCatalog[key],
    configuredIntervals: (["seven_day", "monthly", "annual"] as const).filter((interval) =>
      Boolean(getProviderProductId(key, interval)),
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
