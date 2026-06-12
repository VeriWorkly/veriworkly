export type BillingSummary = {
  plan: "FREE" | "AI_CREDITS" | "PORTFOLIO_PRO" | "BUNDLE";
  productKey: ProductKey | null;
  activeProductKeys: ProductKey[];
  status: string;
  interval: "SEVEN_DAY" | "MONTHLY" | "ANNUAL" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  graceEndsAt: string | null;
  canPublish: boolean;
  eligibleForTrial: boolean;
  entitlements: string[];
  credits: {
    balance: number;
    lifetimeCredited: number;
    lifetimeDebited: number;
    nextExpiryAt: string | null;
    nextExpiryCredits: number;
  };
  catalog: CatalogProduct[];
  addOns: Array<{ key: string; name: string }>;
  creditEconomics: {
    actions: Record<
      string,
      {
        costs: { standard: number; expert: number };
      }
    >;
    packs: Array<{
      key: "credit_pack_100";
      name: string;
      credits: number;
      expiresInDays: number;
      configured: boolean;
    }>;
  };
};

export type ProductKey = "ai_credits" | "portfolio_pro" | "bundle";
export type BillingCycle = "monthly" | "annual";
export type CatalogProduct = {
  key: ProductKey;
  name: string;
  entitlements: string[];
  prices: Partial<Record<"seven_day" | BillingCycle, number>>;
  configuredIntervals: Array<"seven_day" | BillingCycle>;
  currency: "USD";
  recommended?: boolean;
};
export type BillingActivity = {
  id: string;
  type: string;
  processedAt: string | null;
  createdAt: string;
};
