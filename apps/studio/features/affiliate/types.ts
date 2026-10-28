import type { AffiliateStatus, AffiliateTier } from "@/features/admin/types/admin-types";

export type AffiliateDashboard = {
  affiliateStatus: AffiliateStatus;
  affiliateTier: AffiliateTier;
  affiliateCode: string | null;
  clicks: number;
  conversions: number;
  wallet: {
    pendingCents: number;
    availableCents: number;
    paidCents: number;
    /** Money owed back from a commission reversed after it was released (V-321). */
    clawbackCents?: number;
  };
  /**
   * What a withdrawal may request: the available balance less what is owed back (V-321). Absent
   * only from a dashboard cached before the server sent it; `withdrawableCents()` falls back.
   */
  withdrawableCents?: number;
  minimumWithdrawalCents: number;
  tierProgress: { currentConversions: number; nextTierConversions: number | null };
  tiers: Array<{
    key: string;
    name: string;
    rateBps: number;
    requiredConversions: number;
    perks: readonly string[];
  }>;
  // `totalReferrals` is the exact count and must be used for metrics/progress; `referrals` below
  // is a recency-limited (most recent 50) preview list for the activity feed only.
  totalReferrals: number;
  referrals: Array<{ id: string; status: string; createdAt: string; convertedAt: string | null }>;
  commissions: Array<{
    id: string;
    amountCents: number;
    /** ISO 4217; a commission keeps the currency of the purchase it came from. */
    currency: string;
    rateBps: number;
    status: string;
    createdAt: string;
  }>;
  withdrawals: Array<{
    id: string;
    amountCents: number;
    currency: string;
    status: string;
    createdAt: string;
    /** The admin's rejection reason or payout reference, written to be shown here. */
    payoutNote: string | null;
    reviewedAt?: string | null;
    paidAt?: string | null;
  }>;
};

export type LeaderboardEntry = {
  rank: number;
  earningsCents: number;
  commissions: number;
  user: {
    name: string | null;
    username: string | null;
    image: string | null;
    affiliateTier: string;
  } | null;
};

/**
 * What the affiliate can withdraw now: the server's `withdrawableCents`, or, from a dashboard
 * cached before it was sent, the available balance less any claw-back.
 */
export function withdrawableCents(
  dashboard: Pick<AffiliateDashboard, "wallet" | "withdrawableCents">,
) {
  return (
    dashboard.withdrawableCents ??
    Math.max(0, dashboard.wallet.availableCents - (dashboard.wallet.clawbackCents ?? 0))
  );
}
