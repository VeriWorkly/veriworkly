"use client";

import Link from "next/link";
import { memo } from "react";
import { CalendarClock, FileText, Palette } from "lucide-react";

import type { ResumeSyncTelemetry } from "@/features/resume/services/resume-sync";

import { Card, Badge, Button } from "@veriworkly/ui";

import { templateSummaries } from "@/config/templates";

import { ResumeListItem } from "@/features/resume/services/resume-service";

import ResumeCardMenu from "./ResumeCardMenu";
import { getSyncTone, getSyncLabel, getSyncActivityLabel } from "./resume-card-utils";

interface ResumeCardProps {
  resume: ResumeListItem;
  syncTelemetry: ResumeSyncTelemetry | null;
  syncing: boolean;
  onOpen: (id: string) => void;
  onShare: (id: string) => void;
  onSyncNow: (id: string) => void;
  onSyncDetails: (id: string) => void;
  onDelete: (id: string) => void;
}

const ResumeCard = ({
  resume,
  syncTelemetry,
  syncing,
  onOpen,
  onShare,
  onSyncNow,
  onSyncDetails,
  onDelete,
}: ResumeCardProps) => {
  const template =
    templateSummaries.find((t) => t.id === resume.templateId) ?? templateSummaries[0];

  const dateObj = new Date(resume.updatedAt);
  const isValidDate = !isNaN(dateObj.getTime());

  return (
    <div className="group relative h-full">
      <Link
        href={`/editor/${resume.id}`}
        className="focus-visible:ring-accent block h-full rounded-2xl outline-none focus-visible:ring-2 sm:rounded-3xl"
      >
        <Card className="border-border group-hover:border-accent/40 relative h-full overflow-hidden border p-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_26px_70px_-36px_rgba(30,41,59,0.45)]">
          <div
            className="absolute inset-x-0 top-0 h-28 opacity-10 transition-opacity duration-300 group-hover:opacity-20"
            style={{
              background: `linear-gradient(90deg, ${template.accentColor}55 0%, transparent 74%), linear-gradient(180deg, ${template.accentColor}40 0%, transparent 72%)`,
            }}
          />

          <div className="h-1.5 w-full" style={{ backgroundColor: template.accentColor }} />

          <div className="relative flex h-full flex-col gap-3.5 p-4 sm:gap-5 sm:p-5">
            <div className="flex items-start gap-4 pr-12 sm:pr-11">
              <div className="min-w-0 flex-1 space-y-2">
                <h3 className="text-foreground truncate text-[15px] leading-tight font-semibold sm:text-lg">
                  {resume.title}
                </h3>

                <p className="text-muted truncate text-[12px] leading-snug sm:text-sm">
                  {resume.role || "Role not set"}
                </p>
              </div>

              <Badge className={`${getSyncTone(resume.sync)} shrink-0 text-[11px] sm:text-xs`}>
                {getSyncLabel(resume.sync)}
              </Badge>
            </div>

            <div className="grid gap-1.5 rounded-2xl border border-zinc-700/10 bg-zinc-500/5 p-3 text-[11px] leading-snug sm:grid-cols-2 sm:gap-2 sm:text-xs">
              <div className="text-muted inline-flex min-w-0 items-center gap-2">
                <Palette className="h-3.5 w-3.5" />

                <span className="truncate">
                  Template: <span className="text-foreground font-medium">{template.name}</span>
                </span>
              </div>

              <div className="text-muted inline-flex min-w-0 items-center gap-2">
                <FileText className="h-3.5 w-3.5" />

                <span className="truncate">
                  Resume: <span className="text-foreground font-medium">Ready</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-border bg-background/70 text-[10px] tracking-[0.16em] uppercase">
                Activity
              </Badge>

              <p className="text-muted text-[11px] leading-snug sm:text-xs">
                {getSyncActivityLabel(resume.sync, syncTelemetry)}
              </p>
            </div>

            <p
              className="text-muted/80 mt-auto inline-flex items-center gap-2 text-[11px] sm:text-xs"
              suppressHydrationWarning
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {isValidDate
                ? dateObj.toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Updated recently"}
            </p>
          </div>
        </Card>
      </Link>

      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <ResumeCardMenu
          syncing={syncing}
          hasConflict={resume.sync.status === "conflicted"}
          resumeId={resume.id}
          resumeTitle={resume.title}
          onDelete={onDelete}
          onOpen={() => onOpen(resume.id)}
          onShare={() => onShare(resume.id)}
          onSyncNow={() => onSyncNow(resume.id)}
          onSyncDetails={() => onSyncDetails(resume.id)}
        />
      </div>

      {resume.sync.status === "conflicted" ? (
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSyncDetails(resume.id);
            }}
          >
            Resolve Conflict
          </Button>
        </div>
      ) : null}
    </div>
  );
};

const isSameTelemetry = (left: ResumeSyncTelemetry | null, right: ResumeSyncTelemetry | null) => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return left === right;
  }

  return (
    left.lastAttemptAt === right.lastAttemptAt &&
    left.lastSuccessAt === right.lastSuccessAt &&
    left.lastErrorAt === right.lastErrorAt &&
    left.lastErrorMessage === right.lastErrorMessage
  );
};

const areResumeCardPropsEqual = (previous: ResumeCardProps, next: ResumeCardProps) => {
  return (
    previous.syncing === next.syncing &&
    previous.resume === next.resume &&
    isSameTelemetry(previous.syncTelemetry, next.syncTelemetry)
  );
};

export default memo(ResumeCard, areResumeCardPropsEqual);
