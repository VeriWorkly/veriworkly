export const AFFILIATE_TIER_RATE_BPS = { TIER_1: 200, TIER_2: 300, TIER_3: 500 } as const;

export const AFFILIATE_DASHBOARD_TTL_SECONDS = 60;
export const AFFILIATE_LEADERBOARD_TTL_SECONDS = 300;
export const AFFILIATE_MINIMUM_WITHDRAWAL_CENTS = 2_500;

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
