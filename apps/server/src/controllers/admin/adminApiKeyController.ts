import { adminHandler, deleteRequestInput } from "#controllers/admin/adminRequestHandler";

import * as AdminApiKeyService from "#services/admin/adminApiKeyService";
import { ADMIN_AUDIT_ACTIONS, recordAdminAudit } from "#services/admin/adminAuditService";

import { adminIdParamSchema } from "#validators/admin/adminCommonValidator";
import {
  adminApiKeyListQuerySchema,
  adminApiKeyRevokeSchema,
  adminApiKeyUpdateSchema,
} from "#validators/admin/adminApiKeyValidator";

export const AdminApiKeyController = {
  /** GET /admin/api-keys/summary */
  summary: adminHandler(
    () => AdminApiKeyService.getApiKeySummary(),
    "API key summary fetched successfully",
  ),

  /** GET /admin/api-keys — key metadata only; the secret is never readable here. */
  list: adminHandler(async ({ req }) => {
    const query = adminApiKeyListQuerySchema.parse(req.query);
    return AdminApiKeyService.listApiKeys(query);
  }, "API keys fetched successfully"),

  /** PATCH /admin/api-keys/:id — enable/disable or re-quota a key. */
  update: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminApiKeyUpdateSchema.parse(req.body);

    const { apiKey, previous } = await AdminApiKeyService.updateApiKey(id, input);

    await recordAdminAudit({
      actorId,
      action: ADMIN_AUDIT_ACTIONS.apiKeyUpdate,
      targetType: "ApiKey",
      targetId: id,
      reason: input.reason,
      metadata: {
        ownerId: previous.userId,
        previousIsActive: previous.isActive,
        previousRateLimit: previous.rateLimit,
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.rateLimit !== undefined ? { rateLimit: input.rateLimit } : {}),
      },
    });

    return apiKey;
  }, "API key updated successfully"),

  /** DELETE /admin/api-keys/:id — permanent revocation (the row is kept for the audit trail). */
  revoke: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminApiKeyRevokeSchema.parse(deleteRequestInput(req));

    const apiKey = await AdminApiKeyService.revokeApiKey(id, input.confirm);

    await recordAdminAudit({
      actorId,
      action: ADMIN_AUDIT_ACTIONS.apiKeyRevoke,
      targetType: "ApiKey",
      targetId: id,
      reason: input.reason,
      metadata: { ownerId: apiKey.user.id, name: apiKey.name },
    });

    return apiKey;
  }, "API key revoked successfully"),
};
