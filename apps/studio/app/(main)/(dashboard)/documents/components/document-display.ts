import { createElement } from "react";
import { FileText, Mail } from "lucide-react";

import type { SyncTelemetry } from "@/features/documents/services/document-sync";
import type { DocumentLibraryItem } from "@/features/documents/services/document-library";

import { formatRelative } from "@/features/documents/services/document-library";

interface LibraryDocumentIconProps {
  className?: string;
  type: DocumentLibraryItem["type"];
}

export function LibraryDocumentIcon({ className, type }: LibraryDocumentIconProps) {
  if (type === "COVER_LETTER") return createElement(Mail, { "aria-hidden": true, className });

  return createElement(FileText, { "aria-hidden": true, className });
}

/**
 * The card's backup badge. `telemetry` carries why the last attempt failed, which the sync
 * status alone cannot express: a pending document the server refused for the free-plan limit
 * is not "Pending", it is waiting on an upgrade.
 */
export function getSyncLabel(
  sync: DocumentLibraryItem["sync"],
  telemetry: SyncTelemetry | null = null,
) {
  const reason = telemetry?.lastErrorReason ?? null;

  if (!sync.enabled) return reason === "deleted-elsewhere" ? "Deleted elsewhere" : "Local only";
  if (sync.status === "synced") return "Backed up";
  if (sync.status === "syncing") return "Backing up";
  if (sync.status === "conflicted") return "Conflict";
  if (reason === "upgrade-required") return "Upgrade needed";
  if (reason === "forbidden" || reason === "rejected") return "Backup failed";

  return "Pending";
}

export function getActivityLabel(
  sync: DocumentLibraryItem["sync"],
  telemetry: SyncTelemetry | null,
) {
  if (sync.lastSyncedAt) return `Last backed up ${formatRelative(sync.lastSyncedAt)}`;
  if (telemetry?.lastAttemptAt) return `Last attempt ${formatRelative(telemetry.lastAttemptAt)}`;

  return sync.enabled ? "Backup on" : "Stored locally";
}
