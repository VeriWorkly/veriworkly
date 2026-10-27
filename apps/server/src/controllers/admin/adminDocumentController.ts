import { adminHandler, deleteRequestInput } from "#controllers/admin/adminRequestHandler";

import * as AdminDocumentService from "#services/admin/adminDocumentService";
import { ADMIN_AUDIT_ACTIONS, recordAdminAudit } from "#services/admin/adminAuditService";

import { adminIdParamSchema } from "#validators/admin/adminCommonValidator";
import {
  adminDocumentDeleteSchema,
  adminDocumentListQuerySchema,
  adminDocumentVisibilitySchema,
  adminShareLinkListQuerySchema,
  adminShareLinkRevokeSchema,
} from "#validators/admin/adminDocumentValidator";

export const AdminDocumentController = {
  /** GET /admin/documents/summary */
  summary: adminHandler(
    () => AdminDocumentService.getDocumentSummary(),
    "Document summary fetched successfully",
  ),

  /** GET /admin/documents */
  list: adminHandler(async ({ req }) => {
    const query = adminDocumentListQuerySchema.parse(req.query);
    return AdminDocumentService.listDocuments(query);
  }, "Documents fetched successfully"),

  /** GET /admin/documents/:id — metadata and share links, never the résumé content itself. */
  detail: adminHandler(async ({ req }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    return AdminDocumentService.getDocumentDetail(id);
  }, "Document fetched successfully"),

  /** PATCH /admin/documents/:id — pull a document back to private or unlisted. */
  updateVisibility: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminDocumentVisibilitySchema.parse(req.body);

    // The audit entry is written by the service, in the same transaction as the change.
    const { document } = await AdminDocumentService.updateDocumentVisibility(id, input.visibility, {
      actorId,
      action: ADMIN_AUDIT_ACTIONS.documentVisibility,
      targetType: "Document",
      targetId: id,
      reason: input.reason,
    });

    return document;
  }, "Document visibility updated successfully"),

  /** DELETE /admin/documents/:id — soft delete, reversible via the restore endpoint. */
  remove: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminDocumentDeleteSchema.parse(deleteRequestInput(req));

    // The audit entry commits with the change (V-249).
    return AdminDocumentService.softDeleteDocument(id, {
      actorId,
      action: ADMIN_AUDIT_ACTIONS.documentDelete,
      targetType: "Document",
      targetId: id,
      reason: input.reason,
    });
  }, "Document deleted successfully"),

  /** POST /admin/documents/:id/restore */
  restore: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminDocumentDeleteSchema.parse(req.body);

    return AdminDocumentService.restoreDocument(id, {
      actorId,
      action: ADMIN_AUDIT_ACTIONS.documentRestore,
      targetType: "Document",
      targetId: id,
      reason: input.reason,
    });
  }, "Document restored successfully"),
};

export const AdminShareLinkController = {
  /** GET /admin/share-links */
  list: adminHandler(async ({ req }) => {
    const query = adminShareLinkListQuerySchema.parse(req.query);
    return AdminDocumentService.listShareLinks(query);
  }, "Share links fetched successfully"),

  /** DELETE /admin/share-links/:id — kills a public URL immediately. */
  revoke: adminHandler(async ({ req, actorId }) => {
    const { id } = adminIdParamSchema.parse(req.params);
    const input = adminShareLinkRevokeSchema.parse(deleteRequestInput(req));

    const result = await AdminDocumentService.revokeShareLink(id);

    await recordAdminAudit({
      actorId,
      action: ADMIN_AUDIT_ACTIONS.shareLinkRevoke,
      targetType: "ShareLink",
      targetId: id,
      reason: input.reason,
      // Ids only, never the slug (made from the document title).
      metadata: { documentId: result.documentId, ownerId: result.ownerId },
    });

    return result;
  }, "Share link revoked successfully"),
};
