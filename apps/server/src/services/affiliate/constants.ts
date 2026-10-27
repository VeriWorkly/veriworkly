export const AFFILIATE_TIER_RATE_BPS = { TIER_1: 200, TIER_2: 300, TIER_3: 500 } as const;

export const AFFILIATE_DASHBOARD_TTL_SECONDS = 60;
export const AFFILIATE_LEADERBOARD_TTL_SECONDS = 300;
export const AFFILIATE_MINIMUM_WITHDRAWAL_CENTS = 2_500;

// Dodo settles the account in USD and `AffiliateWallet` holds USD cents. A commission recorded in
// any other currency is kept PENDING with its own currency until an admin converts it (V-017).
export const AFFILIATE_WALLET_CURRENCY = "USD";

/**
 * Days after sign-up during which a referral code can still be applied (V-016), from
 * `AFFILIATE_ATTRIBUTION_DAYS`, default 30. The boot schema (`config/environmentSchema.ts`)
 * refuses a set value that is not an integer from 1 to 365, so the fallback only covers an unset
 * variable.
 */
export const AFFILIATE_ATTRIBUTION_DAYS = (() => {
  const parsed = Number.parseInt(process.env.AFFILIATE_ATTRIBUTION_DAYS ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 30;
})();

export const AFFILIATE_TIERS = [
  {
    key: "TIER_1",
    name: "Starter",
    rateBps: 200,
    requiredConversions: 0,
    perks: ["2% commission", "Monthly leaderboard access"],
  },
  {
    key: "TIER_2",
    name: "Growth",
    rateBps: 300,
    requiredConversions: 10,
    perks: ["3% commission", "Priority payout review"],
  },
  {
    key: "TIER_3",
    name: "Partner",
    rateBps: 500,
    requiredConversions: 50,
    perks: ["5% commission", "Priority support", "Partner campaigns"],
  },
] as const;

export type AffiliateTierKey = (typeof AFFILIATE_TIERS)[number]["key"];

/** Position in `AFFILIATE_TIERS`, lowest first: the order promotion moves in. */
export function affiliateTierRank(tier: AffiliateTierKey) {
  return AFFILIATE_TIERS.findIndex((entry) => entry.key === tier);
}

/** The highest tier `conversions` earns by the thresholds the studio and site advertise. */
export function tierEarnedBy(conversions: number): AffiliateTierKey {
  let earned: AffiliateTierKey = AFFILIATE_TIERS[0].key;
  for (const entry of AFFILIATE_TIERS)
    if (conversions >= entry.requiredConversions) earned = entry.key;
  return earned;
}

/** Conversions the tier above `tier` needs, or `null` at the top tier. */
export function nextTierConversions(tier: AffiliateTierKey): number | null {
  return AFFILIATE_TIERS[affiliateTierRank(tier) + 1]?.requiredConversions ?? null;
}
