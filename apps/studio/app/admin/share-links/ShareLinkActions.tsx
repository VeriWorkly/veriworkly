"use client";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import { revokeAdminShareLink } from "@/features/admin/services/admin-actions";

/**
 * Revoking deletes the link row outright, which is what makes the public URL 404 immediately.
 * The underlying document is untouched — the owner can create a new share link afterwards. The
 * admin retypes the slug, which the server checks again (V-082).
 */
const ShareLinkActions = ({ id, slug }: { id: string; slug: string }) => (
  <AdminActionDialog
    trigger="Revoke"
    triggerClassName="text-destructive"
    title="Revoke this share link"
    description={`The public URL for "${slug}" stops working immediately. The document itself is not deleted, and the owner can share it again.`}
    confirmLabel="Revoke link"
    confirmPhrase={slug}
    confirmPhraseLabel={`Type the link's slug, ${slug}, to confirm`}
    onConfirm={async (reason, _attemptKey, confirmation) => {
      await revokeAdminShareLink(id, reason, confirmation);
    }}
  />
);

export default ShareLinkActions;
