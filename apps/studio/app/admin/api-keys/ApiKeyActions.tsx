"use client";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import { revokeAdminApiKey, updateAdminApiKey } from "@/features/admin/services/admin-actions";

interface ApiKeyActionsProps {
  id: string;
  name: string;
  isActive: boolean;
  revoked: boolean;
}

/**
 * Disable is reversible; revoke is not. The distinction matters because a compromised key must
 * never be re-enableable, while a noisy integration usually just needs pausing.
 */
const ApiKeyActions = ({ id, name, isActive, revoked }: ApiKeyActionsProps) => {
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
        onConfirm={async (reason) => {
          await revokeAdminApiKey(id, reason);
        }}
      />
    </div>
  );
};

export default ApiKeyActions;
