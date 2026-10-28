import { adminHandler } from "#controllers/admin/adminRequestHandler";

import * as AdminAffiliateService from "#services/admin/adminAffiliateService";
import { ADMIN_AUDIT_ACTIONS } from "#services/admin/adminAuditService";

import { adminIdParamSchema } from "#validators/admin/adminCommonValidator";
import {
  adminAffiliateListQuerySchema,
  adminAffiliateSchema,
  adminCommissionListQuerySchema,
  adminCommissionSchema,
  adminCommissionStatusSchema,
  adminReferralListQuerySchema,
  adminWithdrawalListQuerySchema,
  adminWithdrawalStatusSchema,
} from "#validators/admin/adminAffiliateValidator";

/**
 * Every mutation here moves affiliate money or the rate it accrues at, so each one hands its
 * audit entry to the service, which writes it in the same transaction as the change (V-074).
 */
export const AdminAffiliateController = {
  /** GET /admin/affiliates/summary — program-wide totals for the page header. */
  summary: adminHandler(
    () => AdminAffiliateService.getAffiliateSummary(),
    "Affiliate summary fetched successfully",
  ),

  /** GET /admin/affiliates */
  list: adminHandler(async ({ req }) => {
    const query = adminAffiliateListQuerySchema.parse(req.query);
    return AdminAffiliateService.listAffiliates(query);
  }, "Affiliates fetched successfully"),

  /** GET /admin/affiliates/referrals */
  listReferrals: adminHandler(async ({ req }) => {
    const query = adminReferralListQuerySchema.parse(req.query);
    return AdminAffiliateService.listReferrals(query);
  }, "Referrals fetched successfully"),

  /** GET /admin/affiliates/commissions */
  listCommissions: adminHandler(async ({ req }) => {
    const query = adminCommissionListQuerySchema.parse(req.query);
    return AdminAffiliateService.listCommissions(query);
  }, "Commissions fetched successfully"),

  /** POST /admin/affiliates/commissions — manual commission for an out-of-band payment. */
  createCommission: adminHandler(async ({ req, actorId }) => {
    const input = adminCommissionSchema.parse(req.body);

    return AdminAffiliateService.createCommission(input, {
      actorId,
      action: ADMIN_AUDIT_ACTIONS.affiliateCommissionCreate,
      targetType: "AffiliateCommission",
      reason: input.reason,
      metadata: {
        referredUserId: input.referredUserId,
        purchaseAmountCents: input.purchaseAmountCents,
      },
    });
  }, "Commission created successfully"),

  /** PATCH /admin/affiliates/commissions/:id — release or reverse a pending commission. */
  updateCommission: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminCommissionStatusSchema.parse(req.body);

    return AdminAffiliateService.updateCommission(id, input.status, input.reason, {
      actorId,
      action: ADMIN_AUDIT_ACTIONS.affiliateCommissionUpdate,
      targetType: "AffiliateCommission",
      targetId: id,
      reason: input.reason,
    });
  }, "Commission updated successfully"),

  /** GET /admin/affiliates/withdrawals */
  listWithdrawals: adminHandler(async ({ req }) => {
    const query = adminWithdrawalListQuerySchema.parse(req.query);
    return AdminAffiliateService.listWithdrawals(query);
  }, "Withdrawals fetched successfully"),

  /**
   * PATCH /admin/affiliates/withdrawals/:id — approve, reject or mark a payout paid.
   *
   * The money itself moves out of band (see the note in the affiliate wallet service), so this
   * records the decision and the reviewer rather than initiating a transfer.
   */
  updateWithdrawal: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminWithdrawalStatusSchema.parse(req.body);

    return AdminAffiliateService.updateWithdrawal(id, input.status, input.payoutNote, actorId, {
      actorId,
      action: ADMIN_AUDIT_ACTIONS.affiliateWithdrawalUpdate,
      targetType: "AffiliateWithdrawal",
      targetId: id,
      // The internal reason stays in the audit log; the payout note is what the affiliate sees.
      reason: input.reason ?? input.payoutNote,
    });
  }, "Withdrawal updated successfully"),

  /** GET /admin/affiliates/:id — one affiliate's referrals, commissions and payout history. */
  detail: adminHandler(async ({ req }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    return AdminAffiliateService.getAffiliateDetail(id);
  }, "Affiliate fetched successfully"),

  /** PATCH /admin/affiliates/:id — change program standing (status) or commission tier. */
  update: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminAffiliateSchema.parse(req.body);

    const { affiliate } = await AdminAffiliateService.updateAffiliateStanding(id, input, {
      actorId,
      action: ADMIN_AUDIT_ACTIONS.affiliateUpdate,
      targetType: "User",
      targetId: id,
      reason: input.reason,
      metadata: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.tier ? { tier: input.tier } : {}),
      },
    });

    return affiliate;
  }, "Affiliate updated successfully"),
};
