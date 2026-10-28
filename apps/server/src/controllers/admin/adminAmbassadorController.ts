import { adminHandler } from "#controllers/admin/adminRequestHandler";

import * as AdminAmbassadorService from "#services/admin/adminAmbassadorService";
import { ADMIN_AUDIT_ACTIONS } from "#services/admin/adminAuditService";

import { adminIdParamSchema } from "#validators/admin/adminCommonValidator";
import {
  adminAmbassadorListQuerySchema,
  adminAmbassadorReviewSchema,
  adminAmbassadorRosterQuerySchema,
} from "#validators/admin/adminAmbassadorValidator";

export const AdminAmbassadorController = {
  /** GET /admin/ambassadors/summary */
  summary: adminHandler(
    () => AdminAmbassadorService.getAmbassadorSummary(),
    "Ambassador summary fetched successfully",
  ),

  /** GET /admin/ambassadors — the application review queue. */
  list: adminHandler(async ({ req }) => {
    const query = adminAmbassadorListQuerySchema.parse(req.query);
    return AdminAmbassadorService.listApplications(query);
  }, "Ambassador applications fetched successfully"),

  /** GET /admin/ambassadors/roster — people currently holding the AMBASSADOR role. */
  roster: adminHandler(async ({ req }) => {
    const query = adminAmbassadorRosterQuerySchema.parse(req.query);
    return AdminAmbassadorService.listRoster(query);
  }, "Ambassador roster fetched successfully"),

  /** GET /admin/ambassadors/:id */
  detail: adminHandler(async ({ req }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    return AdminAmbassadorService.getApplicationDetail(id);
  }, "Ambassador application fetched successfully"),

  /**
   * PATCH /admin/ambassadors/:id — approve or reject.
   *
   * Approval also promotes the applicant to the AMBASSADOR role; the underlying service is
   * careful never to change a role it does not own (an ADMIN reviewing their own application
   * keeps ADMIN).
   */
  review: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminAmbassadorReviewSchema.parse(req.body);

    return AdminAmbassadorService.reviewApplication(id, input.action, actorId, input.reviewNote, {
      actorId,
      action:
        input.action === "APPROVE"
          ? ADMIN_AUDIT_ACTIONS.ambassadorApprove
          : ADMIN_AUDIT_ACTIONS.ambassadorReject,
      targetType: "AmbassadorApplication",
      targetId: id,
      // The internal reason stays in the audit log; the review note is what the applicant sees.
      reason: input.reason,
    });
  }, "Ambassador application reviewed successfully"),
};
