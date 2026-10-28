"use client";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import { revokeAdminApiKey, updateAdminApiKey } from "@/features/admin/services/admin-actions";

interface ApiKeyActionsProps {
  id: string;
  name: string;
  /** The stored prefix the list shows; retyped to revoke (V-082), never the owner-chosen name. */
  keyPrefix: string;
  isActive: boolean;
  revoked: boolean;
}

/**
 * Disable is reversible; revoke is not. The distinction matters because a compromised key must
 * never be re-enableable, while a noisy integration usually just needs pausing.
 */
const ApiKeyActions = ({ id, name, keyPrefix, isActive, revoked }: ApiKeyActionsProps) => {
  if (revoked) return <span className="text-muted text-xs">Revoked</span>;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <AdminActionDialog
        trigger={isActive ? "Disable" : "Enable"}
        title={isActive ? "Disable this API key" : "Enable this API key"}
        description={
          isActive
            ? `"${name}" stops authenticating immediately. It can be re-enabled from this page.`
            : `"${name}" starts authenticating again immediately.`
        }
        confirmLabel={isActive ? "Disable key" : "Enable key"}
        onConfirm={async (reason) => {
          await updateAdminApiKey(id, { isActive: !isActive, reason });
        }}
      />

      <AdminActionDialog
        trigger="Revoke"
        triggerClassName="text-destructive"
        title="Revoke this API key permanently"
        description={`"${name}" is revoked for good. Use this when a key has leaked — a revoked key can never be re-enabled.`}
        confirmLabel="Revoke permanently"
        confirmPhrase={keyPrefix}
        confirmPhraseLabel={`Type the key prefix, ${keyPrefix}, to confirm`}
        onConfirm={async (reason, _attemptKey, confirmation) => {
          await revokeAdminApiKey(id, reason, confirmation);
        }}
      />
    </div>
  );
};

export default ApiKeyActions;
