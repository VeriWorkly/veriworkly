"use client";

import {
  Cloud,
  Monitor,
  History,
  CloudOff,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import type { SyncTelemetry } from "@/features/documents/services/document-sync";
import type { DocumentLibraryItem } from "@/features/documents/services/document-library";

import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { freeLimitMessage } from "@/features/documents/services/document-limit";

import { Modal, Button, cn } from "@veriworkly/ui";

interface SyncDetailsModalProps {
  document: DocumentLibraryItem;
  telemetry: SyncTelemetry | null;
  syncingDocumentIds: ReadonlySet<string>;
  onClose: () => void;
  onResolveUseLocal: (id: string) => void;
  onResolveUseCloud: (id: string) => void;
  onKeepLocalOnly: (id: string) => void;
  onSyncNow: (id: string) => void;
}

const SyncDetailsModal = ({
  document,
  telemetry,
  syncingDocumentIds,
  onClose,
  onResolveUseLocal,
  onResolveUseCloud,
  onKeepLocalOnly,
  onSyncNow,
}: SyncDetailsModalProps) => {
  const router = useRouter();
  const [confirmingKeepLocal, setConfirmingKeepLocal] = useState(false);
  // Each resolution overwrites one version with the other, so it takes a second, explicit click.
  const [confirmingResolve, setConfirmingResolve] = useState<"local" | "cloud" | null>(null);

  if (!document) return null;

  const isSyncing = syncingDocumentIds.has(document.id);
  const isConflicted = document.sync.status === "conflicted";
  const failureReason = telemetry?.lastErrorReason ?? null;
  const isPendingFailure = document.sync.enabled && document.sync.status === "pending";
  // 402: retrying succeeds only once the plan changes, so the retry is labelled as such.
  const isUpgradeRequired = isPendingFailure && failureReason === "upgrade-required";
  const isRejected =
    isPendingFailure && (failureReason === "forbidden" || failureReason === "rejected");
  const isDeletedElsewhere = !document.sync.enabled && failureReason === "deleted-elsewhere";
  const canSyncNow = !isConflicted && !isDeletedElsewhere;
  const editorHref = getDocumentEditorPath(document.type, document.id);

  // Literal class names: Tailwind only generates the classes it can read in the source.
  const statusConfig = {
    synced: {
      label: "Backed up",
      description: "A copy is saved to your account.",
      color: "text-emerald-500",
      ring: "ring-emerald-500/10",
      bg: "md:bg-emerald-500/10",
      icon: Cloud,
    },

    syncing: {
      label: "Backing up",
      description: "Transferring data to our servers...",
      color: "text-accent",
      ring: "ring-accent/10",
      bg: "md:bg-accent/10",
      icon: RefreshCw,
    },

    conflicted: {
      label: "Conflict",
      description: "Multiple versions detected.",
      color: "text-orange-500",
      ring: "ring-orange-500/10",
      bg: "md:bg-orange-500/10",
      icon: AlertTriangle,
    },

    pending: {
      label: "Pending",
      description:
        failureReason === "network"
          ? "Waiting for a network connection."
          : failureReason
            ? "The last attempt failed; it will be tried again."
            : "Waiting to back up.",
      color: "text-zinc-400",
      ring: "ring-zinc-400/10",
      bg: "md:bg-zinc-500/10",
      icon: History,
    },

    disabled: {
      label: "Local only",
      description: "Saved on this device only. Backup is off for this document.",
      color: "text-zinc-500",
      ring: "ring-zinc-500/10",
      bg: "md:bg-zinc-500/10",
      icon: CloudOff,
    },

    deletedElsewhere: {
      label: "Deleted elsewhere",
      description: "Kept on this device with your unsynced changes.",
      color: "text-orange-500",
      ring: "ring-orange-500/10",
      bg: "md:bg-orange-500/10",
      icon: CloudOff,
    },

    upgradeRequired: {
      label: "Upgrade needed",
      description: "Over the document limit.",
      color: "text-orange-500",
      ring: "ring-orange-500/10",
      bg: "md:bg-orange-500/10",
      icon: CreditCard,
    },

    rejected: {
      label: "Backup failed",
      description: "The server rejected this document.",
      color: "text-destructive",
      ring: "ring-destructive/10",
      bg: "md:bg-destructive/10",
      icon: AlertTriangle,
    },
  };

  const currentStatus = isDeletedElsewhere
    ? statusConfig.deletedElsewhere
    : !document.sync.enabled
      ? statusConfig.disabled
      : isUpgradeRequired
        ? statusConfig.upgradeRequired
        : isRejected
          ? statusConfig.rejected
          : statusConfig[document.sync.status as keyof typeof statusConfig] ||
            statusConfig.disabled;

  const StatusIcon = currentStatus.icon;

  return (
    <Modal open={true} onClose={onClose}>
      <Modal.Content className="overflow-hidden p-0">
        <div
          className={cn(
            "flex items-center justify-between border-b px-4 py-4 pt-2 md:pt-4",
            currentStatus.bg,
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg ring-2 ring-inset",
                currentStatus.ring,
              )}
            >
              <StatusIcon
                className={cn(
                  "h-4.5 w-4.5",
                  currentStatus.color,
                  currentStatus.label === "Backing up" && "animate-spin",
                )}
              />
            </div>

            <div>
              <Modal.Title className="text-sm font-bold tracking-tight">Backup status</Modal.Title>

              <div className="flex items-center">
                <p
                  className={cn(
                    "text-[10px] font-bold tracking-widest uppercase",
                    currentStatus.color,
                  )}
                >
                  {currentStatus.label}
                </p>

                <span className="bg-foreground/10 mr-0.5 ml-2 block h-1 w-1 rounded-full" />

                <span className="text-muted-foreground text-[10px] font-medium italic">
                  {currentStatus.description}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Modal.Body className="space-y-5 p-4">
          <div className="space-y-1.5">
            <p className="text-muted text-[10px] font-bold tracking-widest uppercase">Document</p>

            <div className="bg-muted/5 group hover:bg-muted/10 flex items-center justify-between rounded-xl border px-4 py-3 transition-colors">
              <span className="text-sm font-bold">{document.title}</span>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push(editorHref)}
                aria-label="Open in editor"
                title="Open in editor"
                className="h-8 w-8 rounded-full p-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card space-y-1 rounded-xl border p-3">
              <p className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-tight uppercase">
                <Cloud className="-mt-px h-3.5 w-3.5 opacity-60" /> Last backed up
              </p>

              <p className="text-xs font-bold">
                {document.sync.lastSyncedAt
                  ? new Date(document.sync.lastSyncedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Never"}
              </p>
            </div>

            <div className="bg-card space-y-1 rounded-xl border p-3">
              <p className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-tight uppercase">
                <Monitor className="-mt-px h-3.5 w-3.5 opacity-60" /> Last Attempt
              </p>

              <p className="text-xs font-bold">
                {telemetry?.lastAttemptAt
                  ? new Date(telemetry.lastAttemptAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "N/A"}
              </p>
            </div>
          </div>

          {isUpgradeRequired && (
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
              <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                Not backed up: over the document limit
              </p>

              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {freeLimitMessage(document.type)} This document stays safe on this device and is
                backed up once your plan allows it.
              </p>

              <Link
                href="/billing"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-orange-600 underline-offset-2 hover:underline dark:text-orange-400"
              >
                View plans <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {!isUpgradeRequired && telemetry?.lastErrorMessage && (
            <div className="border-destructive/20 bg-destructive/5 rounded-xl border p-3">
              <div className="mb-1 flex items-center gap-2">
                <AlertTriangle className="text-destructive h-3.5 w-3.5" />

                <p className="text-destructive text-[10px] font-black tracking-widest uppercase">
                  {isDeletedElsewhere ? "Deleted on another device" : "Backup error"}
                </p>
              </div>

              <p className="text-muted-foreground text-xs leading-relaxed font-medium">
                {telemetry.lastErrorMessage}
              </p>
            </div>
          )}

          {isConflicted && (
            <div className="animate-in fade-in slide-in-from-top-4 space-y-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 shadow-inner">
              <div className="flex items-start gap-4 text-orange-600 dark:text-orange-400">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div className="space-y-1">
                  <p className="text-sm leading-none font-bold">Conflict Detected</p>

                  <p className="text-muted-foreground text-xs leading-snug">
                    The cloud version has progressed further or diverged from your local copy.
                    Choose how to proceed.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 pt-2">
                {confirmingResolve ? (
                  <div className="space-y-3 rounded-xl border border-orange-500/20 p-3">
                    <p className="text-muted-foreground text-xs leading-snug">
                      {confirmingResolve === "local"
                        ? "This device's version replaces the cloud copy on all your devices. The changes made elsewhere are lost."
                        : "The cloud version replaces this device's copy. The changes made here that were never backed up are lost."}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isSyncing}
                        onClick={() => setConfirmingResolve(null)}
                        className="text-[10px] font-black tracking-widest uppercase"
                      >
                        Cancel
                      </Button>

                      <Button
                        size="sm"
                        loading={isSyncing}
                        onClick={() =>
                          confirmingResolve === "local"
                            ? onResolveUseLocal(document.id)
                            : onResolveUseCloud(document.id)
                        }
                        className="text-[10px] font-black tracking-widest uppercase"
                      >
                        {confirmingResolve === "local" ? "Replace Cloud Copy" : "Replace This Copy"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      size="md"
                      disabled={isSyncing}
                      onClick={() => setConfirmingResolve("local")}
                      className="h-11 justify-between bg-white px-4 text-orange-600 shadow-sm ring-1 ring-orange-500/20 hover:bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400 dark:hover:bg-orange-950/40"
                    >
                      <div className="flex items-center gap-3">
                        <Monitor className="h-4 w-4" />
                        <span className="text-xs font-bold">Keep this device&apos;s version</span>
                      </div>

                      <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                    </Button>

                    <Button
                      size="md"
                      disabled={isSyncing}
                      onClick={() => setConfirmingResolve("cloud")}
                      className="h-11 justify-between bg-white px-4 text-orange-600 shadow-sm ring-1 ring-orange-500/20 hover:bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400 dark:hover:bg-orange-950/40"
                    >
                      <div className="flex items-center gap-3">
                        <Cloud className="h-4 w-4" />
                        <span className="text-xs font-bold">Use cloud version</span>
                      </div>

                      <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                    </Button>
                  </>
                )}

                {confirmingKeepLocal ? (
                  <div className="space-y-3 rounded-xl border border-orange-500/20 p-3">
                    <p className="text-muted-foreground text-xs leading-snug">
                      This deletes the cloud copy of this document on all your devices. Your local
                      version stays on this device only and is no longer backed up.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setConfirmingKeepLocal(false)}
                        className="text-[10px] font-black tracking-widest uppercase"
                      >
                        Cancel
                      </Button>

                      <Button
                        size="sm"
                        loading={isSyncing}
                        onClick={() => onKeepLocalOnly(document.id)}
                        className="text-[10px] font-black tracking-widest uppercase"
                      >
                        Delete Cloud Copy
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-[10px] font-black tracking-widest uppercase"
                      onClick={() => {
                        router.push(editorHref);
                        onClose();
                      }}
                    >
                      Resolve in editor
                    </Button>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setConfirmingKeepLocal(true)}
                      className="text-muted-foreground hover:text-foreground text-[10px] font-black tracking-widest uppercase"
                    >
                      Keep Local, Delete Cloud
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className="bg-zinc-50/50 p-4 dark:bg-zinc-900/50">
          {!isConflicted && (
            <Button
              size="sm"
              variant="secondary"
              className="text-xs font-semibold"
              onClick={() => router.push("/settings")}
            >
              Cloud Settings
            </Button>
          )}

          {canSyncNow && (
            <Button
              size="sm"
              loading={isSyncing}
              onClick={() => onSyncNow(document.id)}
              className="font-semibold shadow-md active:scale-95"
            >
              {isRejected || isUpgradeRequired ? "Try Again" : "Back up now"}
            </Button>
          )}
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
};

export default SyncDetailsModal;
