import { adminHandler, deleteRequestInput } from "#controllers/admin/adminRequestHandler";

import * as AdminBillingService from "#services/admin/adminBillingService";
import { ADMIN_AUDIT_ACTIONS } from "#services/admin/adminAuditService";

import { adminIdParamSchema } from "#validators/admin/adminCommonValidator";
import {
  adminCreditAdjustmentSchema,
  adminCreditWalletListQuerySchema,
  adminEntitlementListQuerySchema,
  adminEntitlementRevokeSchema,
  adminEntitlementSchema,
  adminSubscriptionListQuerySchema,
  adminSubscriptionUpdateSchema,
  adminWebhookListQuerySchema,
  adminWebhookReplaySchema,
} from "#validators/admin/adminBillingValidator";

export const AdminBillingController = {
  /** GET /admin/billing/summary — MRR-adjacent counters, credit float and webhook health. */
  summary: adminHandler(
    () => AdminBillingService.getBillingSummary(),
    "Billing summary fetched successfully",
  ),

  /** GET /admin/billing/subscriptions */
  listSubscriptions: adminHandler(async ({ req }) => {
    const query = adminSubscriptionListQuerySchema.parse(req.query);
    return AdminBillingService.listSubscriptions(query);
  }, "Subscriptions fetched successfully"),

  /**
   * PATCH /admin/billing/subscriptions/:id — support override for an account whose webhook
   * was lost. `cancelAtPeriodEnd` is changed at Dodo first and a provider failure is a 502 with
   * nothing written (V-169); a status edit grants or revokes the plan's entitlements with it
   * (V-170). The audit entry is written in the service, in the same transaction as the edit
   * (V-074).
   */
  updateSubscription: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminSubscriptionUpdateSchema.parse(req.body);

    const { subscription } = await AdminBillingService.updateSubscription(id, input, {
      actorId,
      action: ADMIN_AUDIT_ACTIONS.subscriptionUpdate,
      targetType: "Subscription",
      targetId: id,
      reason: input.reason,
      metadata: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.cancelAtPeriodEnd !== undefined
          ? { cancelAtPeriodEnd: input.cancelAtPeriodEnd }
          : {}),
      },
    });

    return subscription;
  }, "Subscription updated successfully"),

  /** GET /admin/billing/credits — wallet balances across accounts. */
  listWallets: adminHandler(async ({ req }) => {
    const query = adminCreditWalletListQuerySchema.parse(req.query);
    return AdminBillingService.listCreditWallets(query);
  }, "Credit wallets fetched successfully"),

  /**
   * POST /admin/billing/credits — grant (positive) or claw back (negative) credits. An
   * `Idempotency-Key` header (or `idempotencyKey` in the body) makes a retried submit return the
   * original adjustment instead of making a second one; without a key, an identical adjustment
   * within about 10 seconds is treated as a double submit and replays too. The audit entry
   * commits with the ledger rows and a replay writes none.
   */
  adjustCredits: adminHandler(async ({ req, actorId }) => {
    const input = adminCreditAdjustmentSchema.parse(req.body);
    const idempotencyKey =
      req.get("Idempotency-Key")?.trim().slice(0, 128) || input.idempotencyKey || undefined;

    const { transaction, replayed } = await AdminBillingService.adjustCredits(
      input.userId,
      input.amount,
      input.reason,
      {
        actorId,
        idempotencyKey,
        kind: input.kind,
        customerNote: input.customerNote,
        audit: {
          actorId,
          action: ADMIN_AUDIT_ACTIONS.creditGrant,
          targetType: "User",
          targetId: input.userId,
          reason: input.reason,
          metadata: { kind: input.kind, customerNote: input.customerNote ?? null },
        },
      },
    );

    // `replayed` tells the console a double submit changed nothing (no second grant, no audit).
    return { ...transaction, replayed };
  }, "Credits adjusted successfully"),

  /** GET /admin/billing/entitlements */
  listEntitlements: adminHandler(async ({ req }) => {
    const query = adminEntitlementListQuerySchema.parse(req.query);
    return AdminBillingService.listEntitlements(query);
  }, "Entitlements fetched successfully"),

  /** POST /admin/billing/entitlements — manual grant, optionally time-boxed. */
  grantEntitlement: adminHandler(async ({ req, actorId }) => {
    const input = adminEntitlementSchema.parse(req.body);

    return AdminBillingService.grantEntitlement({
      ...input,
      actorId,
      audit: {
        actorId,
        action: ADMIN_AUDIT_ACTIONS.entitlementGrant,
        targetType: "User",
        targetId: input.userId,
        reason: input.reason,
        metadata: { key: input.key, endsAt: input.endsAt ?? null },
      },
    });
  }, "Entitlement granted successfully"),

  /** DELETE /admin/billing/entitlements/:id */
  revokeEntitlement: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminEntitlementRevokeSchema.parse(deleteRequestInput(req));

    return AdminBillingService.revokeEntitlement(id, input.reason, actorId, {
      actorId,
      action: ADMIN_AUDIT_ACTIONS.entitlementRevoke,
      targetType: "EntitlementGrant",
      targetId: id,
      reason: input.reason,
    });
  }, "Entitlement revoked successfully"),

  /** GET /admin/billing/webhooks — the provider event log, newest first. */
  listWebhooks: adminHandler(async ({ req }) => {
    const query = adminWebhookListQuerySchema.parse(req.query);
    return AdminBillingService.listWebhookEvents(query);
  }, "Webhook events fetched successfully"),

  /** GET /admin/billing/webhooks/:id — includes the raw provider payload. */
  webhookDetail: adminHandler(async ({ req }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    return AdminBillingService.getWebhookEvent(id);
  }, "Webhook event fetched successfully"),

  /** POST /admin/billing/webhooks/:id/replay — recovery path for a transiently failed event. */
  replayWebhook: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminWebhookReplaySchema.parse(req.body);

    // Audited before it runs, and refused if the entry cannot be written (V-291).
    return AdminBillingService.replayWebhookEvent(id, {
      actorId,
      action: ADMIN_AUDIT_ACTIONS.webhookReplay,
      targetType: "BillingWebhookEvent",
      targetId: id,
      reason: input.reason,
    });
  }, "Webhook event replayed successfully"),
};
