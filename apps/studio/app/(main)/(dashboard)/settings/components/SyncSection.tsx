"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { CloudSync, CheckCircle2, History, LucideIcon } from "lucide-react";

import { useUserStore } from "@/store/useUserStore";

import { Switch, cn } from "@veriworkly/ui";

import {
  syncAllPendingDocuments,
  getWorkspaceSyncTelemetry,
  setAllDocumentsSyncEnabled,
  captureAllDocumentSyncStates,
  restoreAllDocumentSyncStates,
  DOCUMENT_SYNC_OUTBOX_UPDATED_EVENT,
} from "@/features/documents/services/document-sync";
import {
  setAutoSyncEnabledInLocalStorage,
  loadWorkspaceSettingsFromLocalStorage,
  subscribeToWorkspaceSettings,
} from "@/features/documents/services/workspace-settings";
import { getAutoSyncControlState } from "./sync-section-state";

import { updateAutoSyncPreference } from "@/features/profile/services/update-profile";
import { pluralize } from "@/lib/pluralize";

interface TelemetryState {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
}

export default function SyncSection() {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const [loading, setLoading] = useState(false);
  // Followed, not read once: sign-in writes the account's choice only after the device's
  // documents are settled, which may be after this page opened (S-380).
  const autoSync = useSyncExternalStore(
    subscribeToWorkspaceSettings,
    () => loadWorkspaceSettingsFromLocalStorage().autoSyncEnabled,
    () => false,
  );

  const [telemetry, setTelemetry] = useState<TelemetryState>({
    lastAttemptAt: null,
    lastSuccessAt: null,
  });

  useEffect(() => {
    const update = () => {
      const data = getWorkspaceSyncTelemetry();

      setTelemetry({
        lastAttemptAt: data.lastAttemptAt,
        lastSuccessAt: data.lastSuccessAt,
      });
    };

    update();

    window.addEventListener(DOCUMENT_SYNC_OUTBOX_UPDATED_EVENT, update);

    return () => {
      window.removeEventListener(DOCUMENT_SYNC_OUTBOX_UPDATED_EVENT, update);
    };
  }, []);

  const handleToggle = async (checked: boolean) => {
    // `loading` disables the switch for the whole request: a second toggle while the first is
    // in flight would capture its half-applied states as the ones to roll back to.
    if (!isLoggedIn || loading) return;

    setLoading(true);

    try {
      await applyAutoSync(checked);
    } finally {
      setLoading(false);
    }
  };

  const applyAutoSync = async (checked: boolean) => {
    const previous = autoSync;
    // Per document, so a rollback restores each one's own choice (a document kept local
    // stays local) instead of flattening every document to the old global value.
    const previousStates = captureAllDocumentSyncStates();

    setAutoSyncEnabledInLocalStorage(checked);

    const applied = setAllDocumentsSyncEnabled(checked);

    if (!applied.ok) {
      setAutoSyncEnabledInLocalStorage(previous);
      restoreAllDocumentSyncStates(previousStates);
      toast.error("Could not update your documents: this device's storage is full.");
      return;
    }

    try {
      await updateAutoSyncPreference(checked);
    } catch (err) {
      // Roll back the optimistic update — the UI must not keep showing a state the
      // server rejected, silently disagreeing with the backend indefinitely.
      setAutoSyncEnabledInLocalStorage(previous);
      restoreAllDocumentSyncStates(previousStates);
      toast.error(
        `Could not save your sync preference: ${err instanceof Error ? err.message : "please try again."}`,
      );
      return;
    }

    if (!checked) return;

    const results = await syncAllPendingDocuments();
    const failed = results.filter((result) => !result.ok && result.reason !== "in-progress");

    if (failed.length > 0) {
      toast.error(
        `${pluralize(failed.length, "document")} could not be backed up: ${failed[0].message}`,
      );
    }
  };

  const autoSyncControl = getAutoSyncControlState({ autoSync, isLoggedIn, loading });

  return (
    <section className="space-y-6">
      <div className="border-border/60 flex items-end justify-between border-b pb-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <CloudSync className="text-accent h-5 w-5" /> Cloud & Data
          </h2>

          <p className="text-muted-foreground text-sm">{autoSyncControl.description}</p>
        </div>

        <div className="border-border/40 flex items-center gap-3 rounded-full border bg-zinc-500/5 p-2 px-4">
          <span
            id="auto-sync-label"
            className="text-muted-foreground text-xs font-bold tracking-tighter whitespace-nowrap uppercase"
          >
            Automatic backup
          </span>

          <Switch
            aria-labelledby="auto-sync-label"
            checked={autoSyncControl.checked}
            onCheckedChange={handleToggle}
            disabled={autoSyncControl.disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatsTile
          label="Backup status"
          icon={CheckCircle2}
          success={!!telemetry.lastSuccessAt}
          value={telemetry.lastSuccessAt ? "Healthy" : "Standby"}
        />

        <StatsTile
          icon={History}
          label="Last backup attempt"
          value={
            telemetry.lastAttemptAt ? (
              <>
                <span>{new Date(telemetry.lastAttemptAt).toLocaleTimeString()}</span>
                <span className="text-muted-foreground/40 ml-1 text-xs font-semibold">
                  ({new Date(telemetry.lastAttemptAt).toLocaleDateString()})
                </span>
              </>
            ) : (
              "N/A"
            )
          }
        />
      </div>
    </section>
  );
}

function StatsTile({
  label,
  value,
  icon: Icon,
  success,
}: {
  label: string;
  value: string | React.ReactNode;
  icon: LucideIcon;
  success?: boolean;
}) {
  return (
    <div className="border-border/60 space-y-3 rounded-3xl border bg-zinc-500/2 p-5">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground/70 text-xs tracking-widest uppercase">{label}</span>

        <Icon
          className={cn("h-4 w-4", success ? "text-emerald-500" : "text-muted-foreground/40")}
        />
      </div>

      <p className="text-foreground text-2xl font-bold tracking-tighter">{value}</p>
    </div>
  );
}
