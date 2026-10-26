"use client";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import {
  deleteAdminDocument,
  restoreAdminDocument,
  updateAdminDocumentVisibility,
} from "@/features/admin/services/admin-actions";

import type { DocumentType, Visibility } from "@/features/admin/types/admin-types";

interface DocumentModerationActionsProps {
  documentId: string;
  title: string;
  type: DocumentType;
  visibility: Visibility;
  deleted: boolean;
}

/**
 * Moderation is deliberately one-directional: an admin can pull a document toward private but
 * never publish someone else's private document. The API enforces this too — the visibility
 * enum it accepts stops at UNLISTED.
 *
 * "Make private" (and a portfolio takedown) is a lock, not a setting: the owner cannot make the
 * document visible, share it or publish it again until a moderator makes it unlisted
 * (`madePrivateByModerator` on the server). That is the lift, so it is offered on private rows.
 *
 * Not for a portfolio: any visibility change on one, unlisting included, also suspends its
 * publication under a moderation lock (`takeDownPortfolioPublication`), so "unlisted" would
 * keep it offline, or take a live one down, rather than let the owner publish again.
 */
const DocumentModerationActions = ({
  documentId,
  title,
  type,
  visibility,
  deleted,
}: DocumentModerationActionsProps) => {
  const isPortfolio = type === "PORTFOLIO";

  if (deleted) {
    return (
      <AdminActionDialog
        trigger="Restore"
        triggerVariant="primary"
        title="Restore this document"
        description={`"${title}" is restored on the server and its share links resolve again. A document whose content was already erased (30 days after deletion) cannot be restored.`}
        confirmLabel="Restore document"
        onConfirm={async (reason) => {
          await restoreAdminDocument(documentId, reason);
        }}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {visibility !== "PRIVATE" ? (
        <AdminActionDialog
          trigger="Make private"
          title="Force this document private"
          description={
            isPortfolio
              ? `"${title}" is made private and its publication is suspended. The owner cannot publish it again, and this console cannot lift that yet.`
              : `"${title}" is made private. Its share links stop working, since a private document is never served. The owner cannot make it visible or share it again until a moderator lifts the takedown here (Lift takedown).`
          }
          confirmLabel="Make private"
          onConfirm={async (reason) => {
            await updateAdminDocumentVisibility(documentId, "PRIVATE", reason);
          }}
        />
      ) : null}

      {visibility === "PUBLIC" ? (
        <AdminActionDialog
          trigger="Unlist"
          title="Unlist this document"
          description={
            isPortfolio
              ? `"${title}" is removed from public listings and its publication is suspended: the portfolio goes offline, and the owner cannot publish it again.`
              : `"${title}" stays reachable by direct link but is removed from public listings.`
          }
          confirmLabel="Unlist"
          onConfirm={async (reason) => {
            await updateAdminDocumentVisibility(documentId, "UNLISTED", reason);
          }}
        />
      ) : null}

      {visibility === "PRIVATE" && !isPortfolio ? (
        <AdminActionDialog
          trigger="Lift takedown"
          title="Lift the takedown (make unlisted)"
          description={`"${title}" becomes unlisted: reachable by its direct link and share links again, and the owner can change its visibility and share it. Use this only to lift a moderator takedown: on a document its owner kept private, it exposes it by link.`}
          confirmLabel="Make unlisted"
          onConfirm={async (reason) => {
            await updateAdminDocumentVisibility(documentId, "UNLISTED", reason);
          }}
        />
      ) : null}

      <AdminActionDialog
        trigger="Delete"
        triggerClassName="text-destructive"
        title="Delete this document"
        description={`"${title}" is deleted on the server: its share links stop resolving and a portfolio published from it is taken offline. A copy already in the owner's browser is not removed. It can be restored from this page until its content is erased, 30 days after deletion.`}
        confirmLabel="Delete document"
        onConfirm={async (reason) => {
          await deleteAdminDocument(documentId, reason);
        }}
      />
    </div>
  );
};

export default DocumentModerationActions;
