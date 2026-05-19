"use client";

import {
  Copy,
  Cloud,
  Share2,
  Trash2,
  FileText,
  RefreshCw,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

import { Badge, Button, Menu, MenuItem, MenuSeparator } from "@veriworkly/ui";

import type { ResumeSyncTelemetry } from "@/features/resume/services/resume-sync";
import type { ResumeWorkspaceDoc } from "@/features/documents/services/resume-workspace";

import { getDocumentDefinition } from "@/features/documents/core/registry";
import { formatRelative } from "@/features/documents/services/resume-workspace";

const docIconMap = {
  RESUME: FileText,
} satisfies Record<ResumeWorkspaceDoc["type"], typeof FileText>;

export function ResumePreviewCard({
  doc,
  syncing,
  telemetry,
  onDelete,
  onShare,
  onSyncNow,
  onSyncDetails,
}: {
  doc: ResumeWorkspaceDoc;
  syncing: boolean;
  telemetry: ResumeSyncTelemetry | null;
  onDelete: (doc: ResumeWorkspaceDoc) => void;
  onShare: (id: string) => void;
  onSyncNow: (id: string) => void;
  onSyncDetails: (id: string) => void;
}) {
  return (
    <article className="group border-border bg-card hover:border-accent/40 min-w-0 overflow-visible rounded-xl border transition hover:shadow-sm">
      <div className="border-border/70 relative h-40 border-b bg-[color-mix(in_oklab,var(--background)_94%,white)]">
        <Link
          aria-label={`Open ${doc.title}`}
          className="absolute inset-0 z-10"
          href={`/editor/${doc.type.toLowerCase()}/${doc.id}`}
        />

        <ResumePreview doc={doc} />

        <div className="absolute top-2 right-2 z-20">
          <ResumeActionsMenu
            doc={doc}
            syncing={syncing}
            onShare={onShare}
            onDelete={onDelete}
            onSyncNow={onSyncNow}
            onSyncDetails={onSyncDetails}
          />
        </div>
      </div>

      <div className="min-w-0 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold">{doc.title}</h2>
            <p className="text-muted truncate text-xs">{doc.description}</p>
          </div>

          <Badge className="shrink-0 px-2 py-0.5 text-[10px]">
            {getDocumentDefinition(doc.type).label}
          </Badge>
        </div>

        <div className="text-muted mt-3 flex items-center justify-between gap-3 text-xs">
          <span className="truncate">{doc.templateName}</span>

          <span className="shrink-0" suppressHydrationWarning>
            {formatRelative(doc.updatedAt)}
          </span>
        </div>

        <dl className="text-muted mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-muted/20 min-w-0 rounded-lg px-2 py-1.5">
            <dt className="sr-only">Status</dt>
            <dd className="text-foreground truncate font-medium">{getSyncLabel(doc.sync)}</dd>
          </div>

          <div className="bg-muted/20 min-w-0 rounded-lg px-2 py-1.5">
            <dt className="sr-only">Activity</dt>
            <dd className="truncate">{getActivityLabel(doc.sync, telemetry)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

export function ResumeListRow({
  doc,
  syncing,
  telemetry,
  onDelete,
  onShare,
  onSyncNow,
  onSyncDetails,
}: {
  doc: ResumeWorkspaceDoc;
  syncing: boolean;
  telemetry: ResumeSyncTelemetry | null;
  onDelete: (doc: ResumeWorkspaceDoc) => void;
  onShare: (id: string) => void;
  onSyncNow: (id: string) => void;
  onSyncDetails: (id: string) => void;
}) {
  const Icon = docIconMap[doc.type];

  return (
    <article className="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5">
      <div className="border-border bg-background flex h-12 w-10 shrink-0 items-center justify-center rounded-lg border sm:h-14 sm:w-11">
        <Icon className="text-accent h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-sm font-bold">{doc.title}</h2>
          <Badge className="px-2 py-0.5 text-[10px]">{getDocumentDefinition(doc.type).label}</Badge>
        </div>

        <p className="text-muted mt-1 truncate text-xs">{doc.description}</p>

        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <span className="bg-muted/25 rounded-md px-2 py-1">{doc.templateName}</span>

          <span className="bg-muted/25 rounded-md px-2 py-1">{getSyncLabel(doc.sync)}</span>

          <span className="bg-muted/25 rounded-md px-2 py-1">
            {getActivityLabel(doc.sync, telemetry)}
          </span>

          <span className="text-muted px-1 py-1" suppressHydrationWarning>
            Updated {formatRelative(doc.updatedAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        <Button asChild size="sm" variant="secondary">
          <Link href={`/editor/${doc.type.toLowerCase()}/${doc.id}`}>Open</Link>
        </Button>

        <ResumeActionsMenu
          doc={doc}
          syncing={syncing}
          onShare={onShare}
          onDelete={onDelete}
          onSyncNow={onSyncNow}
          onSyncDetails={onSyncDetails}
        />
      </div>
    </article>
  );
}

function ResumePreview({ doc }: { doc: ResumeWorkspaceDoc }) {
  if (doc.previewImage) {
    return (
      <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--background)_92%,white)]">
        <Image
          src={doc.previewImage}
          alt={`${doc.templateName} preview`}
          fill
          className="object-contain p-3"
          sizes="(max-width: 768px) 100vw, 25vw"
        />
      </div>
    );
  }

  const Icon = docIconMap[doc.type];

  return (
    <div className="absolute inset-0 p-4">
      <div className="border-border bg-card h-full rounded-xl border p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-accent/10 text-accent flex h-9 w-9 items-center justify-center rounded-lg">
            <Icon className="h-5 w-5" />
          </div>

          <div className="grid flex-1 gap-2">
            <div className="bg-muted/30 h-2.5 rounded-full" />
            <div className="bg-muted/20 h-2 rounded-full" />
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          <div className="bg-muted/25 h-2 rounded-full" />
          <div className="bg-muted/25 h-2 rounded-full" />
          <div className="bg-muted/20 h-2 w-2/3 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ResumeActionsMenu({
  doc,
  syncing,
  onDelete,
  onShare,
  onSyncNow,
  onSyncDetails,
}: {
  doc: ResumeWorkspaceDoc;
  syncing: boolean;
  onDelete: (doc: ResumeWorkspaceDoc) => void;
  onShare: (id: string) => void;
  onSyncNow: (id: string) => void;
  onSyncDetails: (id: string) => void;
}) {
  return (
    <Menu
      size="sm"
      panelClassName="z-50"
      trigger={({ open, toggle, menuId }) => (
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={open ? menuId : undefined}
          aria-label={`Open actions for ${doc.title}`}
          className="border-border bg-card/90 text-foreground hover:bg-background flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm backdrop-blur"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggle();
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <MenuItem
            className="h-8 rounded-lg text-xs"
            onClick={() => {
              close();
              window.location.href = `/editor/${doc.type.toLowerCase()}/${doc.id}`;
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Open
          </MenuItem>

          <MenuItem
            className="h-8 rounded-lg text-xs"
            onClick={() => {
              close();
              onShare(doc.id);
            }}
          >
            <Share2 className="h-4 w-4" />
            Share resume
          </MenuItem>

          <MenuItem
            className="h-8 rounded-lg text-xs"
            disabled={syncing}
            onClick={() => {
              close();
              onSyncNow(doc.id);
            }}
          >
            <RefreshCw className="h-4 w-4" />
            {syncing ? "Syncing..." : "Sync now"}
          </MenuItem>

          <MenuItem
            className="h-8 rounded-lg text-xs"
            onClick={() => {
              close();
              onSyncDetails(doc.id);
            }}
          >
            <Cloud className="h-4 w-4" />
            View sync details
          </MenuItem>

          <MenuItem
            className="h-8 rounded-lg text-xs"
            onClick={() => {
              close();
              void navigator.clipboard.writeText(
                `${window.location.origin}/editor/${doc.type.toLowerCase()}/${doc.id}`,
              );
              toast.success("Resume link copied");
            }}
          >
            <Copy className="h-4 w-4" />
            Copy link
          </MenuItem>

          <MenuSeparator />

          <MenuItem
            className="text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10 h-8 rounded-lg text-xs"
            onClick={() => {
              close();
              onDelete(doc);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </MenuItem>
        </>
      )}
    </Menu>
  );
}

function getSyncLabel(sync: ResumeWorkspaceDoc["sync"]) {
  if (!sync.enabled) return "Local only";
  if (sync.status === "synced") return "Synced";
  if (sync.status === "syncing") return "Syncing";
  if (sync.status === "conflicted") return "Conflict";

  return "Pending";
}

function getActivityLabel(sync: ResumeWorkspaceDoc["sync"], telemetry: ResumeSyncTelemetry | null) {
  if (sync.lastSyncedAt) return `Last synced ${formatRelative(sync.lastSyncedAt)}`;
  if (telemetry?.lastAttemptAt) return `Last attempt ${formatRelative(telemetry.lastAttemptAt)}`;

  return sync.enabled ? "Sync ready" : "Stored locally";
}
