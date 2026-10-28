import { adminHandler, deleteRequestInput } from "#controllers/admin/adminRequestHandler";

import * as AdminApiKeyService from "#services/admin/adminApiKeyService";

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

    // Audited in the update's transaction (V-291).
    return AdminApiKeyService.updateApiKey(id, input, { actorId, reason: input.reason });
  }, "API key updated successfully"),

  /** DELETE /admin/api-keys/:id — permanent revocation (the row is kept for the audit trail). */
  revoke: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminApiKeyRevokeSchema.parse(deleteRequestInput(req));

    return AdminApiKeyService.revokeApiKey(id, input.confirm, {
      actorId,
      reason: input.reason,
    });
  }, "API key revoked successfully"),
};
