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

export function getSyncLabel(sync: DocumentLibraryItem["sync"]) {
  if (!sync.enabled) return "Local only";
  if (sync.status === "synced") return "Synced";
  if (sync.status === "syncing") return "Syncing";
  if (sync.status === "conflicted") return "Conflict";

  return "Pending";
}

export function getActivityLabel(
  sync: DocumentLibraryItem["sync"],
  telemetry: SyncTelemetry | null,
) {
  if (sync.lastSyncedAt) return `Last synced ${formatRelative(sync.lastSyncedAt)}`;
  if (telemetry?.lastAttemptAt) return `Last attempt ${formatRelative(telemetry.lastAttemptAt)}`;

  return sync.enabled ? "Sync ready" : "Stored locally";
}
