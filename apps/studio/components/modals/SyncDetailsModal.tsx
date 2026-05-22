"use client";

import {
  Copy,
  Link2,
  Cloud,
  Monitor,
  History,
  CloudOff,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { ResumeSyncTelemetry } from "@/features/resume/services/resume-sync";
import type { DocumentLibraryItem } from "@/features/documents/services/document-library";

import { cn } from "@/lib/utils";

import { Modal, Button } from "@veriworkly/ui";

import { listAllShareLinks } from "@/features/documents/services/share-service";

interface SyncDetailsModalProps {
  document: DocumentLibraryItem;
  telemetry: ResumeSyncTelemetry | null;
  syncingDocumentId: string | null;
  onClose: () => void;
  onResolveUseLocal: (id: string) => void;
  onResolveUseCloud: (id: string) => void;
  onKeepLocalOnly: (id: string) => void;
  onSyncNow: (id: string) => void;
}

const SyncDetailsModal = ({
  document,
  telemetry,
  syncingDocumentId,
  onClose,
  onResolveUseLocal,
  onResolveUseCloud,
  onKeepLocalOnly,
  onSyncNow,
}: SyncDetailsModalProps) => {
  const router = useRouter();

  const isSyncing = syncingDocumentId === document.id;
  const isConflicted = document.sync.status === "conflicted";
  const editorHref = `/editor/${document.type.toLowerCase()}/${document.id}`;

  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void listAllShareLinks(document.id)
      .then((links) => {
        if (cancelled) return;
        const token = links[0]?.token;
        setShareUrl(token ? `${window.location.origin}/share/${token}` : null);
      })
      .catch(() => {
        if (!cancelled) setShareUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [document.id]);

  if (!document) return null;

  const statusConfig = {
    synced: {
      label: "Synced",
      description: "Your data is safe in the cloud.",
      color: "text-emerald-500",
      bg: "md:bg-emerald-500/10",
      icon: Cloud,
    },

    syncing: {
      label: "Syncing",
      description: "Transferring data to our servers...",
      color: "text-accent",
      bg: "md:bg-accent/10",
      icon: RefreshCw,
    },

    conflicted: {
      label: "Conflict",
      description: "Multiple versions detected.",
      color: "text-orange-500",
      bg: "md:bg-orange-500/10",
      icon: AlertTriangle,
    },

    pending: {
      label: "Pending",
      description: "Waiting for a network connection.",
      color: "text-zinc-400",
      bg: "md:bg-zinc-500/10",
      icon: History,
    },

    disabled: {
      label: "Local only",
      description: "Sync is disabled for this document.",
      color: "text-zinc-500",
      bg: "md:bg-zinc-500/10",
      icon: CloudOff,
    },
  };

  const currentStatus = !document.sync.enabled
    ? statusConfig.disabled
    : statusConfig[document.sync.status as keyof typeof statusConfig] || statusConfig.disabled;

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
                currentStatus.color.replace("text", "ring") + "/10",
              )}
            >
              <StatusIcon
                className={cn(
                  "h-4.5 w-4.5",
                  currentStatus.color,
                  currentStatus.label === "Syncing" && "animate-spin",
                )}
              />
            </div>

            <div>
              <h2 className="text-sm font-bold tracking-tight">Sync Status</h2>

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
            <label className="text-muted text-[10px] font-bold tracking-widest uppercase">
              Target Document
            </label>

            <div className="bg-muted/5 group hover:bg-muted/10 flex items-center justify-between rounded-xl border px-4 py-3 transition-colors">
              <span className="text-sm font-bold">{document.title}</span>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push(editorHref)}
                className="h-8 w-8 rounded-full p-0 opacity-0 transition-all group-hover:opacity-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-muted text-[10px] font-bold tracking-widest uppercase">
              Share Link
            </label>

            <div className="bg-muted/5 flex items-center gap-2 rounded-xl border px-3 py-2">
              <Link2 className="text-muted h-4 w-4 shrink-0" />

              <span className="text-muted min-w-0 flex-1 truncate text-xs">
                {shareUrl ?? "No active public share link"}
              </span>

              <Button
                size="sm"
                variant="secondary"
                disabled={!shareUrl}
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  if (!shareUrl) return;
                  void navigator.clipboard.writeText(shareUrl);
                  toast.success("Share link copied");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card space-y-1 rounded-xl border p-3">
              <p className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-tight uppercase">
                <Cloud className="-mt-px h-3.5 w-3.5 opacity-60" /> Last Synced
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

          {telemetry?.lastErrorMessage && (
            <div className="border-destructive/20 bg-destructive/5 rounded-xl border p-3">
              <div className="mb-1 flex items-center gap-2">
                <AlertTriangle className="text-destructive h-3.5 w-3.5" />

                <p className="text-destructive text-[10px] font-black tracking-widest uppercase">
                  Runtime Error
                </p>
              </div>

              <p className="text-muted-foreground text-xs leading-relaxed font-medium">hello</p>
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
                <Button
                  size="md"
                  onClick={() => onResolveUseLocal(document.id)}
                  className="h-11 justify-between bg-white px-4 text-orange-600 shadow-sm ring-1 ring-orange-500/20 hover:bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400 dark:hover:bg-orange-950/40"
                >
                  <div className="flex items-center gap-3">
                    <Monitor className="h-4 w-4" />
                    <span className="text-xs font-bold">Push Local to Cloud</span>
                  </div>

                  <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                </Button>

                <Button
                  size="md"
                  onClick={() => onResolveUseCloud(document.id)}
                  className="h-11 justify-between bg-white px-4 text-orange-600 shadow-sm ring-1 ring-orange-500/20 hover:bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400 dark:hover:bg-orange-950/40"
                >
                  <div className="flex items-center gap-3">
                    <Cloud className="h-4 w-4" />
                    <span className="text-xs font-bold">Pull Cloud to Local</span>
                  </div>

                  <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                </Button>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-[10px] font-black tracking-widest uppercase"
                    onClick={() => {
                      toast.info("Opening editor for manual merge...");
                      router.push(editorHref);
                      onClose();
                    }}
                  >
                    Merge Manually
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onKeepLocalOnly(document.id)}
                    className="text-muted-foreground hover:text-foreground text-[10px] font-black tracking-widest uppercase"
                  >
                    Keep Local Only
                  </Button>
                </div>
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
              onClick={() => router.push("/profile")}
            >
              Cloud Settings
            </Button>
          )}

          <Button
            size="sm"
            loading={isSyncing}
            onClick={() => onSyncNow(document.id)}
            className="font-semibold shadow-md active:scale-95"
          >
            {isConflicted ? "Retry Handshake" : "Sync Now"}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
};

export default SyncDetailsModal;
