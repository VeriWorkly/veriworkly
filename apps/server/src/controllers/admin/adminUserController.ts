import { adminHandler, deleteRequestInput } from "#controllers/admin/adminRequestHandler";

import * as AdminUserService from "#services/admin/adminUserService";
import { ADMIN_AUDIT_ACTIONS, recordAdminAudit } from "#services/admin/adminAuditService";

import { adminIdParamSchema } from "#validators/admin/adminCommonValidator";
import {
  adminUserDeleteSchema,
  adminUserListQuerySchema,
  adminUserSessionRevokeSchema,
  adminUserUpdateSchema,
} from "#validators/admin/adminUserValidator";

export const AdminUserController = {
  /** GET /admin/users — searchable, filterable roster. */
  list: adminHandler(async ({ req }) => {
    const query = adminUserListQuerySchema.parse(req.query);
    return AdminUserService.listUsers(query);
  }, "Users fetched successfully"),

  /** GET /admin/users/:id — full account view used by the support workflow. */
  detail: adminHandler(async ({ req }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    return AdminUserService.getUserDetail(id);
  }, "User fetched successfully"),

  /** PATCH /admin/users/:id — profile fields and role. */
  update: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminUserUpdateSchema.parse(req.body);

    // The audit entry (user.update or user.role.change) is written by the service, in the
    // same transaction as the update.
    const { user, roleChanged } = await AdminUserService.updateUser(id, input, {
      actorId,
      reason: input.reason,
    });

    // A role change that leaves live sessions in place lets the user keep their old
    // privileges until every cached session expires.
    if (roleChanged) await AdminUserService.revokeUserSessions(id);

    return user;
  }, "User updated successfully"),

  /** POST /admin/users/:id/revoke-sessions — force sign-out everywhere. */
  revokeSessions: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminUserSessionRevokeSchema.parse(req.body);

    const result = await AdminUserService.revokeUserSessions(id);

    await recordAdminAudit({
      actorId,
      action: ADMIN_AUDIT_ACTIONS.userSessionsRevoke,
      targetType: "User",
      targetId: id,
      reason: input.reason,
      metadata: { revoked: result.revoked },
    });

    return result;
  }, "Sessions revoked successfully"),

  /** DELETE /admin/users/:id — permanent, cascading account deletion. */
  remove: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminUserDeleteSchema.parse(deleteRequestInput(req));

    // Audited inside the delete's transaction: the record exists exactly when the deletion
    // happened, never for a refused one and never missing for a committed one.
    return AdminUserService.deleteUser(id, input.confirmEmail, {
      actorId,
      action: ADMIN_AUDIT_ACTIONS.userDelete,
      targetType: "User",
      targetId: id,
      // No confirmEmail (V-231): the audit log outlives the account, its address must not.
      reason: input.reason,
    });
  }, "User deleted successfully"),
};
