export type AffiliateDashboard = {
  affiliateStatus: "NOT_ENROLLED" | "PENDING" | "ACTIVE" | "SUSPENDED";
  affiliateTier: "TIER_1" | "TIER_2" | "TIER_3";
  affiliateCode: string | null;
  clicks: number;
  conversions: number;
  wallet: { pendingCents: number; availableCents: number; paidCents: number };
  minimumWithdrawalCents: number;
  tierProgress: { currentConversions: number; nextTierConversions: number | null };
  tiers: Array<{ key: string; name: string; rateBps: number; requiredConversions: number; perks: readonly string[] }>;
  referrals: Array<{ id: string; status: string; createdAt: string; convertedAt: string | null }>;
  commissions: Array<{ id: string; amountCents: number; rateBps: number; status: string; createdAt: string }>;
  withdrawals: Array<{ id: string; amountCents: number; status: string; createdAt: string; payoutNote: string | null }>;
};

export type LeaderboardEntry = {
  rank: number;
  earningsCents: number;
  commissions: number;
  user: { name: string | null; username: string | null; image: string | null; affiliateTier: string } | null;
};
