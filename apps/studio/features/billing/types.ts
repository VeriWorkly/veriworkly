import type { CreditWallet } from "@/features/credits/types";

/** The server catalog's one-time packs (`productCatalog.ts`); the server sets names and prices. */
export type CreditPackKey = "credit_pack_250" | "credit_pack_500" | "credit_pack_1200";

export type BillingSummary = {
  plan: "FREE" | "AI_CREDITS" | "PORTFOLIO_PRO" | "BUNDLE";
  productKey: ProductKey | null;
  activeProductKeys: ProductKey[];
  status: string;
  interval: "ONE_DAY" | "SEVEN_DAY" | "MONTHLY" | "ANNUAL" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  graceEndsAt: string | null;
  canPublish: boolean;
  entitlements: string[];
  /**
   * What the customer is paying for, from the grants in effect and the credit wallet. `plan`
   * and `status` describe only entitlements and the latest subscription row, so a pass or
   * credit-pack buyer reads FREE / INACTIVE there; this is what the account actually has.
   */
  access: {
    tier: "free" | "credits" | "pass" | "ai_credits" | "portfolio_pro" | "bundle";
    isPaying: boolean;
    /** A subscription is in dunning because a payment failed; false for a pause, which owes nothing. */
    paymentIssue: boolean;
    passEndsAt: string | null;
    portfolioAccessEndsAt: string | null;
    aiCreditsEndsAt: string | null;
    creditBalance: number;
  };
  /** A billing customer exists, so the portal (receipts for every purchase) opens (S-330). */
  hasBillingAccount: boolean;
  /** The subscription in dunning is paused, which owes nothing, not failed (S-387). */
  subscriptionPaused: boolean;
  credits: CreditWallet;
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
      key: CreditPackKey;
      name: string;
      credits: number;
      /** USD cents, for display; the charge is the provider product's. */
      price: number;
      currency: string;
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
  prices: Partial<Record<"one_day" | "seven_day" | BillingCycle, number>>;
  configuredIntervals: Array<"one_day" | "seven_day" | BillingCycle>;
  currency: "USD";
  recommended?: boolean;
  /** How a plan delivers its credits, per interval, worded by the server for display. */
  creditNotes?: Partial<Record<"one_day" | "seven_day" | BillingCycle, string>>;
};
export type BillingActivity = {
  id: string;
  type: string;
  processedAt: string | null;
  createdAt: string;
  /** What the event was for ("Creator Pro (monthly)", a pack name); `null` when unknown. */
  productName: string | null;
  /** In the smallest unit of `currency`. */
  amountCents: number | null;
  currency: string | null;
};

export type PlanChangePreview = {
  productKey: ProductKey;
  interval: BillingCycle;
  /** In the smallest unit of `currency`, charged when the change is confirmed. */
  dueNow: number;
  currency: string;
  nextAmount: number;
  nextBillingDate: string;
};

export type PlanChangeResult = {
  status: "pending";
  productKey: ProductKey;
  interval: BillingCycle;
  paymentId: string | null;
  confirmed: boolean;
  replayed: boolean;
};
