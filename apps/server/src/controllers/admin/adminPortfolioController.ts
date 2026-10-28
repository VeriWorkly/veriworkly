import { adminHandler, deleteRequestInput } from "#controllers/admin/adminRequestHandler";

import * as AdminPortfolioService from "#services/admin/adminPortfolioService";
import { ADMIN_AUDIT_ACTIONS } from "#services/admin/adminAuditService";

import { adminIdParamSchema } from "#validators/admin/adminCommonValidator";
import {
  adminPortfolioAssetListQuerySchema,
  adminPortfolioListQuerySchema,
  adminPortfolioStatusSchema,
  adminPortfolioUnpublishSchema,
  adminPortfolioViewsQuerySchema,
} from "#validators/admin/adminPortfolioValidator";

export const AdminPortfolioController = {
  /** GET /admin/portfolios/summary */
  summary: adminHandler(
    () => AdminPortfolioService.getPortfolioSummary(),
    "Portfolio summary fetched successfully",
  ),

  /** GET /admin/portfolios — every published portfolio with owner and lifetime views. */
  list: adminHandler(async ({ req }) => {
    const query = adminPortfolioListQuerySchema.parse(req.query);
    return AdminPortfolioService.listPublications(query);
  }, "Portfolios fetched successfully"),

  /** GET /admin/portfolios/assets — uploaded avatars, covers and social images. */
  listAssets: adminHandler(async ({ req }) => {
    const query = adminPortfolioAssetListQuerySchema.parse(req.query);
    return AdminPortfolioService.listAssets(query);
  }, "Portfolio assets fetched successfully"),

  /** GET /admin/portfolios/:id — publication detail with a daily view series. */
  detail: adminHandler(async ({ req }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const { days } = adminPortfolioViewsQuerySchema.parse(req.query);

    return AdminPortfolioService.getPublicationDetail(id, days);
  }, "Portfolio fetched successfully"),

  /**
   * PATCH /admin/portfolios/:id — moderation. Suspending takes the site off the public
   * internet immediately (Redis, the public list and the portfolio app's ISR cache are all
   * invalidated by the service).
   */
  updateStatus: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminPortfolioStatusSchema.parse(req.body);

    // The audit entry is written by the service, in the same transaction as the status change.
    const { publication } = await AdminPortfolioService.updatePublicationStatus(
      id,
      input.status,
      input.reason,
      {
        actorId,
        action: ADMIN_AUDIT_ACTIONS.portfolioStatusChange,
        targetType: "PortfolioPublication",
        targetId: id,
        reason: input.reason,
      },
    );

    return publication;
  }, "Portfolio status updated successfully"),

  /** DELETE /admin/portfolios/:id — hard takedown; the row and the subdomain stay the owner's. */
  unpublish: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminPortfolioUnpublishSchema.parse(deleteRequestInput(req));

    return AdminPortfolioService.forceUnpublish(
      id,
      {
        actorId,
        action: ADMIN_AUDIT_ACTIONS.portfolioUnpublish,
        targetType: "PortfolioPublication",
        targetId: id,
        reason: input.reason,
      },
      input.confirm,
    );
  }, "Portfolio unpublished successfully"),
};
