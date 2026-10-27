"use client";

import { useState } from "react";
import { RefreshCcw } from "lucide-react";

import { Button } from "@veriworkly/ui";

import { triggerAdminGithubSync } from "@/features/admin/services/admin-actions";
import { useGithubSyncRunning } from "@/features/admin/utils/use-github-sync";

/** Dashboard-level actions. Sign-out lives in the shell's topbar, on every admin page. */
const AdminActionButtons = () => {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  // The start request returns at once (202); the button stays busy until the sync has ended.
  const sync = useGithubSyncRunning(false);

  const handleSyncNow = async () => {
    try {
      setIsStarting(true);
      setError("");

      // The sync endpoint audits who triggered it, so it always needs a reason.
      await triggerAdminGithubSync("Manual sync from the admin dashboard");

      sync.markStarted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to sync GitHub");
    } finally {
      setIsStarting(false);
    }
  };

  const message = error || sync.pollError;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="secondary"
        className="h-8 rounded-lg"
        loading={isStarting || sync.running}
        loadingText={sync.running ? "Syncing GitHub…" : "Starting sync…"}
        onClick={() => void handleSyncNow()}
      >
        <RefreshCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Sync GitHub
      </Button>

      {sync.running ? (
        <p role="status" className="text-muted max-w-56 text-right text-xs">
          A sync is running. The dashboard refreshes when it finishes.
        </p>
      ) : null}

      {message ? (
        <p role="alert" className="text-destructive max-w-56 text-right text-xs">
          {message}
        </p>
      ) : null}
    </div>
  );
};

export default AdminActionButtons;
