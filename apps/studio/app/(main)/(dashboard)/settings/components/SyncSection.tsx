"use client";

import { useState, useEffect } from "react";
import { CloudSync, CheckCircle2, History, LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/useUserStore";

import { Switch } from "@veriworkly/ui";

import {
  syncAllPendingResumes,
  getWorkspaceSyncTelemetry,
  RESUME_SYNC_OUTBOX_UPDATED_EVENT,
} from "@/features/resume/services/resume-sync";
import {
  setAutoSyncEnabledInLocalStorage,
  loadWorkspaceSettingsFromLocalStorage,
} from "@/features/documents/services/workspace-settings";
import { setAllResumesSyncEnabled } from "@/features/resume/services/resume-service";
import { getAutoSyncControlState } from "./sync-section-state";

interface TelemetryState {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
}

export default function SyncSection() {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const [loading, setLoading] = useState(false);
  const [autoSync, setAutoSync] = useState(false);

  const [telemetry, setTelemetry] = useState<TelemetryState>({
    lastAttemptAt: null,
    lastSuccessAt: null,
  });

  useEffect(() => {
    const settings = loadWorkspaceSettingsFromLocalStorage();

    const timer = setTimeout(() => setAutoSync(settings.autoSyncEnabled), 0);

    const update = () => {
      const data = getWorkspaceSyncTelemetry();

      setTelemetry({
        lastAttemptAt: data.lastAttemptAt,
        lastSuccessAt: data.lastSuccessAt,
      });
    };

    update();

    window.addEventListener(RESUME_SYNC_OUTBOX_UPDATED_EVENT, update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(RESUME_SYNC_OUTBOX_UPDATED_EVENT, update);
    };
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (!isLoggedIn) return;

    setAutoSync(checked);
    setAutoSyncEnabledInLocalStorage(checked);
    setAllResumesSyncEnabled(checked);

    if (checked) {
      setLoading(true);
      await syncAllPendingResumes();
      setLoading(false);
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
          <span className="text-muted-foreground text-[10px] font-bold tracking-tighter uppercase">
            Auto-Sync
          </span>

          <Switch
            checked={autoSyncControl.checked}
            onCheckedChange={handleToggle}
            disabled={autoSyncControl.disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatsTile
          label="Sync Health"
          icon={CheckCircle2}
          success={!!telemetry.lastSuccessAt}
          value={telemetry.lastSuccessAt ? "Healthy" : "Standby"}
        />

        <StatsTile
          icon={History}
          label="Last Attempt"
          value={
            telemetry.lastAttemptAt ? (
              <>
                <span>{new Date(telemetry.lastAttemptAt).toLocaleTimeString()}</span>
                <span className="text-muted-foreground/40 ml-1 text-[10px] font-semibold">
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
        <span className="text-muted-foreground/70 text-[10px] tracking-widest uppercase">
          {label}
        </span>

        <Icon
          className={cn("h-4 w-4", success ? "text-emerald-500" : "text-muted-foreground/40")}
        />
      </div>

      <p className="text-foreground text-2xl font-bold tracking-tighter">{value}</p>
    </div>
  );
}
