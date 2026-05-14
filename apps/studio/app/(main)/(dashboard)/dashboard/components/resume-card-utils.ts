import type { ResumeSyncTelemetry } from "@/features/resume/services/resume-sync";

import { ResumeListItem } from "@/features/resume/services/resume-service";

export function formatRelativeSyncTime(value: string | null): string {
  if (!value) return "none";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "unknown";

  const elapsedMs = Date.now() - date.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);

  if (elapsedMinutes < 1) return "just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);

  return `${elapsedDays}d ago`;
}

export function getSyncActivityLabel(
  sync: ResumeListItem["sync"],
  telemetry: ResumeSyncTelemetry | null,
): string {
  if (!sync.enabled) return "Local only";

  if (sync.status === "syncing") {
    return `Syncing now${telemetry?.lastAttemptAt ? ` · ${formatRelativeSyncTime(telemetry.lastAttemptAt)}` : ""}`;
  }

  if (sync.status === "conflicted") {
    return `Conflict · ${telemetry?.lastErrorAt ? formatRelativeSyncTime(telemetry.lastErrorAt) : "needs review"}`;
  }

  if (sync.status === "pending") {
    return `Pending · ${telemetry?.lastAttemptAt ? formatRelativeSyncTime(telemetry.lastAttemptAt) : "queued"}`;
  }

  if (sync.status === "synced") {
    return `Synced · ${telemetry?.lastSuccessAt ? formatRelativeSyncTime(telemetry.lastSuccessAt) : "unknown"}`;
  }

  return telemetry?.lastSuccessAt
    ? `Last success ${formatRelativeSyncTime(telemetry.lastSuccessAt)}`
    : "Ready to sync";
}

export function getSyncLabel(sync: ResumeListItem["sync"]): string {
  if (!sync.enabled) return "Local only";

  if (sync.status === "synced") return "Cloud synced";

  if (sync.status === "syncing") return "Syncing";

  if (sync.status === "conflicted") return "Sync conflict";

  return "Sync pending";
}

export function getSyncTone(sync: ResumeListItem["sync"]): string {
  if (!sync.enabled)
    return "bg-zinc-500/10 text-zinc-700 border-zinc-300 dark:text-zinc-300 dark:border-zinc-700";

  if (sync.status === "synced")
    return "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300 dark:border-emerald-700";

  if (sync.status === "syncing")
    return "bg-sky-500/10 text-sky-700 border-sky-300 dark:text-sky-300 dark:border-sky-700";

  if (sync.status === "conflicted")
    return "bg-red-500/10 text-red-700 border-red-300 dark:text-red-300 dark:border-red-700";

  return "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-700";
}
