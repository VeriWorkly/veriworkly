import { FileText, Mail, ReceiptText, ScrollText } from "lucide-react";
import type { DocumentLibraryItem } from "@/features/documents/services/document-library";
import type { ResumeSyncTelemetry } from "@/features/resume/services/resume-sync";
import { formatRelative } from "@/features/documents/services/document-library";

export const docIconMap = {
  RESUME: FileText,
  COVER_LETTER: Mail,
  FORMAL_LETTER: ScrollText,
  INVOICE: ReceiptText,
} satisfies Record<DocumentLibraryItem["type"], typeof FileText>;

export function getSyncLabel(sync: DocumentLibraryItem["sync"]) {
  if (!sync.enabled) return "Local only";
  if (sync.status === "synced") return "Synced";
  if (sync.status === "syncing") return "Syncing";
  if (sync.status === "conflicted") return "Conflict";

  return "Pending";
}

export function getActivityLabel(
  sync: DocumentLibraryItem["sync"],
  telemetry: ResumeSyncTelemetry | null,
) {
  if (sync.lastSyncedAt) return `Last synced ${formatRelative(sync.lastSyncedAt)}`;
  if (telemetry?.lastAttemptAt) return `Last attempt ${formatRelative(telemetry.lastAttemptAt)}`;

  return sync.enabled ? "Sync ready" : "Stored locally";
}
