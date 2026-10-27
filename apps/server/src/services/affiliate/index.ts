import {
  createCommission,
  reverseCommissionForPayment,
  updateCommission,
} from "#services/affiliate/commissions";
import { getDashboard } from "#services/affiliate/dashboard";
import { applyReferral, enroll, trackClick } from "#services/affiliate/enrollment";
import { leaderboard } from "#services/affiliate/leaderboard";
import { requestWithdrawal, updateWithdrawal } from "#services/affiliate/wallet";

export const AffiliateService = {
  enroll,
  trackClick,
  applyReferral,
  getDashboard,
  leaderboard,
  requestWithdrawal,
  updateWithdrawal,
  createCommission,
  updateCommission,
  reverseCommissionForPayment,
};

export * from "#services/affiliate/constants";
